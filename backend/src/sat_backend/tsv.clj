(ns sat-backend.tsv
  (:require
    [clojure-csv.core :refer [write-csv]]
    [sat-backend.user :refer [get-email]]
    [clojure.string :as str]))

;; Note: use `:force-quote true` when calling write-csv

(defn- survey-metadata
  [{:keys [id owner created_at modified_at] :as survey}]
  [["Survey Version" "2016.1"] ;; for forwards compatibility
   ["Survey ID" (str id)]
   ["Owner Email" (get-email owner)]
   ["Created At" (str created_at)]
   ["Modified At" (str modified_at)]])

(defn- doc-metadata
  [{:strs [date state agency names affiliations] :as doc}]
  [["Date" date]
   ["State" state]
   ["Agency" agency]
   (vec (concat ["Names"] (get doc "names")))
   (vec (concat ["Affiliations"] (get doc "affiliations")))])

(defn- followup-notes
  [{:strs [sections] :as doc}]
  (let [notes (map #(get % "followupNotes") sections)]
    (map-indexed (fn [index note]
                   [(str "s" (inc index)) note])
                 notes)))

(defn- checks->strs
  [checks]
  (for [check checks]
    (if check "1" "0")))

;; This is intended to return a flat seq of pairs like:
;; [["q1"  {"radio" "2", "notes" "Notes for S2Q1"}]
;;  ["q2a" {"radio" "0", "notes" "Other notes"}]
;;  ["q2b" {"radio" "1", "notes" "More notes"}]]
(defn assign-question-numbers
  [questions]
  ;; this is mostly straightforward, except for one major wrinkle: a couple of
  ;; questions have a second layer. E.g. section 5 question 1 has parts (a),
  ;; (b), (c), and (d). So that complicates things.
  (apply concat
         (map-indexed (fn [index question]
                        (if (map? question)
                          [[(str "q" (inc index)) question]]
                          (mapv (fn [subquestion designator]
                                  [(str "q" (inc index) designator)
                                   subquestion])
                                question
                                ["a" "b" "c" "d"])))
                      questions)))

(defn assign-section-numbers
  [section-number question-pairs]
  (mapv (fn [[question-number question-map]]
          [(str "s" (inc section-number)) question-number question-map])
        question-pairs))

(defn question-type
  [question-map]
  (cond
    (contains? question-map "capacity")     :cloa
    (and (contains? question-map "radio")
         (contains? question-map "checks")) :radio-checks
    (contains? question-map "radio")        :radio
    (contains? question-map "checks")       :checks
    :else (throw (ex-info "unknown question type" question-map))))

(defmulti flatten-question question-type)
(defmethod flatten-question :cloa
  [{:strs [capacity activity notes listText]}]
  ["CLOA" (or listText "") notes capacity activity])

(defmethod flatten-question :radio-checks
  [{:strs [radio checks notes listText otherText]}]
  (apply conj
         ["selectOneThenSelectMany" (or listText "") notes (or radio "_")
          (or otherText "")]
         (checks->strs checks)))

(defmethod flatten-question :radio
  [{:strs [radio notes listText otherText]}]
  ["selectOne" (or listText "") notes (or radio "_") (or otherText "")])

(defmethod flatten-question :checks
  [{:strs [notes checks]}]
  (apply conj ["selectMany" "" notes]
         (checks->strs checks)))

(defn flatten-questions
  [questions]
  (mapv (fn [[sec-num q-num q-map]]
          (apply conj [sec-num q-num] (flatten-question q-map)))
        questions))

(defn escape-newlines
  [questions]
  {:pre [(sequential? questions)
         (every? (fn [q]
                   (or (map? q)
                       (and (vector? q)
                            (every? map? q))))
               questions)]}
  (letfn [(escape-text [text]
            (str/replace text #"\n" (str/re-quote-replacement "\\n")))
          (escape-text-at-key [map key]
            (when (contains? map key)
              (update-in map [key] escape-text)))]
    (mapv (fn [question]
            (escape-text-at-key question "listText")
            (escape-text-at-key question "notes"))
          questions)))

(defn prep-tsv
  [survey]
  (let [doc (:document survey)
        sections (->> (get doc "sections")
                      (map #(get % "questions"))
                      (map escape-newlines)
                      (map assign-question-numbers)
                      (map-indexed assign-section-numbers)
                      (map flatten-questions)
                      (apply concat))]
    (vec
      (concat
        (survey-metadata survey)
        (doc-metadata doc)
        (followup-notes doc)
        sections))))

(defn to-tsv
  [survey]
  (write-csv (prep-tsv survey) :force-quote true))


(ns sat-backend.survey
  (:refer-clojure :exclude [list update])
  (:require
    [clojure.java.io :as io]
    [clojure.java.jdbc :as jdbc]
    [reloaded.repl :refer [system]]
    [ring.util.http-response :as resp]
    [sat-backend.postgres :refer [insert! update! query]]
    [sat-backend.user :as user]
    [sat-backend.tsv :refer [to-tsv]]
    [cheshire.core :refer [generate-string parse-string parse-stream]]
    )
  (:import
    org.postgresql.util.PGobject
    java.util.Date
    java.sql.Timestamp))

(defn- try-parse-document
  [doc]
  (try
    (parse-stream (io/reader doc))
    (catch Exception e false)))

(defn- result->response
  [result]
  (let [doc (-> result :document .getValue parse-string)]
    (assoc result :document doc)))

(defn- internal-fetch
  [id]
  (first
    (query (:db system)
           [(str "SELECT *"
                 "  FROM sat.surveys"
                 "  WHERE id = ?")
            id])))

(defn create
  [owner-id document]
  {:pre [(integer? owner-id)
         (pos? owner-id)]}
  (prn 'survey/create owner-id document)
  (if-let [document (try-parse-document document)]
    (try
      (prn 'document document)
      (let [new-survey (insert!
                         (:db system)
                         "sat.surveys"
                         {:owner owner-id,
                          :document (doto (PGobject.)
                                      (.setType "jsonb")
                                      (.setValue (generate-string document)))})]
        (if new-survey
          (resp/ok (result->response (first new-survey)))
          (resp/bad-request {:message "unknown error"
                             :data new-survey})))
      (catch Exception e
        (println "Exception" e)
        (.printStackTrace e)
        (resp/internal-server-error {:message (.getMessage e)})))
    (resp/bad-request {:message "invalid survey document"})))

(defn- list-as-admin-sql
  []
  [(str "SELECT s.id, s.owner, u.email AS owner_email, "
        "       created_at, modified_at"
        "  FROM sat.surveys s"
        "  JOIN sat.users u"
        "    ON s.owner = u.id"
        "  ORDER BY modified_at DESC")])

(defn- list-as-user-sql
  [user-id]
  [(str "SELECT id, owner, created_at, modified_at"
        "  FROM sat.surveys"
        "  WHERE owner = ?"
        "  ORDER BY modified_at DESC")
   user-id])

(defn list
  [owner-id]
  {:pre [(integer? owner-id)
         (pos? owner-id)]}
  (prn 'survey/list owner-id)
  (try
    (let [sql (if (user/is-admin? owner-id)
                (list-as-admin-sql)
                (list-as-user-sql owner-id))
          surveys (query (:db system) sql)]
      (if-not surveys
        (resp/internal-server-error
          {:message "false value returned from database"})
        (resp/ok (mapv #(dissoc % :document) surveys))))
    (catch Exception e
      (println "Exception" e)
      (.printStackTrace e)
      (resp/internal-server-error {:message (.getMessage e)}))))

(defn fetch
  [owner-id id]
  {:pre [(integer? owner-id)
         (pos? owner-id)]}
  (prn 'survey/fetch {:owner-id owner-id, :survey-id id})
  (let [survey-id (try
                    (Integer/parseInt id)
                    (catch NumberFormatException e nil))]
    (if (or (nil? survey-id)
            (not (pos? survey-id)))
      (resp/bad-request {:message (str "invalid survey ID: " (pr-str id))})
      (let [survey (internal-fetch survey-id)]
        (if-not survey
          (resp/not-found
            {:message (format "survey ID %d not found" survey-id)})
          (if (and (not= owner-id (:owner survey))
                   (not (user/is-admin? owner-id)))
            (resp/forbidden {:message "survey not owned by authenticated user"})
            (resp/ok (result->response survey))))))))

(defn fetch-tsv
  [owner-id id]
  {:pre [(integer? owner-id)
         (pos? owner-id)]}
  (prn 'survey/fetch-tsv {:owner-id owner-id, :survey-id id})
  (let [survey-id (try
                    (Integer/parseInt id)
                    (catch NumberFormatException e nil))]
    (if (or (nil? survey-id)
            (not (pos? survey-id)))
      (resp/bad-request {:message (str "invalid survey ID: " (pr-str id))})
      (let [survey (internal-fetch survey-id)]
        (if-not survey
          (resp/not-found
            {:message (format "survey ID %d not found" survey-id)})
          (if (and (not= owner-id (:owner survey))
                   (not (user/is-admin? owner-id)))
            (resp/forbidden {:message "survey not owned by authenticated user"})
            (resp/content-type
              (resp/ok (-> survey result->response to-tsv))
              "text/csv")))))))

(defn update
  [owner-id id document]
  {:pre [(integer? owner-id)
         (pos? owner-id)]}
  (prn 'survey/update {:owner-id owner-id, :survey-id id})
  (let [survey-id (try
                    (Integer/parseInt id)
                    (catch NumberFormatException e nil))]
    (if (or (nil? survey-id)
            (not (pos? survey-id)))
      (resp/bad-request {:message (str "invalid survey ID: " (pr-str id))})
      (if (not= owner-id (-> survey-id internal-fetch :owner))
        (resp/forbidden {:message "survey not owned by authenticated user"})
        (if-let [document (try-parse-document document)]
          (let [[updated] (update! (:db system)
                                   "sat.surveys"
                                   {:document (doto (PGobject.)
                                                (.setType "jsonb")
                                                (.setValue
                                                  (generate-string document)))
                                    :modified_at (-> (Date.)
                                                     .getTime
                                                     Timestamp.)}
                                   ["id = ?" survey-id])]
            (if (= 1 updated)
              (resp/ok (result->response (internal-fetch survey-id)))
              (resp/bad-request {:message "document did not save"})))
          (resp/bad-request {:message "invalid survey document"}))))))


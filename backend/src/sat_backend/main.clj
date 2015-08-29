(ns sat-backend.main
  (:gen-class)
  (:require
    [reloaded.repl :refer [set-init! go]]
    [sat-backend.postgres :refer [config-good?]]
    [sat-backend.system :refer [new-system]]))

(defn -main
  [& _]
  (if-not (config-good?)
    (do
      (println "Looks like we're missing the database configuration.")
      (println "Specify it like so (except with values filled in):")
      (println "java -DDB_HOST=_ -DDB_PORT=_ -DDB_NAME=_ -DDB_USER=_ -DDB_PASS=_ -jar JAR_FILENAME")
      (println "Quitting."))
    (do
      (set-init! new-system)
      (go))))


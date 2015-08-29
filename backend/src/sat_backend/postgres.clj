(ns sat-backend.postgres
  (:require
    [com.stuartsierra.component :as component]
    [clojure.java.jdbc :as jdbc]
    [clojure.java.io :as io]
    )
  (:import
    com.jolbox.bonecp.BoneCPDataSource
    org.postgresql.util.PSQLException))

(defn- schema-installed?
  [datasource]
  (try
    (first (jdbc/query {:datasource datasource}
                       ["select count(*) from sat.users"]))
    true
    (catch PSQLException e
      (if (re-find #"^ERROR: relation \"sat.users\" does not exist"
                   (.getMessage e))
        false
        (throw e)))))

(defn- create-db
  [datasource]
  (jdbc/db-do-prepared
    {:datasource datasource}
    (-> "schema.sql" io/resource slurp)))

(defn- ensure-schema-installed
  [datasource]
  (when-not (schema-installed? datasource)
    (println "No database schema found; installing...")
    (create-db datasource)))

(defn- pooled-datasource
  [{:keys [classname subprotocol user password init-part-size max-part-size
           idle-time host port dbname partitions] :as db-spec}]
  (doto (BoneCPDataSource.)
    (.setDriverClass classname)
    (.setJdbcUrl (str "jdbc:" subprotocol "://" host ":" port "/" dbname))
    (.setUsername user)
    (.setPassword password)
    (.setMinConnectionsPerPartition init-part-size)
    (.setMaxConnectionsPerPartition max-part-size)
    (.setPartitionCount partitions)
    (.setStatisticsEnabled true)
    (.setIdleMaxAgeInMinutes (or idle-time 60))))

(defn- get-config
  [key]
  (or (System/getenv key)
      (System/getProperty key)))

(defn config-good?
  "Does it look like there's enough config to connect to the DB?"
  []
  (every? get-config ["DB_HOST" "DB_PORT" "DB_NAME" "DB_USER" "DB_PASS"]))

(defrecord PostgresDB []
  component/Lifecycle
  (start [this]
    (println ";; Starting PostgresDB component")
    (let [datasource (pooled-datasource
                       {:subprotocol "postgresql"
                        :host     (get-config "DB_HOST")
                        :port     (get-config "DB_PORT")
                        :dbname   (get-config "DB_NAME")
                        :user     (get-config "DB_USER")
                        :password (get-config "DB_PASS")
                        :classname "org.postgresql.Driver"
                        :init-part-size 1
                        :max-part-size 4
                        :partitions 2})]
      (ensure-schema-installed datasource)
      (assoc this :datasource datasource)))

  (stop [this]
    (println ";; Stopping PostgresDB component")
    (when-let [ds (:datasource this)]
      (.close ds))
    (dissoc this :datasource)))

(defn query
  [db query-with-params]
  (jdbc/query db query-with-params))

(defn insert!
  [db table data]
  (jdbc/insert! db table data))

(defn update!
  [db table set-map where-clause]
  (jdbc/update! db table set-map where-clause))

(defn exec!
  ([db query] (exec! db query nil))
  ([db query params]
   (jdbc/db-do-prepared db query params)))


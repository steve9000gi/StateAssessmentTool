(ns sat-backend.system
  (:require
    [com.stuartsierra.component :as component]
    (sat-backend
      [postgres :refer [->PostgresDB]]
      [handler :refer [new-http-server]])
    ))

(defn new-system []
  (component/system-map
    :db (->PostgresDB)
    :httpd (component/using
             (new-http-server)
             [:db])))


(ns user
  (:require
    [reloaded.repl :refer [system init start stop go reset]]
    [sat-backend.system :refer [new-system]]
    [clojure.pprint :refer [pprint]]
    [clojure.repl :refer :all]
    ))

(reloaded.repl/set-init! #'new-system)


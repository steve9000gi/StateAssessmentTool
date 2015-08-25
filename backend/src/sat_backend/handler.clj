(ns sat-backend.handler
  (:require
    [com.stuartsierra.component :as component]
    [org.httpkit.server :refer [run-server]]
    [ring.util.http-response :as resp]
    [ring.middleware.params :refer [wrap-params]]
    [ring.middleware.cookies :refer [wrap-cookies]]
    [ring.middleware.format :refer [wrap-restful-format]]
    [ring.middleware.cors :as cors]
    [compojure.core :refer [defroutes GET POST PUT]]
    [reloaded.repl :refer [system]]
    [sat-backend.user :as user]
    [sat-backend.survey :as survey]
    ))

(defrecord HTTPServer [db port ring-handler-fn]
  component/Lifecycle
  (start [this]
    (println ";; Starting HTTPServer component on port" port)
    (assoc this :server (run-server ring-handler-fn {:port port})))

  (stop [this]
    (println ";; Stopping HTTPServer component")
    (when-let [server (:server this)]
      ;; The constructor above returns a function that, when called, will stop
      ;; the server. So just call the value that we saved above.
      (server))
    (dissoc this :server)))

(defroutes routes
  (GET "/ping" [] "pong")  ;; health check
  (GET "/echo" {:as req}
    (resp/ok (assoc req :async-channel "redacted")))
  (POST "/echo" {:as req}
    (resp/ok (-> req
                 (assoc :async-channel "redacted")
                 (update-in [:body] slurp))))

  (POST "/register" [email password]
    (user/create email password))
  (GET "/testauth" {:keys [current-user-id]}
    (if current-user-id
      (resp/ok {:message "authenticated"})
      (resp/ok {:message "not authenticated"})))
  (POST "/login" [email password] (user/login email password))
  (GET "/logout" [] (user/logout))

  (POST "/survey" {:keys [current-user-id body]}
    (if current-user-id
      (survey/create current-user-id body)
      (resp/forbidden {:message "not authenticated"})))
  (GET "/surveys" {:keys [current-user-id]}
    (if current-user-id
      (survey/list current-user-id)
      (resp/forbidden {:message "not authenticated"})))
  (GET "/survey/:id" {:keys [current-user-id] {survey-id :id} :params}
    (if current-user-id
      (survey/fetch current-user-id survey-id)
      (resp/forbidden {:message "not authenticated"})))
  (PUT "/survey/:id" {:keys [current-user-id body] {survey-id :id} :params}
    (if current-user-id
      (survey/update current-user-id survey-id body)
      (resp/forbidden {:message "not authenticated"})))
  )

(defn- inspector-middleware
  [handler]
  (fn [request]
    (prn 'Request request)
    (let [response (handler request)]
      (prn 'Response response)
      response)))

(defn- wrap-session
  "Ring middleware to check the cookie of a request, and assoc the
  `:current-user-id` into the request map if the cookie checks out."
  [handler]
  (fn [request]
    (let [user-id (get-in request [:cookies "user_id" :value])
          given-token (get-in request [:cookies "auth_token" :value])]
      (if (user/valid-auth-token user-id given-token)
        (handler (assoc request :current-user-id (Integer/parseInt user-id)))
        (handler request)))))

(defn- wrap-cors
  [handler]
  (cors/wrap-cors handler
                  :access-control-allow-origin [#"http://localhost:8081"]
                  :access-control-allow-methods [:get :put :post :delete]
                  :access-control-allow-headers [:content-type :cookie]
                  :access-control-allow-credentials true))

(defn app
  []
  (-> routes
      wrap-session
      wrap-cookies
      (wrap-restful-format :formats [:json-kw])
      wrap-params
      wrap-cors
      ))

(defn new-http-server
  ([] (new-http-server nil nil))
  ([handler] (new-http-server nil handler))
  ([port handler]
   (->HTTPServer nil (or port 8081) (or handler (app)))))


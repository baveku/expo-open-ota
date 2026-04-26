package handlers

import (
	"encoding/base64"
	"encoding/json"
	"expo-open-ota/config"
	"expo-open-ota/internal/crypto"
	"net/http"

	"github.com/gorilla/mux"
)

func CreateAppHandler(w http.ResponseWriter, r *http.Request) {
	var requestBody struct {
		Id          string `json:"id"`
		Name        string `json:"name"`
		AccessToken string `json:"accessToken"`
	}
	err := json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Error decoding request body"))
		return
	}
	if requestBody.Id == "" || requestBody.AccessToken == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Missing required fields: id, accessToken"))
		return
	}

	pub, priv, err := crypto.GenerateRSAKeys()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Error generating keys"))
		return
	}

	pubB64 := base64.StdEncoding.EncodeToString([]byte(pub))
	privB64 := base64.StdEncoding.EncodeToString([]byte(priv))

	appConfig := config.AppConfig{
		Id:          requestBody.Id,
		Name:        requestBody.Name,
		AccessToken: requestBody.AccessToken,
		Keys: config.KeysConfig{
			Mode:       config.KeysModeEnvironment,
			PublicB64:  pubB64,
			PrivateB64: privB64,
		},
	}

	if err := config.SaveApp(appConfig); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Error saving app configuration: " + err.Error()))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(config.AppDescriptor{
		Id:   appConfig.Id,
		Name: appConfig.Name,
	})
}

func DeleteAppHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appId := vars["APP_ID"]
	if appId == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Missing app ID"))
		return
	}

	if err := config.DeleteApp(appId); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Error deleting app: " + err.Error()))
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

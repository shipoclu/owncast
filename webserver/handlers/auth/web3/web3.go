package web3

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	web3auth "github.com/owncast/owncast/auth/web3"
	"github.com/owncast/owncast/core/chat"
	"github.com/owncast/owncast/models"
	"github.com/owncast/owncast/persistence/userrepository"
	webutils "github.com/owncast/owncast/webserver/utils"
	log "github.com/sirupsen/logrus"
)

func VerifyWeb3Auth(u models.User, w http.ResponseWriter, r *http.Request) {
	accessToken := r.URL.Query().Get("accessToken")

	decoder := json.NewDecoder(r.Body)

	type request struct {
		DisplayName string `json:"displayName"`
		Signature   string `json:"signature"`
		Address     string `json:"address"`
		Timestamp   string `json:"timestamp"`
		Hostname    string `json:"hostname"`
		Message     string `json:"message"`
	}

	var req request
	if err := decoder.Decode(&req); err != nil {
		webutils.WriteSimpleResponse(w, false, "Could not decode request: "+err.Error())
		return
	}

	verified := web3auth.Verify(req.Signature, req.Address, req.Hostname, req.Message, req.Timestamp)

	if !verified {
		webutils.WriteSimpleResponse(w, false, "Could not verify web3 authentication request")
		return
	}

	userRepository := userrepository.Get()

	loweredAddress := strings.ToLower(req.Address)

	eu := userRepository.GetUserByAuth(loweredAddress, models.Web3)

	if eu != nil {
		log.Debug(fmt.Sprintf("Got user by auth: %s", eu.ID))

		if err := userRepository.SetUserAsAuthenticated(eu.ID); err != nil {
			log.Errorln(err)
		}

		log.Debug(fmt.Sprintf("User %s (%s) was set as authenticated", eu.DisplayName, eu.ID))

		log.Debug(fmt.Sprintf("Comparing authed name: %s with request name: %s", eu.DisplayName, req.DisplayName))

		if eu.DisplayName != req.DisplayName {
			log.Debug(fmt.Sprintf("The name has changed, updating the user from %s to %s and reassigning accesstoken", req.DisplayName, eu.DisplayName))

			loginMessage := fmt.Sprintf("**%s** is now authenticated as **%s**", req.DisplayName, eu.DisplayName)

			if err := userRepository.SetAccessTokenToOwner(accessToken, eu.ID); err != nil {
				webutils.WriteSimpleResponse(w, false, err.Error())
				return
			}

			if err := chat.SendSystemAction(loginMessage, true); err != nil {
				log.Errorln(err)
			}
		}

		webutils.WriteSimpleResponse(w, true, "")
		return
	}

	log.Debug("web3 account does not already exist, saving it as a new one for the current user")
	if err := userRepository.AddAuth(u.ID, loweredAddress, models.Web3); err != nil {
		log.Errorln(fmt.Sprintf("Failed to create user for: %s", loweredAddress))
		webutils.WriteSimpleResponse(w, false, err.Error())
		return
	}

	log.Debugln(fmt.Sprintf("Succeeded create user for: %s", loweredAddress))

	err := userRepository.SetMetadataString(u.ID, "eth_address", loweredAddress)
	if err != nil {
		log.Errorln(fmt.Sprintf("Could not set user id %s eth_address to %s with error: %s", u.ID, loweredAddress, err))
		// Keep going.
	}

	if err := userRepository.SetUserAsAuthenticated(u.ID); err != nil {
		log.Errorln(err)
		webutils.WriteSimpleResponse(w, false, err.Error())
		return
	}

	webutils.WriteSimpleResponse(w, true, "")
}

func StartAuthFlow(u models.User, w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		VerifyWeb3Auth(u, w, r)
	} else {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
}

package web3

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/owncast/owncast/auth"
	web3auth "github.com/owncast/owncast/auth/web3"
	"github.com/owncast/owncast/controllers"
	"github.com/owncast/owncast/core/chat"
	"github.com/owncast/owncast/core/user"
	log "github.com/sirupsen/logrus"
)

func handleAuthEndpointPost(u user.User, w http.ResponseWriter, r *http.Request) {
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
		controllers.WriteSimpleResponse(w, false, "Could not decode request: "+err.Error())
		return
	}

	address := strings.ToLower(req.Address)

	verified := web3auth.Verify(req.Signature, req.Address, req.Hostname, req.Message, req.Timestamp)

	if !verified {
		controllers.WriteSimpleResponse(w, false, "Could not register auth request")
		return
	}

	eu := auth.GetUserByAuth(address, auth.Web3)

	displayName := req.DisplayName

	if eu != nil {
		if displayName != req.DisplayName {
			loginMessage := fmt.Sprintf("**%s** is now authenticated as **%s**", req.DisplayName, eu.DisplayName)

			if err := user.SetAccessTokenToOwner(accessToken, eu.ID); err != nil {
				controllers.WriteSimpleResponse(w, false, err.Error())
				return
			}

			if err := chat.SendSystemAction(loginMessage, true); err != nil {
				log.Errorln(err)
			}
		}

		return
	}

	log.Debug("web3 account does not already exist, saving it as a new one for the current user")
	if err := auth.AddAuth(u.ID, address, auth.Fediverse); err != nil {
		log.Errorln(fmt.Sprintf("Failed to create user for: %s", address))
		controllers.WriteSimpleResponse(w, false, err.Error())
		return
	}

	log.Debugln(fmt.Sprintf("Succeeded create user for: %s", address))

	err := user.SetMetadataString(u.ID, "eth_address", address)
	if err != nil {
		log.Errorln(fmt.Sprintf("Could not set user id %s eth_address to %s with error: %s", u.ID, address, err))
		// Keep going.
	}

	if err := user.SetUserAsAuthenticated(u.ID); err != nil {
		log.Errorln(err)
	}

	controllers.WriteSimpleResponse(w, true, "")
}

func StartAuthFlow(u user.User, w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		handleAuthEndpointPost(u, w, r)
	} else {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
}

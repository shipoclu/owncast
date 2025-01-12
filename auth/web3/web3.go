package web3

import (
	"fmt"
	"net/url"
	"regexp"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/owncast/owncast/core/data"
	log "github.com/sirupsen/logrus"
)

const (
	registrationTimeout = time.Minute * 10
)

func isEthereumAddress(address string) bool {
	pattern := `(?i)^0x[0-9a-f]{40}$`
	match, _ := regexp.MatchString(pattern, address)
	return match
}

func Verify(signature string, address string, hostname string, message string, timestamp string) bool {
	t, err := time.Parse(time.RFC3339Nano, timestamp)

	if err != nil {
		log.Debugln("Web3 auth timestamp failed to parse.")
		return false
	}

	if time.Since(t) > registrationTimeout {
		log.Debugln("Web3 auth timestamp too far in the past.")
		return false
	}

	url_parts, err := url.Parse(data.GetServerURL())

	if url_parts.Hostname() != hostname {
		log.Debugln("Web3 auth hostname wrong.")
		return false
	}

	if !validateMessage(message, address, hostname, timestamp) {
		log.Debugln("Web3 auth message failed basic validation.")
		return false
	}

	if !isEthereumAddress(address) {
		log.Debugln("Web3 auth address failed validation.")
		return false
	}

	verified, err := verifySignature(message, signature, address)
	if err != nil {
		log.Debugln(fmt.Sprintf("Web3 auth signature verification had an error: %s", err))
		return false
	}

	if !verified {
		log.Debugln("Web3 auth signature failed verification.")
		return false
	}

	log.Debugln("Web3 auth verification succeeded.")
	return true
}

func validateMessage(message string, address string, hostname string, timestamp string) bool {
	test_message := fmt.Sprintf("%s wants to connect to: %s at: %s", address, hostname, timestamp)

	return test_message == message
}

func verifySignature(message string, signature string, address string) (bool, error) {
	// Convert address to checksum format
	addr := common.HexToAddress(address)

	// Create the message hash
	// Ethereum signed message prefix
	prefix := "\x19Ethereum Signed Message:\n"
	msglen := len(message)
	msg := fmt.Sprintf("%s%d%s", prefix, msglen, message)
	hash := crypto.Keccak256Hash([]byte(msg))

	// Decode signature
	sig := common.FromHex(signature)
	if len(sig) != 65 {
		return false, fmt.Errorf("invalid signature length")
	}

	// Fix v value for recovery
	if sig[64] != 27 && sig[64] != 28 {
		return false, fmt.Errorf("invalid recovery id")
	}
	sig[64] -= 27

	// Recover public key
	pubKey, err := crypto.SigToPub(hash.Bytes(), sig)
	if err != nil {
		return false, fmt.Errorf("error recovering public key: %v", err)
	}

	// Derive address from public key
	recoveredAddr := crypto.PubkeyToAddress(*pubKey)

	// Compare addresses
	return addr == recoveredAddr, nil
}

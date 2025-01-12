package data

import (
	"database/sql"

	log "github.com/sirupsen/logrus"
)

// Just reuses ConfigEntry since it's already defined. Use the datastore functions to decode.
type UserMetadataEntry = ConfigEntry

func createUserMetadataTable(db *sql.DB) {
	log.Traceln("Creating user_metadata table...")

	createTableSQL := `CREATE TABLE IF NOT EXISTS user_metadata (
	"user_id" TEXT NOT NULL,
	"key" TEXT NOT NULL,
    "value" BLOB NOT NULL,
    "timestamp" DATE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
	PRIMARY KEY (user_id, key)
  );`

	stmt, err := db.Prepare(createTableSQL)
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()
	_, err = stmt.Exec()
	if err != nil {
		log.Warnln(err)
	}
}

// You have to know what the types are, they aren't encoded here.
func GetAllUserMetadata(db *sql.DB, userID string) ([]UserMetadataEntry, error) {
	rows, err := db.Query("SELECT key, value FROM user_metadata WHERE user_id = ? order by key", userID)

	defer func() {
		if cerr := rows.Close(); cerr != nil {
			// Handle or log close error
			if err == nil {
				err = cerr
			}
		}
	}()

	if err != nil {
		return []UserMetadataEntry{}, err
	}

	var results []UserMetadataEntry

	for rows.Next() {
		var kv UserMetadataEntry
		err := rows.Scan(&kv.Key, &kv.Value)
		if err != nil {
			return nil, err
		}
		results = append(results, kv)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return results, nil
}

func GetUserMetadata(db *sql.DB, userID string, key string) (UserMetadataEntry, error) {
	row := db.QueryRow("SELECT value FROM user_metadata WHERE user_id = ? and key = ? LIMIT 1", userID, key)

	var resultValue []byte

	if err := row.Scan(&resultValue); err != nil {
		return UserMetadataEntry{}, err
	}

	result := UserMetadataEntry{
		Key:   key,
		Value: resultValue,
	}

	return result, nil
}

func GetUserMetadataString(db *sql.DB, userID string, key string) (string, error) {
	e, err := GetUserMetadata(db, userID, key)
	if err != nil {
		return "", err
	}

	n, err := e.getString()

	if err != nil {
		return "", err
	}

	return n, nil
}

func PutUserMetadata(db *sql.DB, userID string, e UserMetadataEntry) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	var stmt *sql.Stmt
	stmt, err = tx.Prepare("INSERT INTO user_metadata (user_id, key, value) VALUES(?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value")
	if err != nil {
		return err
	}
	_, err = stmt.Exec(userID, e.Key, e.Value)

	if err != nil {
		return err
	}
	defer stmt.Close()

	if err = tx.Commit(); err != nil {
		log.Fatalln(err)
	}

	return nil
}

func PutUserMetadataString(db *sql.DB, userID string, key string, value string) error {
	e := UserMetadataEntry{
		Key:   key,
		Value: []byte(value),
	}

	return PutUserMetadata(db, userID, e)
}

package internal

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
)

var (
	googleOAuthConfig *oauth2.Config
)

func init() {
	googleOAuthConfig = &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes: []string{
			drive.DriveReadonlyScope,
		},
		Endpoint: google.Endpoint,
	}
}

func generateRandomState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func storeOAuthState(db *sql.DB, state string) error {
	_, err := db.Exec(`
		INSERT INTO integration_tokens (provider, token_data)
		VALUES ($1, $2)
		ON CONFLICT (provider) DO UPDATE
		SET token_data = $2`,
		"google_drive_state", json.RawMessage(`"`+state+`"`))
	return err
}

func verifyOAuthState(db *sql.DB, state string) bool {
	var storedState string
	err := db.QueryRow(`
		SELECT token_data->>'0' 
		FROM integration_tokens 
		WHERE provider = $1`,
		"google_drive_state").Scan(&storedState)
	return err == nil && state == storedState
}

func InitiateGoogleDriveAuth(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		state := generateRandomState()
		if err := storeOAuthState(db, state); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store state"})
			return
		}
		url := googleOAuthConfig.AuthCodeURL(state)
		c.JSON(http.StatusOK, gin.H{"authUrl": url})
	}
}

func HandleGoogleDriveCallback(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		state := c.Query("state")
		if !verifyOAuthState(db, state) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state"})
			return
		}

		code := c.Query("code")
		token, err := googleOAuthConfig.Exchange(c, code)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to exchange code"})
			return
		}

		// Store the token in the database
		err = storeGoogleDriveToken(db, token)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store token"})
			return
		}

		// Close the popup window with success message
		c.HTML(http.StatusOK, "oauth_callback.html", gin.H{
			"success": true,
			"message": "Successfully connected to Google Drive",
		})
	}
}

func DisconnectGoogleDrive(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Remove token from database
		err := removeGoogleDriveToken(db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disconnect"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Successfully disconnected"})
	}
}

func storeGoogleDriveToken(db *sql.DB, token *oauth2.Token) error {
	tokenJSON, err := json.Marshal(token)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		INSERT INTO integration_tokens (provider, token_data)
		VALUES ($1, $2)
		ON CONFLICT (provider) DO UPDATE
		SET token_data = $2`,
		"google_drive", tokenJSON)

	return err
}

func removeGoogleDriveToken(db *sql.DB) error {
	_, err := db.Exec(`DELETE FROM integration_tokens WHERE provider = $1`, "google_drive")
	return err
}

func GetIntegrationStatus(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var exists bool
		err := db.QueryRow(`
			SELECT EXISTS(
				SELECT 1 FROM integration_tokens 
				WHERE provider = $1
			)`, "google_drive").Scan(&exists)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check status"})
			return
		}

		status := "disconnected"
		if exists {
			status = "connected"
		}

		c.JSON(http.StatusOK, gin.H{"status": status})
	}
}

package internal

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Integration struct {
	ID          string                 `json:"id"`
	Provider    string                 `json:"provider"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	Description string                 `json:"description"`
	Config      map[string]interface{} `json:"config"`
}

var AvailableIntegrations = []Integration{
	{
		Provider:    "google-drive",
		Name:        "Google Drive",
		Type:        "data-catalog",
		Description: "Connect to Google Drive to access documents, spreadsheets, and other files.",
	},
	{
		Provider:    "snowflake",
		Name:        "Snowflake",
		Type:        "data-warehouse",
		Description: "Connect to Snowflake to query your data warehouse.",
	},
	// Add more integrations here as they become available
}

func ListAvailableIntegrations(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Return the list of available integrations
		c.JSON(http.StatusOK, AvailableIntegrations)
	}
}

func ListIntegrations(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := db.Query(`
			SELECT id, name, provider, type, description, config
			FROM integrations
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch integrations"})
			return
		}
		defer rows.Close()

		var integrations []Integration
		for rows.Next() {
			var integration Integration
			var configJSON []byte
			if err := rows.Scan(&integration.ID, &integration.Name, &integration.Provider, &integration.Type,
				&integration.Description, &configJSON); err != nil {
				continue
			}
			if err := json.Unmarshal(configJSON, &integration.Config); err != nil {
				continue
			}
			integrations = append(integrations, integration)
		}

		c.JSON(http.StatusOK, integrations)
	}
}

func GetIntegration(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var integration Integration
		var configJSON []byte

		err := db.QueryRow(`
			SELECT id, name, provider, type, description, config
			FROM integrations WHERE id = $1`,
			id,
		).Scan(&integration.ID, &integration.Name, &integration.Provider, &integration.Type,
			&integration.Description, &configJSON)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Integration not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch integration"})
			return
		}

		// Parse the config based on provider type
		switch integration.Provider {
		case "snowflake":
			var snowflakeConfig SnowflakeConfig
			if err := json.Unmarshal(configJSON, &snowflakeConfig); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse config"})
				return
			}
			// Convert to map[string]interface{}
			integration.Config = map[string]interface{}{
				"account":   snowflakeConfig.Account,
				"username":  snowflakeConfig.Username,
				"password":  snowflakeConfig.Password,
				"database":  snowflakeConfig.Database,
				"schema":    snowflakeConfig.Schema,
				"warehouse": snowflakeConfig.Warehouse,
			}
		}

		c.JSON(http.StatusOK, integration)
	}
}

func UpdateIntegration(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var integration Integration
		if err := c.ShouldBindJSON(&integration); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid integration data"})
			return
		}

		// Convert config to JSON for storage
		configJSON, err := json.Marshal(integration.Config)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process configuration"})
			return
		}

		result, err := db.Exec(`
			UPDATE integrations 	
			SET name = $1, type = $2, provider = $3, description = $4, config = $5
			WHERE id = $6`,
			integration.Name, integration.Type, integration.Provider, integration.Description, configJSON, id,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update integration"})
			return
		}

		rows, err := result.RowsAffected()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get rows affected"})
			return
		}
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Integration not found"})
			return
		}

		integration.Provider = id
		c.JSON(http.StatusOK, integration)
	}
}

func CreateIntegration(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		provider := c.Param("id")
		var integration Integration
		if err := c.ShouldBindJSON(&integration); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid integration data"})
			return
		}

		// Convert config to JSON for storage
		configJSON, err := json.Marshal(integration.Config)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process configuration"})
			return
		}

		// Check if integration already exists
		var exists bool
		err = db.QueryRow(`
			SELECT EXISTS(
				SELECT 1 FROM integrations 
				WHERE provider = $1 and name = $2
			)`, provider, integration.Name).Scan(&exists)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing integration"})
			return
		}

		if exists {
			c.JSON(http.StatusConflict, gin.H{"error": "Integration already exists"})
			return
		}

		// Insert new integration
		_, err = db.Exec(`
			INSERT INTO integrations (name, provider, type, description, config)
			VALUES ($1, $2, $3, $4, $5)`,
			integration.Name, integration.Provider, integration.Type, integration.Description, configJSON,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create integration"})
			return
		}

		integration.Provider = provider
		c.JSON(http.StatusCreated, integration)
	}
}

func DeleteIntegration(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		query := `
			DELETE FROM integrations 
			WHERE id = $1
		`

		_, err := db.ExecContext(c, query, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete integration"})
			return
		}

		c.Status(http.StatusOK)
	}
}

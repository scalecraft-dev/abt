package internal

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/snowflakedb/gosnowflake"
)

type SnowflakeConfig struct {
	Account   string `json:"account"`
	Username  string `json:"username"`
	Password  string `json:"password"`
	Database  string `json:"database"`
	Schema    string `json:"schema"`
	Warehouse string `json:"warehouse"`
}

func ConnectSnowflake(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var config SnowflakeConfig
		if err := c.ShouldBindJSON(&config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid configuration"})
			return
		}

		// Test the connection
		snowflakeDB, err := connectToSnowflake(config)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to connect: %v", err)})
			return
		}
		defer snowflakeDB.Close()

		// Store the credentials
		if err := storeSnowflakeConfig(db, config); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store configuration"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Successfully connected to Snowflake"})
	}
}

func DisconnectSnowflake(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := removeSnowflakeConfig(db); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disconnect"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Successfully disconnected from Snowflake"})
	}
}

func GetSnowflakeStatus(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var exists bool
		err := db.QueryRow(`
			SELECT EXISTS(
				SELECT 1 FROM integration_tokens 
				WHERE provider = $1
			)`, "snowflake").Scan(&exists)

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

func QuerySnowflake(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var queryRequest struct {
			Query string `json:"query"`
		}
		if err := c.ShouldBindJSON(&queryRequest); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query request"})
			return
		}

		config, err := getSnowflakeConfig(db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve Snowflake configuration"})
			return
		}

		snowflakeDB, err := connectToSnowflake(config)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to Snowflake"})
			return
		}
		defer snowflakeDB.Close()

		rows, err := snowflakeDB.Query(queryRequest.Query)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Query failed: %v", err)})
			return
		}
		defer rows.Close()

		results, err := processQueryResults(rows)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process results"})
			return
		}

		c.JSON(http.StatusOK, results)
	}
}

func TestSnowflake(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var config SnowflakeConfig
		if err := c.ShouldBindJSON(&config); err != nil {
			fmt.Println("Error binding JSON:", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid configuration"})
			return
		}

		// Just test the connection without saving
		snowflakeDB, err := connectToSnowflake(config)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to connect: %v", err)})
			return
		}
		defer snowflakeDB.Close()

		c.JSON(http.StatusOK, gin.H{"message": "Connection test successful"})
	}
}

func connectToSnowflake(config SnowflakeConfig) (*sql.DB, error) {
	snowflakeConfig := gosnowflake.Config{
		Account:   parseAccountIdentifier(config.Account),
		User:      config.Username,
		Password:  config.Password,
		Database:  config.Database,
		Schema:    config.Schema,
		Warehouse: config.Warehouse,
	}
	connString, err := gosnowflake.DSN(&snowflakeConfig)
	if err != nil {
		return nil, err
	}

	db, err := sql.Open("snowflake", connString)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}

	return db, nil
}

func storeSnowflakeConfig(db *sql.DB, config SnowflakeConfig) error {
	configJSON, err := json.Marshal(config)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		INSERT INTO integrations (provider, status, config)
		VALUES ($1, $2, $3)
		ON CONFLICT (provider) 
		DO UPDATE SET 
			status = EXCLUDED.status,
			config = EXCLUDED.config
	`, "snowflake", "active", configJSON)

	return err
}

func getSnowflakeConfig(db *sql.DB) (SnowflakeConfig, error) {
	var config SnowflakeConfig
	var configJSON []byte

	err := db.QueryRow(`
		SELECT config 
		FROM integrations 
		WHERE provider = $1
	`, "snowflake").Scan(&configJSON)

	if err != nil {
		return config, err
	}

	err = json.Unmarshal(configJSON, &config)
	return config, err
}

func removeSnowflakeConfig(db *sql.DB) error {
	_, err := db.Exec(`DELETE FROM integration_tokens WHERE provider = $1`, "snowflake")
	return err
}

func processQueryResults(rows *sql.Rows) ([]map[string]interface{}, error) {
	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePointers := make([]interface{}, len(columns))
		for i := range values {
			valuePointers[i] = &values[i]
		}

		if err := rows.Scan(valuePointers...); err != nil {
			return nil, err
		}

		row := make(map[string]interface{})
		for i, column := range columns {
			row[column] = values[i]
		}
		results = append(results, row)
	}

	return results, rows.Err()
}

func parseAccountIdentifier(fullAccount string) string {
	// Remove .snowflakecomputing.com if present
	if idx := strings.Index(fullAccount, ".snowflakecomputing.com"); idx != -1 {
		return fullAccount[:idx]
	}
	return fullAccount
}

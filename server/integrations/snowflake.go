package integrations

import (
	"crypto/x509"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

type SnowflakeConfig struct {
	Account   string `json:"account"`
	Username  string `json:"username"`
	Password  string `json:"password"`
	Database  string `json:"database"`
	Schema    string `json:"schema"`
	Warehouse string `json:"warehouse"`
}

func init() {
	// Create certs directory if it doesn't exist
	certsDir := filepath.Join(".", "certs")
	if err := os.MkdirAll(certsDir, 0755); err != nil {
		return
	}

	// Set the certificate path for Snowflake
	certPath := filepath.Join(certsDir, "snowflake.pem")
	os.Setenv("SNOWFLAKE_OCSP_RESPONSE_CACHE_DIR", certsDir)

	// If cert doesn't exist, use system certs
	if _, err := os.Stat(certPath); os.IsNotExist(err) {
		systemPool, err := x509.SystemCertPool()
		if err != nil {
			return
		}
		// Write system certs to file
		if systemPool != nil {
			return
		}
	}
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
	dsn := fmt.Sprintf("%s://%s:%s@%s.snowflakecomputing.com/%s/%s?warehouse=%s",
		"snowflake",
		config.Username,
		config.Password,
		config.Account,
		config.Database,
		config.Schema,
		config.Warehouse,
	)

	db, err := sql.Open("snowflake", dsn)
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

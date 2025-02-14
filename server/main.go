package main

import (
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/scalecraft/abt/internal"
)

func main() {
	// Disable Snowflake OCSP validation
	os.Setenv("SNOWFLAKE_OCSP", "INSECURE_SKIP_VERIFY")

	// Load configuration
	config, err := internal.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Initialize database connection
	db, err := internal.NewDBConnection(config.DB)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Run migrations
	if err := internal.RunMigrations(db, "migrations"); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Initialize LLM client
	llmClient, err := internal.NewLLMClient(config.LLM)
	if err != nil {
		log.Fatal("Failed to initialize LLM client:", err)
	}

	// Create a new Gin router with default middleware
	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{"http://localhost:3000"},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{
			"Content-Type",
			"Cache-Control",
			"Pragma",
			"Expires",
		},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Setup routes with dependencies
	internal.SetupRoutes(r, db, llmClient)

	// Start the server
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

package internal

import (
	"database/sql"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine, db *sql.DB, llmClient LLMClient) {
	r.Use(AuthMiddleware())

	// API v1 group
	v1 := r.Group("/api/v1")
	{
		// Workflow routes
		workflows := v1.Group("/workflows")
		{
			workflows.GET("/", ListWorkflows(db))
			workflows.POST("/", CreateWorkflow(db))
			workflows.GET("/:id", GetWorkflow(db))
			workflows.PUT("/:id", UpdateWorkflow(db))
			workflows.DELETE("/:id", DeleteWorkflow(db))
		}

		// Agent routes
		agents := v1.Group("/agents")
		{
			agents.GET("/", ListAgents(db))
			agents.POST("/", CreateAgent(db))
			agents.GET("/:id", GetAgent(db))
			agents.PUT("/:id", UpdateAgent(db))
			agents.DELETE("/:id", DeleteAgent(db))
			agents.POST("/:id/chat", ChatWithAgent(db, llmClient))
		}

		// LLM routes
		llm := v1.Group("/llm")
		{
			llm.POST("/complete", HandleLLMComplete(llmClient))
		}

		// Execute routes
		v1.POST("/execute", ExecuteTask(db))

		// Integration routes
		integrationRoutes := v1.Group("/integrations")
		{
			integrationRoutes.GET("/", ListIntegrations(db))
			integrationRoutes.GET("/available", ListAvailableIntegrations(db))
			integrationRoutes.POST("/", CreateIntegration(db))
			integrationRoutes.PUT("/:id", UpdateIntegration(db))
			integrationRoutes.GET("/:id", GetIntegration(db))
			integrationRoutes.DELETE("/:id", DeleteIntegration(db))

			googleDrive := integrationRoutes.Group("/google-drive")
			{
				googleDrive.GET("/auth", InitiateGoogleDriveAuth(db))
				googleDrive.GET("/callback", HandleGoogleDriveCallback(db))
				googleDrive.POST("/disconnect", DisconnectGoogleDrive(db))
				googleDrive.GET("/status", GetIntegrationStatus(db))
			}

			// Add Snowflake routes
			snowflake := integrationRoutes.Group("/snowflake")
			{
				snowflake.POST("/connect", ConnectSnowflake(db))
				snowflake.POST("/disconnect", DisconnectSnowflake(db))
				snowflake.GET("/status", GetSnowflakeStatus(db))
				snowflake.POST("/query", QuerySnowflake(db))
				snowflake.POST("/test", TestSnowflake(db))
			}
		}
	}
}

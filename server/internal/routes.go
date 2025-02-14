package internal

import (
	"database/sql"

	"github.com/gin-gonic/gin"
	"github.com/scalecraft/abt/integrations"
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
			integrationRoutes.DELETE("/:id", DeleteIntegration(db))

			googleDrive := integrationRoutes.Group("/google-drive")
			{
				googleDrive.GET("/auth", integrations.InitiateGoogleDriveAuth(db))
				googleDrive.GET("/callback", integrations.HandleGoogleDriveCallback(db))
				googleDrive.POST("/disconnect", integrations.DisconnectGoogleDrive(db))
				googleDrive.GET("/status", integrations.GetIntegrationStatus(db))
			}

			// Add Snowflake routes
			snowflake := integrationRoutes.Group("/snowflake")
			{
				snowflake.POST("/connect", integrations.ConnectSnowflake(db))
				snowflake.POST("/disconnect", integrations.DisconnectSnowflake(db))
				snowflake.GET("/status", integrations.GetSnowflakeStatus(db))
				snowflake.POST("/query", integrations.QuerySnowflake(db))
				snowflake.POST("/test", integrations.TestSnowflake(db))
			}
		}
	}
}

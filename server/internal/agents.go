package internal

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

func ListAgents(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := db.Query(`
			SELECT id, name, type, description, narrative, config 
			FROM agents`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch agents"})
			return
		}
		defer rows.Close()

		var agents []Agent
		for rows.Next() {
			var a Agent
			var configJSON []byte
			err := rows.Scan(&a.ID, &a.Name, &a.Type, &a.Description, &a.Narrative, &configJSON)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan agent"})
				return
			}
			if err := json.Unmarshal(configJSON, &a.Config); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse config"})
				return
			}
			agents = append(agents, a)
		}
		c.JSON(http.StatusOK, agents)
	}
}

func CreateAgent(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("Received CreateAgent request")
		var agent Agent
		if err := c.ShouldBindJSON(&agent); err != nil {
			log.Printf("Failed to bind JSON: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		configJSON, err := json.Marshal(agent.Config)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid config format"})
			return
		}

		err = db.QueryRow(`
			INSERT INTO agents (name, type, description, narrative, config)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id`,
			agent.Name, agent.Type, agent.Description, agent.Narrative, configJSON,
		).Scan(&agent.ID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create agent"})
			return
		}
		c.JSON(http.StatusCreated, agent)
	}
}

func GetAgent(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var agent Agent
		var configJSON []byte

		err := db.QueryRow(`
			SELECT id, name, type, description, narrative, config 
			FROM agents WHERE id = $1`,
			id,
		).Scan(&agent.ID, &agent.Name, &agent.Type, &agent.Description, &agent.Narrative, &configJSON)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Agent not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch agent"})
			return
		}

		if err := json.Unmarshal(configJSON, &agent.Config); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse config"})
			return
		}
		c.JSON(http.StatusOK, agent)
	}
}

func UpdateAgent(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var agent Agent
		if err := c.ShouldBindJSON(&agent); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		configJSON, err := json.Marshal(agent.Config)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid config format"})
			return
		}

		result, err := db.Exec(`
			UPDATE agents 
			SET name = $1, type = $2, description = $3, config = $4
			WHERE id = $5`,
			agent.Name, agent.Type, agent.Description, configJSON, id,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update agent"})
			return
		}

		rows, err := result.RowsAffected()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get rows affected"})
			return
		}
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Agent not found"})
			return
		}
		agent.ID = id
		c.JSON(http.StatusOK, agent)
	}
}

func DeleteAgent(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		result, err := db.Exec(`DELETE FROM agents WHERE id = $1`, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete agent"})
			return
		}

		rows, err := result.RowsAffected()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get rows affected"})
			return
		}
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Agent not found"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Agent deleted", "id": id})
	}
}

func ChatWithAgent(db *sql.DB, llmClient LLMClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		// Get the agent first
		var agent Agent
		var configJSON []byte

		err := db.QueryRow(`
			SELECT id, name, type, description, narrative, config 
			FROM agents WHERE id = $1`,
			id,
		).Scan(&agent.ID, &agent.Name, &agent.Type, &agent.Description, &agent.Narrative, &configJSON)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Agent not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch agent"})
			return
		}

		if err := json.Unmarshal(configJSON, &agent.Config); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse agent config"})
			return
		}

		// Get the chat message from request
		var req struct {
			Message string                 `json:"message" binding:"required"`
			Inputs  map[string]interface{} `json:"inputs,omitempty"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// For LLM type agents, use the LLM client
		if agent.Type == TypeLLM {
			// Create a LangChain prompt template
			promptTemplate := fmt.Sprintf(`You are serving as an agent named %s.
				Your description is: %s
				Your narrative is: %s
				
				Respond to the following message: {input}`,
				agent.Name,
				agent.Description,
				agent.Narrative,
			)

			// Get LangChain chain
			chain, err := llmClient.GetChain(promptTemplate)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chain"})
				return
			}

			// Run the chain
			result, err := chain.Call(context.Background(), map[string]any{
				"input": req.Message,
			})
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get LLM response"})
				return
			}

			c.JSON(http.StatusOK, gin.H{"response": result["text"]})
			return
		}

		// For other agent types, return not implemented
		c.JSON(http.StatusNotImplemented, gin.H{"error": "Chat not implemented for this agent type"})
	}
}

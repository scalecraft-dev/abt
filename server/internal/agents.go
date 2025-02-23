package internal

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	TypeLLM      AgentType = "llm"
	TypeCustom   AgentType = "custom"
	TypeFunction AgentType = "function"
)

type AgentType string
type Agent struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        AgentType              `json:"type"`
	Description string                 `json:"description"`
	Narrative   string                 `json:"narrative"`
	Config      map[string]interface{} `json:"config"`
}

// Add this struct to store chat history
type ChatSession struct {
	AgentID  string    `json:"agent_id"`
	Messages []Message `json:"messages"`
}

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

		// Ensure use_rag is present in config
		if _, exists := agent.Config["use_rag"]; !exists {
			agent.Config["use_rag"] = false
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
			SET name = $1, type = $2, description = $3, narrative = $4, config = $5
			WHERE id = $6`,
			agent.Name, agent.Type, agent.Description, agent.Narrative, configJSON, id,
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

		// Get the agent
		var agent Agent
		var configJSON []byte
		err := db.QueryRow(`SELECT id, name, type, description, narrative, config FROM agents WHERE id = $1`, id).
			Scan(&agent.ID, &agent.Name, &agent.Type, &agent.Description, &agent.Narrative, &configJSON)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch agent"})
			return
		}

		// Parse config JSON
		if err := json.Unmarshal(configJSON, &agent.Config); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to parse agent config: %v", err)})
			return
		}

		// Get chat request
		var req struct {
			Message string `json:"message" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Get or initialize chat history
		var historyJSON []byte
		err = db.QueryRow(`
			SELECT messages FROM chat_history 
			WHERE agent_id = $1 AND user_id = $2
			ORDER BY created_at DESC LIMIT 1`,
			id, "current_user",
		).Scan(&historyJSON)

		var history []Message
		if err == nil {
			if err := json.Unmarshal(historyJSON, &history); err != nil {
				log.Printf("Failed to unmarshal chat history: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse chat history"})
				return
			}
		} else if err != sql.ErrNoRows {
			log.Printf("Failed to fetch chat history: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chat history"})
			return
		}

		// Add narrative and context to system message
		var contextPrompt string
		var userMessage *Message
		if useDirectQuery, ok := agent.Config["use_direct_query"].(bool); ok && useDirectQuery {
			patientInfo, err := extractPatientInfo(req.Message, llmClient)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to parse patient info: %v", err)})
				return
			}

			if patientInfo != nil {
				queryResults, err := QueryPatientData(db, *patientInfo)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to query data: %v", err)})
					return
				}
				contextPrompt = fmt.Sprintf(`Here is the patient's medical data:

%s

Based on this data, please provide a clinical summary.`, queryResults)
			} else {
				userMessage = &Message{Role: "user", Content: req.Message}
			}
		}

		systemMessage := Message{
			Role:    "system",
			Content: agent.Narrative + "\n\n" + contextPrompt,
		}

		allMessages := make([]Message, 0, len(history)+2)
		allMessages = append(allMessages, history...)
		allMessages = append(allMessages, systemMessage)

		if userMessage != nil {
			allMessages = append(allMessages, *userMessage)
		}

		// Get response using the context and history
		model := agent.Config["model"].(string)
		temperature := agent.Config["temperature"].(float64)
		maxTokens := int(agent.Config["max_tokens"].(float64))

		response, _, err := llmClient.Complete(allMessages, model, temperature, &maxTokens)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Add assistant response to history
		history = append(history, Message{Role: "assistant", Content: response})

		// Store updated chat history
		historyJSON, err = json.Marshal(history)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal chat history"})
			return
		}

		_, err = db.Exec(`
			INSERT INTO chat_history (agent_id, user_id, messages)
			VALUES ($1, $2, $3)
			ON CONFLICT (agent_id, user_id) 
			DO UPDATE SET messages = $3`,
			id, "current_user", historyJSON)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store chat history"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"response": response})
	}
}

func buildRAGPrompt(question string, docs []Document) string {
	var context string
	for _, doc := range docs {
		context += fmt.Sprintf("\nDocument: %s\n%s\n", doc.ID, doc.Content)
	}

	return fmt.Sprintf(`You are a helpful AI assistant. Use the following documents as context to answer the user's question.
If the context doesn't contain relevant information, say so.

Context:
%s

Answer the question based on the context above.`, context)
}

func extractPatientInfo(message string, llmClient LLMClient) (*PatientQuery, error) {
	maxTokens := 1024
	extractPrompt := []Message{{
		Role: "user",
		Content: `Extract patient first name, last name, and date of birth (YYYY-MM-DD) from this message.
				 You must respond with ONLY a JSON object in this exact format, with no other text:
				 {"firstName": "value", "lastName": "value", "dob": "YYYY-MM-DD"}
				 If any field cannot be found, use null for that field.
				 Message: ` + message,
	}}

	response, _, err := llmClient.Complete(extractPrompt, "anthropic.claude-3-5-sonnet-20240620-v1:0", 0.1, &maxTokens)
	if err != nil {
		return nil, err
	}

	// Trim any potential whitespace or extra characters
	response = strings.TrimSpace(response)

	var patientInfo PatientQuery
	if err := json.Unmarshal([]byte(response), &patientInfo); err != nil {
		return nil, fmt.Errorf("failed to parse LLM response as JSON: %v\nResponse was: %s", err, response)
	}

	// Only return if we have all required fields
	if patientInfo.FirstName != "" && patientInfo.LastName != "" && patientInfo.DOB != "" {
		return &patientInfo, nil
	}
	return nil, nil
}

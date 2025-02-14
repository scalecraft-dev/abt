package internal

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type ReactFlowEdge struct {
	ID           string         `json:"id"`
	Source       string         `json:"source"`
	Target       string         `json:"target"`
	Style        map[string]any `json:"style,omitempty"`
	Animated     bool           `json:"animated,omitempty"`
	Selected     bool           `json:"selected,omitempty"`
	SourceHandle *string        `json:"sourceHandle"`
	TargetHandle *string        `json:"targetHandle"`
}

type ReactFlowNode struct {
	ID            string                 `json:"id"`
	Type          string                 `json:"type"`
	AgentID       string                 `json:"agentId"`
	Position      map[string]float64     `json:"position"`
	Configuration map[string]interface{} `json:"configuration"`
	Inputs        []string               `json:"inputs"`
	Outputs       []string               `json:"outputs"`
}

type ReactFlowDAG struct {
	Nodes []ReactFlowNode `json:"nodes"`
	Edges []ReactFlowEdge `json:"edges"`
}

type ExecutionRequest struct {
	WorkflowID string       `json:"workflowId"`
	DAG        ReactFlowDAG `json:"dag"`
}

type TaskDefinition struct {
	ID         string     `json:"id"`
	WorkflowID string     `json:"workflowId"`
	Nodes      []TaskNode `json:"nodes"`
	Edges      []TaskEdge `json:"edges"`
	Status     string     `json:"status"`
	Results    []Result   `json:"results"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

type TaskNode struct {
	ID       string            `json:"id"`
	Type     string            `json:"type"` // "agent" or "human"
	Config   map[string]string `json:"config"`
	Status   string            `json:"status"`
	Response string            `json:"response,omitempty"`
}

type TaskEdge struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Data   string `json:"data,omitempty"`
}

type Result struct {
	NodeID    string    `json:"nodeId"`
	Output    string    `json:"output"`
	Timestamp time.Time `json:"timestamp"`
}

func ExecuteTask(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ExecutionRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Convert ReactFlow nodes to task nodes
		taskNodes := make([]TaskNode, len(req.DAG.Nodes))
		for i, node := range req.DAG.Nodes {
			taskNodes[i] = TaskNode{
				ID:   node.ID,
				Type: node.Type,
				Config: map[string]string{
					"agentId": node.AgentID,
				},
				Status: "pending",
			}
		}

		// Convert ReactFlow edges to task edges
		taskEdges := make([]TaskEdge, len(req.DAG.Edges))
		for i, edge := range req.DAG.Edges {
			taskEdges[i] = TaskEdge{
				Source: edge.Source,
				Target: edge.Target,
			}
		}

		task := &TaskDefinition{
			WorkflowID: req.WorkflowID,
			Nodes:      taskNodes,
			Edges:      taskEdges,
			Status:     "in_progress",
			Results:    make([]Result, 0),
		}

		// Store task in database
		taskID, err := storeTask(db, task)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store task"})
			return
		}
		task.ID = taskID

		// Start task execution asynchronously
		go executeTaskAsync(db, task)

		c.JSON(http.StatusAccepted, gin.H{
			"message": "Task started",
			"taskId":  task.ID,
		})
	}
}

func storeTask(db *sql.DB, task *TaskDefinition) (string, error) {
	nodesJSON, err := json.Marshal(task.Nodes)
	if err != nil {
		return "", err
	}

	edgesJSON, err := json.Marshal(task.Edges)
	if err != nil {
		return "", err
	}

	resultsJSON, err := json.Marshal(task.Results)
	if err != nil {
		return "", err
	}

	var taskID string
	err = db.QueryRow(`
		INSERT INTO executions (workflow_id, status, nodes, edges, results)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`,
		task.WorkflowID, task.Status, nodesJSON, edgesJSON, resultsJSON,
	).Scan(&taskID)

	return taskID, err
}

func updateTask(db *sql.DB, task *TaskDefinition) error {
	nodesJSON, err := json.Marshal(task.Nodes)
	if err != nil {
		return err
	}

	edgesJSON, err := json.Marshal(task.Edges)
	if err != nil {
		return err
	}

	resultsJSON, err := json.Marshal(task.Results)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		UPDATE executions 
		SET status = $1, nodes = $2, edges = $3, results = $4
		WHERE id = $5`,
		task.Status, nodesJSON, edgesJSON, resultsJSON, task.ID,
	)

	return err
}

func executeTaskAsync(db *sql.DB, task *TaskDefinition) {
	// Process nodes in topological order
	for _, node := range task.Nodes {
		// Execute node based on type
		switch node.Type {
		case "agent":
			response, err := executeAgentNode(node)
			if err != nil {
				node.Status = "failed"
				continue
			}
			node.Response = response
			node.Status = "completed"

		case "human":
			node.Status = "pending"
		}

		// Store result
		result := Result{
			NodeID:    node.ID,
			Output:    node.Response,
			Timestamp: time.Now(),
		}
		task.Results = append(task.Results, result)

		// Update task in database
		if err := updateTask(db, task); err != nil {
			// Log error but continue execution
			// TODO: Add proper error handling/retry logic
			continue
		}
	}

	task.Status = "completed"
	updateTask(db, task)
}

func executeAgentNode(node TaskNode) (string, error) {
	// TODO: Implement actual agent execution logic
	// This would make API calls to the agent service
	return "Sample response", nil
}

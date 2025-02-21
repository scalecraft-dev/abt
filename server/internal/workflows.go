package internal

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	StatusInactive WorkflowStatus = "inactive"
	StatusActive   WorkflowStatus = "active"
)

type WorkflowStatus string

type Workflow struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Status      WorkflowStatus `json:"status"`
	Dag         Dag            `json:"dag"`
	Schedule    string         `json:"schedule"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type Dag struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

type Node interface{}

type Edge interface{}

func ListWorkflows(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		query := `
			SELECT id, name, description, status, dag, schedule, created_at, updated_at 
			FROM workflows`

		rows, err := db.Query(query)
		if err != nil {
			c.JSON(http.StatusOK, []Workflow{})
			return
		}
		defer rows.Close()

		var workflows []Workflow
		for rows.Next() {
			var w Workflow
			var dagBytes []byte
			err := rows.Scan(
				&w.ID,
				&w.Name,
				&w.Description,
				&w.Status,
				&dagBytes,
				&w.Schedule,
				&w.CreatedAt,
				&w.UpdatedAt,
			)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan workflow"})
				return
			}
			if err := json.Unmarshal(dagBytes, &w.Dag); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse DAG"})
				return
			}
			workflows = append(workflows, w)
		}
		c.JSON(http.StatusOK, workflows)
	}
}

func CreateWorkflow(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var workflow Workflow
		if err := c.ShouldBindJSON(&workflow); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Convert DAG to JSON
		dagJSON, err := json.Marshal(workflow.Dag)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encode DAG"})
			return
		}

		tx, err := db.Begin()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
			return
		}
		defer tx.Rollback()

		err = tx.QueryRow(`
			INSERT INTO workflows (name, description, status, dag, schedule)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, created_at, updated_at`,
			workflow.Name, workflow.Description, workflow.Status, dagJSON, workflow.Schedule,
		).Scan(&workflow.ID, &workflow.CreatedAt, &workflow.UpdatedAt)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workflow"})
			return
		}

		tx.Commit()

		c.JSON(http.StatusCreated, workflow)
	}
}

func GetWorkflow(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		workflow := &Workflow{}
		var dagBytes []byte

		err := db.QueryRow(`
			SELECT id, name, description, status, dag, schedule, created_at, updated_at 
			FROM workflows WHERE id = $1`,
			id,
		).Scan(
			&workflow.ID,
			&workflow.Name,
			&workflow.Description,
			&workflow.Status,
			&dagBytes,
			&workflow.Schedule,
			&workflow.CreatedAt,
			&workflow.UpdatedAt,
		)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workflow not found"})
			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch workflow"})
			return
		}

		if err := json.Unmarshal(dagBytes, &workflow.Dag); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse DAG"})
			return
		}

		c.JSON(http.StatusOK, workflow)
	}
}

func UpdateWorkflow(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var workflow Workflow
		if err := c.ShouldBindJSON(&workflow); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Convert DAG to JSON
		dagJSON, err := json.Marshal(workflow.Dag)
		fmt.Println(string(dagJSON))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encode DAG"})
			return
		}

		tx, err := db.Begin()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
			return
		}
		defer tx.Rollback()

		result, err := tx.Exec(`
			UPDATE workflows 
			SET name = $1, description = $2, status = $3, dag = $4, schedule = $5	
			WHERE id = $6`,
			workflow.Name, workflow.Description, workflow.Status, dagJSON, workflow.Schedule, id,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update workflow"})
			return
		}

		rows, err := result.RowsAffected()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get rows affected"})
			return
		}
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workflow not found"})
			return
		}

		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
			return
		}

		workflow.ID = id
		c.JSON(http.StatusOK, workflow)
	}
}

func DeleteWorkflow(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		result, err := db.Exec(`DELETE FROM workflows WHERE id = $1`, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete workflow"})
			return
		}

		rows, err := result.RowsAffected()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get rows affected"})
			return
		}
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workflow not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Workflow deleted", "id": id})
	}
}

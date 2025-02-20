package internal

import (
	"time"
)

type WorkflowStatus string
type AgentType string

const (
	StatusInactive WorkflowStatus = "inactive"
	StatusActive   WorkflowStatus = "active"

	TypeLLM      AgentType = "llm"
	TypeCustom   AgentType = "custom"
	TypeFunction AgentType = "function"
)

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

type Agent struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        AgentType              `json:"type"`
	Description string                 `json:"description"`
	Narrative   string                 `json:"narrative"`
	Config      map[string]interface{} `json:"config"`
}

type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Dag struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

type Node interface{}

type Edge interface{}

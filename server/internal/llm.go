package internal

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tmc/langchaingo/chains"
	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/anthropic"
	"github.com/tmc/langchaingo/prompts"
)

type LLMClient interface {
	Complete(messages []Message, model string, temperature float64, maxTokens *int) (string, Usage, error)
	GetChain(prompt string) (chains.Chain, error)
	CreateEmbeddings(ctx context.Context, texts []string) ([][]float32, error)
}

type AnthropicClient struct {
	config   LLMConfig
	llm      *anthropic.LLM
	embedder *LocalEmbedder
}

func NewLLMClient(config LLMConfig) (LLMClient, error) {
	switch config.Provider {
	case Anthropic:
		llm, err := anthropic.New(
			anthropic.WithToken(config.APIKey),
			anthropic.WithModel("claude-3-opus-20240229"),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create LLM client: %v", err)
		}

		embedder, err := NewLocalEmbedder()
		if err != nil {
			return nil, err
		}

		return &AnthropicClient{
			config:   config,
			llm:      llm,
			embedder: embedder,
		}, nil
	default:
		return nil, fmt.Errorf("unsupported LLM provider: %s", config.Provider)
	}
}

func (c *AnthropicClient) Complete(messages []Message, model string, temperature float64, maxTokens *int) (string, Usage, error) {
	ctx := context.Background()

	// Convert our Message type to LangChain messages
	lcMessages := make([]llms.MessageContent, len(messages))
	for i, msg := range messages {
		lcMessages[i] = llms.MessageContent{
			Role:  llms.ChatMessageTypeAI,
			Parts: []llms.ContentPart{llms.TextContent{Text: msg.Content}},
		}
	}

	// Call LangChain
	response, err := c.llm.GenerateContent(ctx, lcMessages,
		llms.WithTemperature(temperature),
		llms.WithMaxTokens(*maxTokens),
	)

	if err != nil {
		return "", Usage{}, fmt.Errorf("LLM call failed: %v", err)
	}

	return response.Choices[0].Content, Usage{}, nil
}

func (c *AnthropicClient) GetChain(prompt string) (chains.Chain, error) {
	// Create a LangChain prompt template
	promptTemplate := prompts.NewPromptTemplate(
		prompt,
		[]string{"input"},
	)

	// Create an LLMChain
	chain := chains.NewLLMChain(c.llm, promptTemplate)

	return chain, nil
}

func (c *AnthropicClient) CreateEmbeddings(ctx context.Context, texts []string) ([][]float32, error) {
	return c.embedder.CreateEmbeddings(ctx, texts)
}

func HandleLLMComplete(llm LLMClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Prompt string `json:"prompt" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		messages := []Message{{Role: "user", Content: req.Prompt}}
		maxTokens := 1024
		response, _, err := llm.Complete(messages, "claude-3-opus-20240229", 0.7, &maxTokens)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"response": response})
	}
}

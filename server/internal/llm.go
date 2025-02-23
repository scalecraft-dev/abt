package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/bedrock"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
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

type LLMProvider string
type LLMConfig struct {
	Provider    LLMProvider `json:"provider"`
	APIKey      string      `json:"api_key"`
	BaseURL     string      `json:"base_url"`
	Model       string      `json:"model"`
	MaxTokens   int         `json:"max_tokens"`
	Temperature float64     `json:"temperature"`
	AWSRegion   string      `json:"aws_region"`
}

const (
	Anthropic LLMProvider = "anthropic"
	Bedrock   LLMProvider = "bedrock"
)

type AnthropicClient struct {
	config   LLMConfig
	llm      *anthropic.LLM
	embedder *LocalEmbedder
}

type BedrockClient struct {
	config   LLMConfig
	client   *bedrockruntime.Client
	embedder *LocalEmbedder
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

func NewLLMClient(config LLMConfig) (LLMClient, error) {
	switch config.Provider {
	case Anthropic:
		llm, err := anthropic.New(
			anthropic.WithToken(config.APIKey),
			anthropic.WithModel(config.Model),
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
	case Bedrock:
		cfg, err := awsconfig.LoadDefaultConfig(
			context.Background(),
			awsconfig.WithRegion(config.AWSRegion),
			// awsconfig.WithSharedConfigProfile("data-uat"),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to load AWS config: %v", err)
		}

		client := bedrockruntime.NewFromConfig(cfg)
		bedrockClient := bedrock.NewFromConfig(cfg)

		models, err := bedrockClient.ListFoundationModels(context.Background(), &bedrock.ListFoundationModelsInput{})

		if err != nil {
			return nil, fmt.Errorf("failed to list foundation models: %v", err)
		}

		for _, modelSummary := range models.ModelSummaries {
			fmt.Println(*modelSummary.ModelId)
		}

		embedder, err := NewLocalEmbedder()
		if err != nil {
			return nil, err
		}

		return &BedrockClient{
			config:   config,
			client:   client,
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

func (c *BedrockClient) Complete(messages []Message, model string, temperature float64, maxTokens *int) (string, Usage, error) {
	// Convert system message to user message
	var formattedMessages []map[string]interface{}
	for _, msg := range messages {
		role := msg.Role
		if role == "system" {
			role = "user"
		}
		formattedMessages = append(formattedMessages, map[string]interface{}{
			"role": role,
			"content": []map[string]string{{
				"type": "text",
				"text": msg.Content,
			}},
		})
	}

	requestBody := map[string]interface{}{
		"anthropic_version": "bedrock-2023-05-31",
		"messages":          formattedMessages,
		"max_tokens":        maxTokens,
		"temperature":       temperature,
	}

	jsonBytes, err := json.Marshal(requestBody)
	if err != nil {
		return "", Usage{}, fmt.Errorf("failed to marshal request: %v", err)
	}

	input := &bedrockruntime.InvokeModelInput{
		ModelId: aws.String(model),
		Body:    jsonBytes,
	}

	output, err := c.client.InvokeModel(context.Background(), input)
	if err != nil {
		return "", Usage{}, fmt.Errorf("Bedrock call failed: %v", err)
	}

	var response struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(output.Body, &response); err != nil {
		return "", Usage{}, fmt.Errorf("failed to parse Bedrock response: %v", err)
	}

	if len(response.Content) == 0 {
		return "", Usage{}, fmt.Errorf("empty response from Bedrock")
	}

	return response.Content[0].Text, Usage{}, nil
}

func (c *BedrockClient) GetChain(prompt string) (chains.Chain, error) {
	return nil, fmt.Errorf("chain functionality not implemented for Bedrock")
}

func (c *BedrockClient) CreateEmbeddings(ctx context.Context, texts []string) ([][]float32, error) {
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

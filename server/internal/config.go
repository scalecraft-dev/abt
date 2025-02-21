package internal

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DB  DBConfig
	LLM LLMConfig
}

func LoadConfig() (*Config, error) {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		// It's okay if .env doesn't exist, we'll just use environment variables
		if !os.IsNotExist(err) {
			return nil, fmt.Errorf("error loading .env file: %w", err)
		}
	}

	llmConfig := LLMConfig{
		Provider:    LLMProvider(getEnv("LLM_PROVIDER", string(Anthropic))),
		APIKey:      getEnv("LLM_API_KEY", ""),
		BaseURL:     getEnv("LLM_BASE_URL", "https://api.anthropic.com"),
		Model:       getEnv("LLM_MODEL", "claude-3-sonnet-20240229"),
		AWSRegion:   getEnv("AWS_REGION", "us-east-1"),
		MaxTokens:   4096, // Default max tokens
		Temperature: 0.7,  // Default temperature
	}

	if llmConfig.APIKey == "" && llmConfig.Provider == Anthropic {
		return nil, fmt.Errorf("LLM_API_KEY environment variable is required")
	}

	dbConfig := DBConfig{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     5432,
		User:     getEnv("DB_USER", "postgres"),
		Password: getEnv("DB_PASSWORD", "postgres"),
		DBName:   getEnv("DB_NAME", "workflow_db"),
		SSLMode:  getEnv("DB_SSLMODE", "disable"),
	}

	return &Config{
		DB:  dbConfig,
		LLM: llmConfig,
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

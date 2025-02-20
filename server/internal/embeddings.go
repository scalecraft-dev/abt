package internal

import (
	"context"
	"math"
	"strings"
)

type LocalEmbedder struct{}

func NewLocalEmbedder() (*LocalEmbedder, error) {
	return &LocalEmbedder{}, nil
}

// Simple term frequency based embeddings
func (e *LocalEmbedder) CreateEmbeddings(ctx context.Context, texts []string) ([][]float32, error) {
	embeddings := make([][]float32, len(texts))
	vocab := make(map[string]int)

	// Build vocabulary
	for _, text := range texts {
		words := strings.Fields(strings.ToLower(text))
		for _, word := range words {
			vocab[word] = len(vocab)
		}
	}

	// Create term frequency vectors
	for i, text := range texts {
		vector := make([]float32, len(vocab))
		words := strings.Fields(strings.ToLower(text))
		for _, word := range words {
			if idx, ok := vocab[word]; ok {
				vector[idx]++
			}
		}
		// Normalize vector
		magnitude := float32(math.Sqrt(float64(dot(vector, vector))))
		if magnitude > 0 {
			for j := range vector {
				vector[j] /= magnitude
			}
		}
		embeddings[i] = vector
	}

	return embeddings, nil
}

func dot(a, b []float32) float32 {
	var sum float32
	for i := range a {
		sum += a[i] * b[i]
	}
	return sum
}

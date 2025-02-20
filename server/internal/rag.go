package internal

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

type SnowflakeRetriever struct {
	db             *sql.DB
	tableName      string
	provider       string
	embeddingModel string
	llmClient      LLMClient
	embeddingDim   int
}

type Document struct {
	ID        string
	Content   string
	Metadata  map[string]interface{}
	Embedding []float32
}

type IngestOptions struct {
	ChunkSize    int
	ChunkOverlap int
}

func NewSnowflakeRetriever(db *sql.DB, tableName string, provider string, llmClient LLMClient, embeddingDim int) *SnowflakeRetriever {
	return &SnowflakeRetriever{
		db:           db,
		tableName:    tableName,
		provider:     provider,
		llmClient:    llmClient,
		embeddingDim: embeddingDim,
	}
}

func (r *SnowflakeRetriever) FindSimilar(ctx context.Context, query string, k int) ([]Document, error) {
	queryEmbeddings, err := r.llmClient.CreateEmbeddings(ctx, []string{query})
	if err != nil {
		return nil, fmt.Errorf("failed to generate query embedding: %w", err)
	}
	queryEmbedding := queryEmbeddings[0]

	// Convert []float32 to []float64 for database compatibility
	queryEmbedding64 := make([]float64, len(queryEmbedding))
	for i, v := range queryEmbedding {
		queryEmbedding64[i] = float64(v)
	}

	// Convert embedding to string format: [1.0, 2.0, 3.0, ...]
	embStr := "["
	for i, v := range queryEmbedding64 {
		if i > 0 {
			embStr += ","
		}
		embStr += fmt.Sprintf("%f", v)
	}
	embStr += "]"

	sqlQuery := fmt.Sprintf(`
		WITH similarity_scores AS (
			SELECT 
				id,
				content,
				metadata,
				embedding,
				vector_cosine_similarity(embedding, parse_json('%s')::vector(float, %d)) as score
			FROM %s
			ORDER BY score DESC
			LIMIT %d
		)
		SELECT id, content, metadata, embedding, score
		FROM similarity_scores
		WHERE score > 0.7  -- Minimum similarity threshold
	`, embStr, len(queryEmbedding), r.tableName, k)

	rows, err := r.db.QueryContext(ctx, sqlQuery, k)
	if err != nil {
		fmt.Println("Error querying similar documents:", err)
		return nil, fmt.Errorf("failed to query similar documents: %w", err)
	}
	defer rows.Close()

	var docs []Document
	for rows.Next() {
		var doc Document
		var metadataJSON string
		var score float64

		if err := rows.Scan(&doc.ID, &doc.Content, &metadataJSON, &doc.Embedding, &score); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		if err := json.Unmarshal([]byte(metadataJSON), &doc.Metadata); err != nil {
			return nil, fmt.Errorf("failed to parse metadata: %w", err)
		}

		docs = append(docs, doc)
	}

	return docs, rows.Err()
}

// Prepare Snowflake table for documents
func (r *SnowflakeRetriever) InitializeStore(ctx context.Context) error {
	query := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s (
			id VARCHAR NOT NULL,
			content TEXT,
			metadata VARIANT,
			embedding ARRAY,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
			PRIMARY KEY (id)
		)
	`, r.tableName)

	_, err := r.db.ExecContext(ctx, query)
	return err
}

// Ingest documents into the store
func (r *SnowflakeRetriever) IngestDocuments(ctx context.Context, docs []Document, opts IngestOptions) error {
	// Split documents into chunks if needed
	chunks := splitDocuments(docs, opts)

	// Generate embeddings for chunks
	embeddings, err := r.generateEmbeddings(ctx, chunks)
	if err != nil {
		return fmt.Errorf("failed to generate embeddings: %w", err)
	}

	// Insert into Snowflake
	query := fmt.Sprintf(`
		INSERT INTO %s (id, content, metadata, embedding)
		VALUES (?, ?, PARSE_JSON(?), ?)
	`, r.tableName)

	for i, doc := range chunks {
		metadata, err := json.Marshal(doc.Metadata)
		if err != nil {
			return fmt.Errorf("failed to marshal metadata: %w", err)
		}

		_, err = r.db.ExecContext(ctx, query,
			doc.ID,
			doc.Content,
			string(metadata),
			embeddings[i],
		)
		if err != nil {
			return fmt.Errorf("failed to insert document: %w", err)
		}
	}

	return nil
}

func splitDocuments(docs []Document, opts IngestOptions) []Document {
	var chunks []Document
	for _, doc := range docs {
		// For now, just return the documents as-is
		// TODO: Implement actual text chunking
		chunks = append(chunks, doc)
	}
	return chunks
}

// Add to SnowflakeRetriever struct
func (r *SnowflakeRetriever) generateEmbeddings(ctx context.Context, docs []Document) ([][]float32, error) {
	var contents []string
	for _, doc := range docs {
		contents = append(contents, doc.Content)
	}

	embeddings, err := r.llmClient.CreateEmbeddings(ctx, contents)
	if err != nil {
		return nil, fmt.Errorf("failed to generate embeddings: %w", err)
	}

	return embeddings, nil
}

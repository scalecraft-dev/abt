CREATE TABLE IF NOT EXISTS agent_documents (
    id STRING NOT NULL,
    content TEXT NOT NULL,
    metadata VARIANT DEFAULT {},
    embedding VECTOR(1536), -- Snowflake vector type
    created_at TIMESTAMP_TZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP_TZ DEFAULT CURRENT_TIMESTAMP()
);

-- Create a search optimization policy for vector similarity search
ALTER TABLE agent_documents 
ADD SEARCH OPTIMIZATION;

-- Enable vector similarity search on the embedding column
ALTER TABLE agent_documents
ALTER COLUMN embedding
SET SIMILARITY SEARCH ON; 
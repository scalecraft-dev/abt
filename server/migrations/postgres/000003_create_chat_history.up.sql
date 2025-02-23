CREATE TABLE IF NOT EXISTS chat_history (
    agent_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    messages JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (agent_id, user_id)
);

CREATE INDEX idx_chat_history_agent_id ON chat_history(agent_id); 
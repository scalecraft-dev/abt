export type AvatarType = 'emoji' | 'image';

export interface AgentAvatar {
  type: AvatarType;
  value: string; // emoji character or image URL
}

export interface LLMConfig {
  model: string;
  temperature: number;
  max_tokens?: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  narrative: string;
  type: string;
  avatar: {
    type: AvatarType;
    value: string;
  };
  llmConfig: LLMConfig;
  status: 'idle' | 'busy' | 'error';
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentFormData {
  name: string;
  description: string;
  narrative: string;
  avatarType: AvatarType;
  avatarValue: string;
  llmConfig: LLMConfig;
} 
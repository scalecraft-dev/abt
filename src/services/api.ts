import { Agent, AgentFormData } from '../types/agent';
import { Workflow } from '../types/workflow';
import { Integration, IntegrationConfig, SnowflakeConfig } from '../types/integration';

const API_BASE_URL = 'http://localhost:8080/api/v1';

const fetchApi = async (endpoint: string, options?: RequestInit) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    ...options
  });
  if (!response.ok) throw new Error(`API error: ${response.statusText}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  inputs?: Record<string, any>;
}

export interface ChatResponse {
  response: string;
}

export type { Integration, IntegrationConfig, SnowflakeConfig };

export const api = {
  async listAgents(): Promise<Agent[]> {
    const response = await fetchApi('/agents/');
    console.log('Server response:', response);
    return response.map((agent: any) => ({
      ...agent,
      avatar: agent.config.avatar || {
        type: 'emoji',
        value: '🤖'  // Default avatar
      },
      narrative: agent.narrative,
      llmConfig: {
        model: agent.config.model,
        temperature: agent.config.temperature,
        max_tokens: agent.config.max_tokens
      },
      status: agent.status || 'idle',
      capabilities: agent.capabilities || [],
      createdAt: new Date(agent.created_at || Date.now()).toISOString(),
      updatedAt: new Date(agent.updated_at || Date.now()).toISOString()
    }));
  },

  async chat(agent: Agent, message: string): Promise<string> {
    const request: ChatRequest = {
      message
    };

    try {
      const response = await fetchApi(`/agents/${agent.id}/chat`, {
        method: 'POST',
        body: JSON.stringify(request)
      });
      return response.response;
    } catch (error) {
      console.error('Chat API error:', error);
      throw error;
    }
  },

  async getModels(): Promise<string[]> {
    try {
      const response = await fetchApi('/llm/models');
      return response.models;
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ];
    }
  },

  async createAgent(formData: AgentFormData): Promise<Agent> {
    const agent = {
      name: formData.name,
      description: formData.description,
      narrative: formData.narrative,
      type: 'llm',
      config: {
        avatar: {
          type: formData.avatarType,
          value: formData.avatarValue
        },
        model: formData.llmConfig.model,
        temperature: formData.llmConfig.temperature,
        max_tokens: formData.llmConfig.max_tokens
      }
    };

    console.log('Creating agent with data:', agent);

    const response = await fetchApi('/agents/', {
      method: 'POST',
      body: JSON.stringify(agent)
    });
    
    return {
      ...response,
      avatar: response.config.avatar,
      narrative: response.narrative,
      llmConfig: {
        model: response.config.model,
        temperature: response.config.temperature,
        max_tokens: response.config.max_tokens
      },
      status: response.status || 'idle',
      capabilities: response.capabilities || [],
      createdAt: response.created_at ? new Date(response.created_at).toISOString() : new Date().toISOString(),
      updatedAt: response.updated_at ? new Date(response.updated_at).toISOString() : new Date().toISOString()
    };
  },

  async listWorkflows(): Promise<Workflow[]> {
    try {
      const response = await fetchApi('/workflows/');
      console.log('Server response:', response);
      return response.map((workflow: any) => ({
        ...workflow,
        createdAt: new Date(workflow.created_at).toISOString(),
        updatedAt: new Date(workflow.updated_at).toISOString(),
        status: workflow.status || 'inactive',
        schedule: workflow.schedule || 'daily',
        dag: workflow.dag || { nodes: [], edges: [] }
      }));
    } catch (error) {
      console.error('Error fetching workflows:', error);
      return [];
    }
  },

  async createWorkflow(workflow: Omit<Workflow, 'id'>): Promise<Workflow> {
    const workflowData = {
      ...workflow,
      dag: workflow.dag || { nodes: [], edges: [] },
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt
    };

    const response = await fetchApi('/workflows/', {
      method: 'POST',
      body: JSON.stringify(workflowData)
    });

    // Transform response to match frontend Workflow type
    return {
      ...response,
      createdAt: new Date(response.created_at).toISOString(),
      updatedAt: new Date(response.updated_at).toISOString(),
      dag: response.dag || { nodes: [], edges: [] }
    };
  },

  async deleteWorkflow(id: string): Promise<void> {
    await fetchApi(`/workflows/${id}`, {
      method: 'DELETE'
    });
  },

  async updateWorkflow(workflow: Workflow): Promise<Workflow> {
    const response = await fetchApi(`/workflows/${workflow.id}`, {
      method: 'PUT',
      body: JSON.stringify(workflow)
    });
    return {
      ...response,
      createdAt: new Date(response.created_at).toISOString(),
      updatedAt: new Date(response.updated_at).toISOString(),
      dag: response.dag || { nodes: [], edges: [] }
    };
  },

  async getWorkflow(id: string): Promise<Workflow> {
    const response = await fetchApi(`/workflows/${id}`);
    if (!response) {
      throw new Error('Workflow not found');
    }
    return {
      ...response,
      createdAt: new Date(response.created_at).toISOString(),
      updatedAt: new Date(response.updated_at).toISOString(),
      dag: response.dag || { nodes: [], edges: [] }
    };
  },

  updateAgent: async (agent: Agent): Promise<Agent> => {
    const response = await fetch(`${API_BASE_URL}/agents/${agent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent)
    });
    return response.json();
  },

  async initiateGoogleDriveAuth(): Promise<string> {
    const response = await fetchApi('/integrations/google-drive/auth');
    return response.authUrl;
  },

  async getIntegrationStatus(provider: string): Promise<'connected' | 'disconnected'> {
    const response = await fetchApi(`/integrations/${provider}/status`);
    return response.status;
  },

  async deleteIntegration(id: string): Promise<void> {
    await fetchApi(`/integrations/${id}`, {
      method: 'DELETE',
    });
  },

  async listIntegrations(): Promise<Integration[]> {
    const response = await fetchApi('/integrations/');
    return response;
  },

  async createIntegration(config: IntegrationConfig): Promise<Integration> {
    return await fetchApi('/integrations/', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  },

  async testSnowflakeConnection(config: SnowflakeConfig): Promise<void> {
    await fetchApi('/integrations/snowflake/test', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  },

  async listAvailableIntegrations(): Promise<Integration[]> {
    return await fetchApi('/integrations/available');
  }
}; 
export interface Integration {
  id?: string;
  provider: string;
  name: string;
  type: string;
  description: string;
  status: 'active' | 'disconnected';
  config?: Record<string, any>;
}

export interface SnowflakeConfig {
  account: string;
  username: string;
  password: string;
  database: string;
  schema: string;
  warehouse: string;
}

export interface IntegrationConfig {
  name: string;
  type: string;
  description: string;
  provider: string;
  config: Record<string, any>;
} 
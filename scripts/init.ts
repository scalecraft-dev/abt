import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { api } from '../src/services/api';

interface WorkflowDefinition {
  name: string;
  description: string;
  status: 'inactive' | 'active';
  schedule: 'daily' | 'weekly' | 'monthly' | 'custom';
  dag: {
    nodes: {
      id: string;
      type: 'agent';
      agentId: string;
      position: { x: number; y: number };
      configuration: Record<string, any>;
      inputs: string[];
      outputs: string[];
    }[];
    edges: {
      id: string;
      source: string;
      target: string;
    }[];
  };
}

interface AgentDefinition {
  name: string;
  description: string;
  narrative: string;
  type: string;
  config: {
    avatar: {
      type: 'emoji' | 'image';
      value: string;
    };
    model: string;
    temperature: number;
    max_tokens: number;
    use_rag?: boolean;
  };
}

async function loadAndCreateAgents(definitionsPath: string): Promise<void> {
  try {
    // Get the full path to the agents directory
    const agentsPath = path.join(process.cwd(), definitionsPath, 'agents');
    
    // Read all files in the agents directory
    const files = await fs.readdir(agentsPath);
    
    // Filter for yaml files and process them
    const yamlFiles = files.filter(file => 
      file.endsWith('.yaml') || file.endsWith('.yml')
    );

    console.log(`Found ${yamlFiles.length} agent definition files`);

    for (const file of yamlFiles) {
      try {
        // Read and parse the YAML file
        const filePath = path.join(agentsPath, file);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const agentDef = yaml.load(fileContent) as AgentDefinition;

        // Transform to match the API's expected format
        const formData = {
          name: agentDef.name,
          description: agentDef.description,
          narrative: agentDef.narrative,
          avatarType: agentDef.config.avatar.type,
          avatarValue: agentDef.config.avatar.value,
          llmConfig: {
            model: agentDef.config.model,
            temperature: agentDef.config.temperature,
            max_tokens: agentDef.config.max_tokens
          }
        };

        // Create the agent
        await api.createAgent(formData);
        console.log(`Successfully created agent from ${file}`);
      } catch (error) {
        console.error(`Failed to process ${file}:`, error);
        // Continue with other files even if one fails
      }
    }
  } catch (error) {
    console.error('Failed to load agent definitions:', error);
    throw error;
  }
}

async function loadAndCreateWorkflows(definitionsPath: string): Promise<void> {
  try {
    const workflowsPath = path.join(process.cwd(), definitionsPath, 'workflows');
    const files = await fs.readdir(workflowsPath);
    
    const yamlFiles = files.filter(file => 
      file.endsWith('.yaml') || file.endsWith('.yml')
    );

    console.log(`Found ${yamlFiles.length} workflow definition files`);

    for (const file of yamlFiles) {
      try {
        const filePath = path.join(workflowsPath, file);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const workflowDef = yaml.load(fileContent) as WorkflowDefinition;

        // Create workflow using the API
        await api.createWorkflow({
          name: workflowDef.name,
          description: workflowDef.description,
          status: workflowDef.status,
          schedule: workflowDef.schedule,
          dag: workflowDef.dag,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        console.log(`Successfully created workflow from ${file}`);
      } catch (error) {
        console.error(`Failed to process workflow ${file}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to load workflow definitions:', error);
    throw error;
  }
}

// Check if this is being run directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  Promise.all([
    loadAndCreateAgents('server/definitions'),
    loadAndCreateWorkflows('server/definitions')
  ])
    .then(() => {
      console.log('Initialization completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Initialization failed:', error);
      process.exit(1);
    });
}

export { loadAndCreateAgents, loadAndCreateWorkflows }; 
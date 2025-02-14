import { Edge } from 'reactflow';
import { AgentNodeModel, HumanNodeModel } from './job';

export interface DAG {
  nodes: (AgentNodeModel | HumanNodeModel)[];
  edges: Edge[];
}

export type WorkflowSchedule = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  dag: DAG;
  createdAt: string;
  updatedAt: string;
  status: 'inactive' | 'active';
  schedule: WorkflowSchedule;
} 
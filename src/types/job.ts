import { Node, Edge } from 'reactflow';

export interface NodeData {
  type: 'agent' | 'human';
  agentId?: string;
  configuration?: Record<string, any>;
  userId?: string;
  task?: string;
  instructions?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

export type FlowNode = Node<NodeData>;
export type FlowEdge = Edge;

export interface BaseNodeModel {
  id: string;
  type: 'agent' | 'human';
  position: { x: number; y: number };
  inputs: string[];
  outputs: string[];
}

export interface AgentNodeModel extends BaseNodeModel {
  type: 'agent';
  agentId: string;
  configuration: Record<string, any>;
}

export interface HumanNodeModel extends BaseNodeModel {
  type: 'human';
  userId: string;
  task: string;
  instructions: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface DAG {
  nodes: (AgentNodeModel | HumanNodeModel)[];
  edges: FlowEdge[];
}

export interface Job {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  dag: DAG;
} 
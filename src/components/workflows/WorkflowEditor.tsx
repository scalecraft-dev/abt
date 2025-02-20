import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Position,
  Panel
} from 'reactflow';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import AgentNode from '../nodes/AgentNode';
import HumanNode from '../nodes/HumanNode';
import { AgentNodeModel, HumanNodeModel, NodeData, DAG } from '../../types/job';
import { Workflow } from '../../types/workflow';
import { updateWorkflow } from '../../store/workflowSlice';
import { addAgent } from '../../store/agentSlice';
import { api } from '../../services/api';
import 'reactflow/dist/style.css';
import './WorkflowEditor.css';
import NodeEditModal from '../nodes/NodeEditModal';

interface WorkflowEditorProps {
  workflowId: string;
  workflow: Workflow;
}

const nodeTypes = {
  agent: AgentNode,
  human: HumanNode,
};

const convertToReactFlowNode = (node: AgentNodeModel | HumanNodeModel): Node<NodeData> => {
  const baseData = {
    type: node.type,
    status: 'pending' as const
  };

  const data: NodeData = node.type === 'agent' 
    ? {
        ...baseData,
        agentId: node.agentId,
        configuration: node.configuration
      }
    : {
        ...baseData,
        userId: node.userId,
        task: node.task,
        instructions: node.instructions,
        status: node.status
      };

  return {
    id: node.id,
    type: node.type === 'agent' ? 'agent' : 'human',
    position: node.position || { x: 100, y: 100 },
    data
  };
};

const convertToDagNode = (node: Node<NodeData>): AgentNodeModel | HumanNodeModel => {
  const baseNode = {
    id: node.id,
    type: node.data.type,
    position: node.position || { x: 0, y: 0 },
    inputs: [],
    outputs: []
  };

  return node.data.type === 'agent'
    ? {
        ...baseNode,
        type: 'agent' as const,
        agentId: node.data.agentId!,
        configuration: node.data.configuration!
      }
    : {
        ...baseNode,
        type: 'human' as const,
        userId: node.data.userId!,
        task: node.data.task!,
        instructions: node.data.instructions!,
        status: node.data.status!
      };
};

const edgeOptions = {
  style: {
    strokeWidth: 2,
    stroke: '#666'
  },
  animated: true
};

const connectionLineStyle = {
  strokeWidth: 2,
  stroke: '#888'
};

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflowId, workflow: initialWorkflow }) => {
  const dispatch = useAppDispatch();
  const agents = useAppSelector(state => state.agent.agents);
  const [initialized, setInitialized] = useState(false);
  
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!initialized && initialWorkflow.dag && agents.length > 0) {
      const flowNodes = initialWorkflow.dag.nodes.map(node => ({
        ...convertToReactFlowNode(node),
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
      }));
      setNodes(flowNodes);
      setEdges(initialWorkflow.dag.edges);
      setInitialized(true);
    }
  }, [initialized, initialWorkflow.dag, setNodes, setEdges, agents]);

  // Fetch agents when component mounts
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const agents = await api.listAgents();
        dispatch({ type: 'agent/clearAgents' });
        agents.forEach(agent => dispatch(addAgent(agent)));
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    };
    
    if (agents.length === 0) {
      fetchAgents();
    }
  }, [dispatch, agents.length]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const onSave = useCallback(() => {
    if (!initialWorkflow) return;

    const updatedDag: DAG = {
      nodes: nodes.map(convertToDagNode),
      edges
    };

    const updatedWorkflow = {
      ...initialWorkflow,
      dag: updatedDag,
      updatedAt: new Date().toISOString()
    };

    const saveWorkflow = async () => {
      try {
        const savedWorkflow = await api.updateWorkflow(updatedWorkflow);
        dispatch(updateWorkflow(savedWorkflow));
        alert('Workflow saved successfully');
      } catch (error) {
        console.error('Failed to save workflow:', error);
        alert('Failed to save workflow. Please try again.');
      }
    };
    
    saveWorkflow();
  }, [initialWorkflow, nodes, edges, dispatch]);

  const addAgentNode = useCallback((agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const newNode: Node<NodeData> = {
      id: `node-${Date.now()}`,
      type: 'agent',
      position: { x: 100, y: 100 },
      data: {
        type: 'agent',
        agentId: agent.id,
        configuration: {},
        status: 'pending'
      }
    };

    setNodes(nds => [...nds, newNode]);
  }, [agents, setNodes]);

  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const handleNodeEdit = useCallback((nodeId: string, configuration: Record<string, any>) => {
    setNodes(nodes => nodes.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, configuration } }
        : node
    ));
  }, [setNodes]);

  if (!initialWorkflow) {
    return <div>Workflow not found</div>;
  }

  if (nodes.length === 0 && initialWorkflow.dag.nodes.length > 0) {
    return <div>Loading nodes...</div>;
  }

  return (
    <div className="workflow-editor">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={edgeOptions}
        connectionLineStyle={connectionLineStyle}
        fitView={true}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background color="var(--neutral-900)" gap={16} size={1} style={{ opacity: 0.5 }} />
        <Controls />
        <Panel position="top-right" className="workflow-editor-panel">
          <button onClick={onSave} className="save-button">Save Changes</button>
          <select 
            onChange={(e) => addAgentNode(e.target.value)}
            value=""
            className="agent-select"
          >
            <option value="">Add Agent</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </Panel>
      </ReactFlow>
      <NodeEditModal onSave={handleNodeEdit} />
    </div>
  );
};

export default function WrappedWorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditor {...props} />
    </ReactFlowProvider>
  );
} 
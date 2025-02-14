import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { openNodeEditModal } from '../../store/modalSlice';
import { NodeData } from '../../types/job';
import './AgentNode.css';

const AgentNode = memo(({ data, id }: NodeProps<NodeData>) => {
  const [showMenu, setShowMenu] = useState(false);
  const dispatch = useAppDispatch();
  
  const agent = useAppSelector(state => 
    state.agent.agents.find(a => a.id === data.agentId)
  );

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this node?')) {
      // We'll need to implement node deletion logic
    }
  }, []);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    dispatch(openNodeEditModal({ 
      nodeId: id, 
      configuration: {
        ...data.configuration,
        inputs: data.configuration?.inputs || [],
        outputs: data.configuration?.outputs || []
      }
    }));
  }, [dispatch, id, data.configuration]);

  if (!agent) return <div className="agent-node">Loading agent...</div>;

  const configuration = data.configuration || {};
  const inputs = configuration.inputs || [];
  const outputs = configuration.outputs || [];

  return (
    <div className="agent-node">
      <Handle type="target" position={Position.Top} className="node-handle" />
      
      <div className="agent-node-header">
        <div className="agent-node-avatar">
          {agent.avatar.type === 'emoji' ? (
            <span className="emoji-avatar">{agent.avatar.value}</span>
          ) : (
            <img src={agent.avatar.value} alt={agent.name} className="image-avatar" />
          )}
        </div>
        <div className="agent-node-title">
          <h3>{agent.name}</h3>
          <span className={`node-status ${data.status}`}>{data.status}</span>
        </div>
        <div className="node-menu">
          <button 
            className="menu-button" 
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            ⋮
          </button>
          {showMenu && (
            <div className="menu-dropdown">
              <button onClick={handleEdit}>Edit</button>
              <button onClick={handleDelete}>Delete</button>
            </div>
          )}
        </div>
      </div>

      <div className="agent-node-content">
        <p className="agent-description">{agent.description}</p>
        
        {inputs.length > 0 && (
          <div className="io-section">
            <h4>Inputs</h4>
            <ul className="io-list">
              {inputs.map((input: string, index: number) => (
                <li key={index}>{input}</li>
              ))}
            </ul>
          </div>
        )}
        
        {outputs.length > 0 && (
          <div className="io-section">
            <h4>Outputs</h4>
            <ul className="io-list">
              {outputs.map((output: string, index: number) => (
                <li key={index}>{output}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
});

export default AgentNode; 
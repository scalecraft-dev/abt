import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addAgent, updateAgent, removeAgent } from '../store/agentSlice';
import { Agent, AvatarType, Config } from '../types/agent';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import './Agents.css';
import { api } from '../services/api';
import ChatInterface from '../components/nodes/ChatInterface';
import Modal from '../components/common/Modal';

interface AgentFormData {
  name: string;
  description: string;
  narrative: string;
  avatarType: AvatarType;
  avatarValue: string;
  config: Config;
}

const DEFAULT_EMOJI = '🤖';

const AgentForm: React.FC<{
  initialData?: AgentFormData;
  onSubmit: (data: AgentFormData) => void;
  onCancel: () => void;
  submitLabel: string;
}> = ({ initialData, onSubmit, onCancel, submitLabel }) => {
  const [formData, setFormData] = useState<AgentFormData>(
    initialData || {
      name: '',
      description: '',
      narrative: '',
      avatarType: 'emoji',
      avatarValue: DEFAULT_EMOJI,
      config: {
        model: 'claude-3-opus-20240229',
        temperature: 0.7,
        max_tokens: 1024,
        use_rag: false,
        use_direct_query: false
      }
    }
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const availableModels = await api.getModels();
        setModels(availableModels);
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setFormData(prev => ({
      ...prev,
      avatarValue: emojiData.emoji
    }));
    setShowEmojiPicker(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          avatarType: 'image',
          avatarValue: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="agent-form">
      <div className="form-group avatar-group">
        <label>Avatar:</label>
        <div className="avatar-preview">
          {formData.avatarType === 'emoji' ? (
            <div className="emoji-avatar">{formData.avatarValue}</div>
          ) : (
            <img src={formData.avatarValue} alt="Agent avatar" className="image-avatar" />
          )}
        </div>
        <div className="avatar-controls">
          <div className="avatar-type-selector">
            <button
              className={`avatar-button ${formData.avatarType === 'emoji' ? 'active' : ''}`}
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  avatarType: 'emoji'
                }));
                setShowEmojiPicker(true);
              }}
            >
              <span className="emoji-icon">😀</span>
              Emoji
            </button>
            <button
              className={`avatar-button upload-button ${formData.avatarType === 'image' ? 'active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="upload-icon">📁</span>
              Upload Image
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
        {showEmojiPicker && (
          <div className="emoji-picker-container">
            <div className="emoji-picker-backdrop" onClick={() => setShowEmojiPicker(false)} />
            <div className="emoji-picker-content">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          </div>
        )}
      </div>
      <div className="form-group">
        <label>Name:</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter agent name"
        />
      </div>
      <div className="form-group">
        <label>Description:</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter agent description"
        />
      </div>
      <div className="form-group">
        <label>Narrative:</label>
        <textarea
          value={formData.narrative}
          onChange={(e) => setFormData(prev => ({ ...prev, narrative: e.target.value }))}
          placeholder="Describe your agent's capabilities and behavior..."
          rows={10}
        />
      </div>
      <div className="form-group">
        <label>LLM Configuration:</label>
        <div className="llm-config">
          <select
            value={formData.config.model}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              config: { ...prev.config, model: e.target.value }
            }))}
          >
            <option value="">Select a model</option>
            {models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={formData.config.temperature}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              config: { ...prev.config, temperature: parseFloat(e.target.value) }
            }))}
            placeholder="Temperature"
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">
          <input
            type="checkbox"
            checked={formData.config.use_rag}
            onChange={(e) => setFormData({
              ...formData,
              config: {
                ...formData.config,
                use_rag: e.target.checked
              }
            })}
            className="form-checkbox"
          />
          Enable RAG (Retrieval Augmented Generation)
        </label>
        <div className="form-help-text">
          When enabled, the agent will use document retrieval to enhance its responses
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">
          <input
            type="checkbox"
            checked={formData.config.use_direct_query}
            onChange={(e) => setFormData({
              ...formData,
              config: {
                ...formData.config,
                use_direct_query: e.target.checked
              }
            })}
            className="form-checkbox"
          />
          Enable Direct Query
        </label>
        <div className="form-help-text">
          When enabled, the agent can directly query patient data from configured data sources
        </div>
      </div>
      <div className="modal-actions">
        <button className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
        <button 
          className="create-button"
          onClick={() => onSubmit(formData)}
          disabled={!formData.narrative.trim()}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
};

const Agents: React.FC = () => {
  const dispatch = useAppDispatch();
  const agents = useAppSelector(state => state.agent.agents);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [chatWithAgent, setChatWithAgent] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

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
    fetchAgents();
  }, [dispatch]);

  const handleCreateAgent = async (formData: AgentFormData) => {
    try {
      const newAgent = await api.createAgent(formData);
      dispatch(addAgent(newAgent));
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create agent:', error);
      // Optionally show error to user
    }
  };

  const handleUpdateAgent = async (formData: AgentFormData) => {
    if (!editingAgent) return;

    try {
      const updatedAgent: Agent = {
        ...editingAgent,
        name: formData.name,
        description: formData.description,
        narrative: formData.narrative,
        avatar: {
          type: formData.avatarType,
          value: formData.avatarValue
        },
        config: formData.config,
        updatedAt: new Date().toISOString()
      };

      // Add API call to update the agent in the database
      await api.updateAgent(updatedAgent);
      
      // Then update the store
      dispatch(updateAgent(updatedAgent));
      setEditingAgent(null);
    } catch (error) {
      console.error('Failed to update agent:', error);
      alert('Failed to update agent. Please try again.');
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    try {
      await api.deleteAgent(id);
      dispatch(removeAgent(id));
    } catch (error) {
      console.error('Failed to delete agent:', error);
      alert('Failed to delete agent. Please try again.');
    }
  };

  const handleEditClick = (e: React.MouseEvent, agent: Agent) => {
    e.stopPropagation();
    setEditingAgent(agent);
  };

  return (
    <div className="agents-page">
      <div className="agents-header">
        <h1>Agents</h1>
        <button 
          className="create-button"
          onClick={() => setIsCreating(true)}
        >
          Create New Agent
        </button>
      </div>

      {(isCreating || editingAgent) && (
        <Modal 
          isOpen={true} 
          onClose={() => {
            setIsCreating(false);
            setEditingAgent(null);
          }}
        >
          <h2>{isCreating ? 'Create New Agent' : `Edit ${editingAgent?.name}`}</h2>
          <AgentForm
            initialData={editingAgent ? {
              name: editingAgent.name,
              description: editingAgent.description,
              narrative: editingAgent.narrative || '',
              avatarType: editingAgent.avatar.type,
              avatarValue: editingAgent.avatar.value,
              config: {
                model: editingAgent.config.model,
                temperature: editingAgent.config.temperature,
                max_tokens: editingAgent.config.max_tokens,
                use_rag: editingAgent.config.use_rag,
                use_direct_query: editingAgent.config.use_direct_query
              }
            } : undefined}
            onSubmit={isCreating ? handleCreateAgent : handleUpdateAgent}
            onCancel={() => {
              setIsCreating(false);
              setEditingAgent(null);
            }}
            submitLabel={isCreating ? 'Create' : 'Update'}
          />
        </Modal>
      )}

      <div className="agents-list">
        {agents.map(agent => (
          <div key={agent.id} className="agent-card">
            <div className="agent-card-header">
              <div className="agent-info">
                <div className="agent-avatar">
                  {agent.avatar.type === 'emoji' ? (
                    <div className="emoji-avatar">{agent.avatar.value}</div>
                  ) : (
                    <img src={agent.avatar.value} alt={agent.name} className="image-avatar" />
                  )}
                </div>
                <h3>{agent.name}</h3>
              </div>
              <div className="agent-actions">
                <button
                  className="chat-button"
                  onClick={() => setChatWithAgent(agent.id)}
                >
                  Chat
                </button>
                <button
                  className="edit-button"
                  onClick={(e) => handleEditClick(e, agent)}
                >
                  Edit
                </button>
                <button
                  className="delete-button"
                  onClick={() => handleDeleteAgent(agent.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            <p>{agent.description}</p>
            <div className="agent-status">
              Status: <span className={agent.status}>{agent.status}</span>
            </div>
            <div className="agent-capabilities">
              {agent.capabilities.map(cap => (
                <span key={cap} className="capability-tag">
                  {cap}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {chatWithAgent && (
        <ChatInterface
          agent={agents.find(a => a.id === chatWithAgent)!}
          onClose={() => setChatWithAgent(null)}
        />
      )}
    </div>
  );
};

export default Agents; 
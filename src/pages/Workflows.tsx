import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addWorkflow, removeWorkflow, setWorkflows, updateWorkflow } from '../store/workflowSlice';
import { Workflow, WorkflowSchedule } from '../types/workflow';
import { api } from '../services/api';
import './Workflows.css';
import './Toggle.css';
import Modal from '../components/common/Modal';

interface WorkflowFormData {
  name: string;
  description: string;
  schedule: WorkflowSchedule;
}

const Workflows: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const workflows = useAppSelector(state => state.workflow.workflows);
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState<WorkflowFormData>({
    name: '',
    description: '',
    schedule: 'daily'
  });
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const scheduleOptions: WorkflowSchedule[] = ['daily', 'weekly', 'monthly', 'custom'];

  useEffect(() => {
    let mounted = true;
    const fetchWorkflows = async () => {
      try {
        const workflows = await api.listWorkflows();
        if (mounted) {
          dispatch({ type: 'workflow/clearWorkflows' });
          dispatch(setWorkflows(workflows));
        }
      } catch (error) {
        console.error('Failed to fetch workflows:', error);
        alert('Failed to load workflows. Please refresh the page.');
      }
    };
    
    fetchWorkflows();

    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateWorkflow = async () => {
    try {
      const newWorkflow = {
        name: formData.name,
        description: formData.description,
        schedule: formData.schedule,
        dag: {
          nodes: [],
          edges: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'inactive' as const,
      };

      const createdWorkflow = await api.createWorkflow(newWorkflow);
      dispatch(addWorkflow(createdWorkflow));
      
      setIsCreating(false);
      setFormData({ name: '', description: '', schedule: 'daily' });
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert('Failed to create workflow. Please try again.');
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        await api.deleteWorkflow(id);
        dispatch(removeWorkflow(id));
      } catch (error) {
        console.error('Failed to delete workflow:', error);
        alert('Failed to delete workflow. Please try again.');
      }
    }
  };

  const handleRowClick = (workflowId: string) => {
    navigate(`/workflows/${workflowId}`);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleToggleStatus = async (workflow: Workflow, e: React.SyntheticEvent) => {
    e.stopPropagation();
    try {
      const updatedWorkflow = {
        ...workflow,
        status: workflow.status === 'active' ? 'inactive' : 'active' as 'inactive' | 'active',
        updatedAt: new Date().toISOString()
      };
      await api.updateWorkflow(updatedWorkflow);
      dispatch(updateWorkflow(updatedWorkflow));
    } catch (error) {
      console.error('Failed to update workflow status:', error);
      alert('Failed to update workflow status. Please try again.');
    }
  };

  const handleScheduleChange = async (workflow: Workflow, newSchedule: WorkflowSchedule) => {
    try {
      const updatedWorkflow = {
        ...workflow,
        schedule: newSchedule,
        updatedAt: new Date().toISOString()
      };
      await api.updateWorkflow(updatedWorkflow);
      dispatch(updateWorkflow(updatedWorkflow));
    } catch (error) {
      console.error('Failed to update workflow schedule:', error);
      alert('Failed to update schedule. Please try again.');
    }
  };

  const handleEditClick = (e: React.MouseEvent, workflow: Workflow) => {
    e.stopPropagation();
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description,
      schedule: workflow.schedule
    });
  };

  const handleUpdateWorkflow = async () => {
    if (!editingWorkflow) return;
    try {
      const updatedWorkflow = {
        ...editingWorkflow,
        name: formData.name,
        description: formData.description,
        schedule: formData.schedule,
        updatedAt: new Date().toISOString()
      };
      await api.updateWorkflow(updatedWorkflow);
      dispatch(updateWorkflow(updatedWorkflow));
      setEditingWorkflow(null);
    } catch (error) {
      console.error('Failed to update workflow:', error);
      alert('Failed to update workflow. Please try again.');
    }
  };

  return (
    <div className="workflows-page">
      <div className="workflows-header">
        <h1>Workflows</h1>
        <button 
          className="create-button"
          onClick={() => setIsCreating(true)}
        >
          Create New Workflow
        </button>
      </div>

      <div className="workflows-table-container">
        {workflows.length === 0 ? (
          <p className="no-workflows">No workflows found</p>
        ) : (
          <table className="workflows-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Name</th>
                <th>Description</th>
                <th>Schedule</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map(workflow => (
                <tr 
                  key={workflow.id}
                  onClick={() => handleRowClick(workflow.id)}
                  className="workflow-row"
                >
                  <td>
                    <span className={`status-badge ${workflow.status}`}>
                      <label 
                        className="toggle"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleStatus(workflow, e);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={workflow.status === 'active'}
                          readOnly
                        />
                        <span className="slider"></span>
                      </label>
                    </span>
                  </td>
                  <td>{workflow.name}</td>
                  <td>{workflow.description}</td>
                  <td className="schedule" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={workflow.schedule || 'daily'}
                      onChange={(e) => handleScheduleChange(workflow, e.target.value as WorkflowSchedule)}
                    >
                      {scheduleOptions.map(option => (
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{formatDate(new Date(workflow.createdAt))}</td>
                  <td>{formatDate(new Date(workflow.updatedAt))}</td>
                  <td>
                    <button
                      className="edit-button"
                      onClick={(e) => {
                        handleEditClick(e, workflow);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWorkflow(workflow.id);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isCreating && (
        <Modal 
          isOpen={true}
          onClose={() => {
            setIsCreating(false);
            setFormData({ name: '', description: '', schedule: 'daily' });
          }}
        >
          <h2>Create New Workflow</h2>
          <div className="form-group">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Workflow name"
            />
          </div>
          <div className="form-group">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Workflow description"
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Schedule</label>
            <select
              value={formData.schedule}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                schedule: e.target.value as WorkflowSchedule 
              }))}
            >
              {scheduleOptions.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button 
              className="cancel-button"
              onClick={() => {
                setIsCreating(false);
                setFormData({ name: '', description: '', schedule: 'daily' });
              }}
            >
              Cancel
            </button>
            <button 
              className="create-button"
              onClick={handleCreateWorkflow}
              disabled={!formData.name.trim()}
            >
              Create
            </button>
          </div>
        </Modal>
      )}

      {editingWorkflow && (
        <Modal 
          isOpen={true}
          onClose={() => {
            setEditingWorkflow(null);
            setFormData({ name: '', description: '', schedule: 'daily' });
          }}
        >
          <h2>Edit Workflow</h2>
          <div className="form-group">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Workflow name"
            />
          </div>
          <div className="form-group">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Workflow description"
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Schedule</label>
            <select
              value={formData.schedule}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                schedule: e.target.value as WorkflowSchedule 
              }))}
            >
              {scheduleOptions.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button 
              className="cancel-button"
              onClick={() => {
                setEditingWorkflow(null);
                setFormData({ name: '', description: '', schedule: 'daily' });
              }}
            >
              Cancel
            </button>
            <button 
              className="create-button"
              onClick={handleUpdateWorkflow}
              disabled={!formData.name.trim()}
            >
              Update
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Workflows; 
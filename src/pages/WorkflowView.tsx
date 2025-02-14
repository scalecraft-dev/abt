import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { api } from '../services/api';
import { addWorkflow } from '../store/workflowSlice';
import WorkflowEditor from '../components/workflows/WorkflowEditor';
import './WorkflowView.css';

const WorkflowView: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const workflow = useAppSelector(state => 
    state.workflow.workflows.find(w => w.id === workflowId)
  );

  useEffect(() => {
    const fetchWorkflow = async () => {
      if (!workflowId) return;
      try {
        const workflow = await api.getWorkflow(workflowId);
        dispatch(addWorkflow(workflow));
      } catch (error) {
        console.error('Failed to fetch workflow:', error);
        setError('Failed to load workflow. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!workflow) {
      fetchWorkflow();
    } else {
      setIsLoading(false);
    }
  }, [dispatch, workflow, workflowId]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!workflow) {
    return <div>Workflow not found</div>;
  }

  return (
    <div className="workflow-view">
      <div className="workflow-view-header" style={{ marginTop: '15px', marginBottom: '15px' }}>
        <h2>Workflow Editor</h2>
        <h3>{workflow.name}</h3>
        <button className="back-button" onClick={() => navigate('/workflows')}>
          ← Back to Workflows
        </button>
      </div>
      <div className="workflow-view-content">
        <WorkflowEditor workflowId={workflow.id} workflow={workflow} />
      </div>
    </div>
  );
};

export default WorkflowView; 
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Workflow } from '../types/workflow';

interface WorkflowState {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
}

const initialState: WorkflowState = {
  workflows: [],
  currentWorkflow: null
};

const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    clearWorkflows: (state) => {
      state.workflows = [];
    },
    setWorkflows: (state, action: PayloadAction<Workflow[]>) => {
      state.workflows = action.payload;
    },
    addWorkflow: (state, action: PayloadAction<Workflow>) => {
      state.workflows.push(action.payload);
    },
    updateWorkflow: (state, action: PayloadAction<Workflow>) => {
      const index = state.workflows.findIndex(w => w.id === action.payload.id);
      if (index !== -1) {
        state.workflows[index] = action.payload;
      }
    },
    removeWorkflow: (state, action: PayloadAction<string>) => {
      state.workflows = state.workflows.filter(w => w.id !== action.payload);
    },
    setCurrentWorkflow: (state, action: PayloadAction<string | null>) => {
      state.currentWorkflow = action.payload ? 
        state.workflows.find(w => w.id === action.payload) || null : 
        null;
    }
  }
});

export const { clearWorkflows, setWorkflows, addWorkflow, updateWorkflow, removeWorkflow, setCurrentWorkflow } = workflowSlice.actions;
export default workflowSlice.reducer; 
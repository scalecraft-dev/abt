import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Agent } from '../types/agent';

interface AgentState {
  agents: Agent[];
}

const initialState: AgentState = {
  agents: []
};

const agentSlice = createSlice({
  name: 'agent',
  initialState,
  reducers: {
    clearAgents: (state) => {
      state.agents = [];
    },
    setAgents: (state, action: PayloadAction<Agent[]>) => {
      state.agents = action.payload;
    },
    addAgent: (state, action: PayloadAction<Agent>) => {
      state.agents.push(action.payload);
    },
    updateAgent: (state, action: PayloadAction<Agent>) => {
      const index = state.agents.findIndex(a => a.id === action.payload.id);
      if (index !== -1) {
        state.agents[index] = action.payload;
      }
    },
    removeAgent: (state, action: PayloadAction<string>) => {
      state.agents = state.agents.filter(a => a.id !== action.payload);
    }
  }
});

export const { clearAgents, setAgents, addAgent, updateAgent, removeAgent } = agentSlice.actions;
export default agentSlice.reducer; 
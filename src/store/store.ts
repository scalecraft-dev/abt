import { configureStore } from '@reduxjs/toolkit';
import workflowReducer from './workflowSlice';
import agentReducer from './agentSlice';
import modalReducer from './modalSlice';

export const store = configureStore({
  reducer: {
    workflow: workflowReducer,
    agent: agentReducer,
    modal: modalReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store; 
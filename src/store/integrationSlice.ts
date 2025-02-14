import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Integration } from '../types/integration';

interface IntegrationState {
  integrations: Integration[];
  loading: boolean;
  error: string | null;
}

const initialState: IntegrationState = {
  integrations: [],
  loading: false,
  error: null
};

const integrationSlice = createSlice({
  name: 'integration',
  initialState,
  reducers: {
    // Add reducers for CRUD operations
  }
});

export default integrationSlice.reducer; 
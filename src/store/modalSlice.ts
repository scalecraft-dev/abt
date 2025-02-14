import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ModalState {
  isOpen: boolean;
  nodeId: string | null;
  configuration: Record<string, any> | null;
}

const initialState: ModalState = {
  isOpen: false,
  nodeId: null,
  configuration: null
};

const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    openNodeEditModal: (state, action: PayloadAction<{ nodeId: string; configuration: Record<string, any> }>) => {
      state.isOpen = true;
      state.nodeId = action.payload.nodeId;
      state.configuration = action.payload.configuration;
    },
    closeModal: (state) => {
      state.isOpen = false;
      state.nodeId = null;
      state.configuration = null;
    }
  }
});

export const { openNodeEditModal, closeModal } = modalSlice.actions;
export default modalSlice.reducer;
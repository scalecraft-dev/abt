import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { closeModal } from '../../store/modalSlice';
import Modal from '../common/Modal';
import './NodeEditModal.css';

interface NodeEditModalProps {
  onSave: (nodeId: string, configuration: Record<string, any>) => void;
}

const NodeEditModal: React.FC<NodeEditModalProps> = ({ onSave }) => {
  const dispatch = useAppDispatch();
  const { nodeId, configuration, isOpen } = useAppSelector(state => state.modal);
  const [inputs, setInputs] = useState<string[]>([]);
  const [outputs, setOutputs] = useState<string[]>([]);
  const [newInput, setNewInput] = useState('');
  const [newOutput, setNewOutput] = useState('');

  useEffect(() => {
    if (configuration) {
      setInputs(configuration.inputs || []);
      setOutputs(configuration.outputs || []);
    }
  }, [configuration]);

  const handleAddInput = () => {
    if (newInput.trim()) {
      setInputs([...inputs, newInput.trim()]);
      setNewInput('');
    }
  };

  const handleAddOutput = () => {
    if (newOutput.trim()) {
      setOutputs([...outputs, newOutput.trim()]);
      setNewOutput('');
    }
  };

  const handleRemoveInput = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const handleRemoveOutput = (index: number) => {
    setOutputs(outputs.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (nodeId) {
      onSave(nodeId, {
        ...configuration,
        inputs,
        outputs
      });
      dispatch(closeModal());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => dispatch(closeModal())}>
      <h3>Edit Node Configuration</h3>
      
      <div className="modal-section">
        <h4>Inputs</h4>
        <div className="input-group">
          <input
            type="text"
            value={newInput}
            onChange={(e) => setNewInput(e.target.value)}
            placeholder="Add new input"
            onKeyPress={(e) => e.key === 'Enter' && handleAddInput()}
          />
          <button onClick={handleAddInput}>Add</button>
        </div>
        <ul className="items-list">
          {inputs.map((input, index) => (
            <li key={index}>
              {input}
              <button onClick={() => handleRemoveInput(index)}>×</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="modal-section">
        <h4>Outputs</h4>
        <div className="input-group">
          <input
            type="text"
            value={newOutput}
            onChange={(e) => setNewOutput(e.target.value)}
            placeholder="Add new output"
            onKeyPress={(e) => e.key === 'Enter' && handleAddOutput()}
          />
          <button onClick={handleAddOutput}>Add</button>
        </div>
        <ul className="items-list">
          {outputs.map((output, index) => (
            <li key={index}>
              {output}
              <button onClick={() => handleRemoveOutput(index)}>×</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="modal-actions">
        <button onClick={handleSave}>Save</button>
        <button onClick={() => dispatch(closeModal())}>Cancel</button>
      </div>
    </Modal>
  );
};

export default NodeEditModal; 
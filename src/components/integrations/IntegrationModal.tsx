import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { Integration, API_BASE_URL, api } from '../../services/api';
import SnowflakeConfig from './SnowflakeConfig';

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (integration: Integration) => void;
  integration?: Integration;
}

const IntegrationModal: React.FC<IntegrationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  integration
}) => {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [formData, setFormData] = useState<Integration>({
    name: '',
    type: '',
    description: '',
    provider: '',
    status: 'disconnected',
    config: {}
  });
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (integration) {
      setFormData(integration);
      setSelectedIntegration(integration.provider);
    } else {
      setSelectedIntegration(null);
    }
  }, [integration, isOpen]);

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  const handleTestConnection = async () => {
    // Validate required fields first
    const requiredFields = ['account', 'username', 'password', 'database', 'schema', 'warehouse'];
    const missingFields = requiredFields.filter(field => !formData.config?.[field]);
    
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    try {
      setIsTesting(true);
      await api.testIntegration({
        provider: formData.provider,
        endpoint: `${formData.provider}/test`,
        config: formData.config || {}
      });
      alert('Connection successful!');
    } catch (error) {
      console.error('Test connection error:', error);
      // Show the raw error message without any wrapping
      alert(error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const renderIntegrationForm = () => (
    <div className="modal-content">
      {!selectedIntegration ? (
        <>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
        </>
      ) : formData.provider === 'snowflake' ? (
        <SnowflakeConfig onClose={onClose} />
      ) : null}
    </div>
  );

  const renderIntegrationSelect = () => (
    <div className="modal-content">
      <div className="integration-grid">
        <button
          onClick={() => {
            setSelectedIntegration('snowflake');
            setFormData({
              ...formData,
              provider: 'snowflake',
              type: 'database'
            });
          }}
          className="integration-option"
        >
          <img src={`${API_BASE_URL}/icons/snowflake.svg`} alt="Snowflake" className="integration-icon" />
          <span className="integration-name">Snowflake</span>
        </button>
        <button
          onClick={() => {
            setSelectedIntegration('google-drive');
            setFormData({
              ...formData,
              provider: 'google-drive',
              type: 'storage'
            });
          }}
          className="integration-option"
        >
          <img src={`${API_BASE_URL}/icons/google-drive.svg`} alt="Google Drive" className="integration-icon" />
          <span className="integration-name">Google Drive</span>
        </button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal-header">
        <h2 className="modal-title">
          {integration ? 'Edit Integration' : 'Add Integration'}
        </h2>
      </div>
      {(selectedIntegration || integration) ? renderIntegrationForm() : renderIntegrationSelect()}
    </Modal>
  );
};

export default IntegrationModal; 
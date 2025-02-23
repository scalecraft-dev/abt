import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { Integration, API_BASE_URL, api } from '../../services/api';
import SnowflakeConfig from './SnowflakeConfig';
import './IntegrationModal.css';
import { SnowflakeConfig as SnowflakeConfigType } from '../../types/integration';

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
      setFormData({
        id: integration.id,
        name: integration.name,
        type: integration.type,
        description: integration.description,
        provider: integration.provider,
        status: integration.status,
        config: integration.config
      });
      setSelectedIntegration(integration.provider);
    } else {
      setFormData({
        name: '',
        type: '',
        description: '',
        provider: '',
        status: 'disconnected',
        config: {}
      });
      setSelectedIntegration(null);
    }
  }, [integration]);

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
      ) : selectedIntegration === 'snowflake' ? (
        <SnowflakeConfig
          formData={formData}
          setFormData={setFormData}
          onClose={onClose}
        />
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
          data-name="Snowflake"
        >
          <img src={`${API_BASE_URL}/icons/snowflake.svg`} alt="Snowflake" className="integration-icon" />
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
          data-name="Google Drive"
        >
          <img src={`${API_BASE_URL}/icons/google-drive.svg`} alt="Google Drive" className="integration-icon" />
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
      {selectedIntegration === 'snowflake' ? (
        <SnowflakeConfig
          formData={formData}
          setFormData={setFormData}
          onClose={onClose}
        />
      ) : (
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
            data-name="Snowflake"
          >
            <img src={`${API_BASE_URL}/icons/snowflake.svg`} alt="Snowflake" className="integration-icon" />
          </button>
          {/* Other integration options */}
        </div>
      )}
    </Modal>
  );
};

export default IntegrationModal; 
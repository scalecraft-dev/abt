import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { Integration, API_BASE_URL, api } from '../../services/api';

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
      {formData.provider === 'snowflake' && (
        <>
          <div className="form-group">
            <label className="form-label">Account</label>
            <input
              type="text"
              className="form-input"
              value={formData.config?.account || ''}
              onChange={e => setFormData({
                ...formData,
                config: { ...formData.config, account: e.target.value }
              })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={formData.config?.username || ''}
              onChange={e => setFormData({
                ...formData,
                config: { ...formData.config, username: e.target.value }
              })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={formData.config?.password || ''}
              onChange={e => setFormData({
                ...formData,
                config: { ...formData.config, password: e.target.value }
              })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Database</label>
            <input
              type="text"
              className="form-input"
              value={formData.config?.database || ''}
              onChange={e => setFormData({
                ...formData,
                config: { ...formData.config, database: e.target.value }
              })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Schema</label>
            <input
              type="text"
              className="form-input"
              value={formData.config?.schema || ''}
              onChange={e => setFormData({
                ...formData,
                config: { ...formData.config, schema: e.target.value }
              })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Warehouse</label>
            <input
              type="text"
              className="form-input"
              value={formData.config?.warehouse || ''}
              onChange={e => setFormData({
                ...formData,
                config: { ...formData.config, warehouse: e.target.value }
              })}
            />
          </div>
          <div className="modal-footer">
            <div className="modal-footer-left">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="test-button"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
            <div className="modal-footer-right">
              <button className="cancel-button" onClick={onClose}>
                Cancel
              </button>
              <button className="update-button" onClick={handleSubmit}>
                {integration ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}
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
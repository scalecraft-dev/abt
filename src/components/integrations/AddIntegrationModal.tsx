import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import SnowflakeConfig from './SnowflakeConfig';
import './Integrations.css';
import { Integration, API_BASE_URL } from '../../services/api';

interface AddIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (integration: Integration) => void;
  integration?: Integration | null;
}

const AddIntegrationModal: React.FC<AddIntegrationModalProps> = ({
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

  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name,
        type: integration.type,
        description: integration.description,
        provider: integration.provider,
        status: integration.status,
        config: integration.config || {}
      });
    }
  }, [integration]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="integration-modal">
        <div className="integration-modal-header">
          <h2 className="integration-modal-title">Add Integration</h2>
        </div>

        <div className="integration-grid">
          {!selectedIntegration ? (
            <>
              <button
                onClick={() => setSelectedIntegration('snowflake')}
                className="integration-card"
              >
                <img 
                  src={`${API_BASE_URL}/icons/snowflake.svg`}
                  alt="Snowflake"
                  className="integration-icon" 
                />
                <span>Snowflake</span>
              </button>
              <button
                onClick={() => setSelectedIntegration('google-drive')}
                className="integration-card"
              >
                <img 
                  src={`${API_BASE_URL}/icons/google-drive.svg`}
                  alt="Google Drive"
                  className="integration-icon" 
                />
                <span>Google Drive</span>
              </button>
            </>
          ) : (
            <div>
              <button
                onClick={() => setSelectedIntegration(null)}
                className="integration-back-button"
              >
                <span className="mr-1">←</span> Back to integrations
              </button>
              {selectedIntegration === 'snowflake' && (
                <SnowflakeConfig 
                  formData={formData}
                  setFormData={setFormData}
                  onClose={onClose}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AddIntegrationModal; 
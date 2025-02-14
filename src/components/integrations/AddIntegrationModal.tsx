import React, { useState } from 'react';
import Modal from '../common/Modal';
import SnowflakeConfig from './SnowflakeConfig';
import './Integrations.css';

const AddIntegrationModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);

  return (
    <Modal isOpen={true} onClose={onClose}>
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
                  src="/icons/snowflake.svg" 
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
                  src="/icons/google-drive.svg" 
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
              {selectedIntegration === 'snowflake' && <SnowflakeConfig onClose={onClose} />}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AddIntegrationModal; 
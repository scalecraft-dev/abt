import React from 'react';
import { Integration } from '../../services/api';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import './IntegrationsList.css';

interface IntegrationsListProps {
  availableIntegrations: Integration[];
  configuredIntegrations: Integration[];
  onDelete: (id: string) => Promise<void>;
}

const IntegrationsList: React.FC<IntegrationsListProps> = ({ 
  configuredIntegrations, 
  onDelete 
}) => {
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this integration?')) {
      await onDelete(id);
    }
  };

  if (!configuredIntegrations || configuredIntegrations.length === 0) {
    return <div className="no-integrations">No integrations found</div>;
  }

  return (
    <div className="integrations-list">
      {configuredIntegrations.map(integration => {
        console.log('Integration provider:', integration.provider);
        return (
          <div key={integration.id} className="integration-card">
            <div className="integration-card-header">
              <div className="integration-info">
                <div className="integration-logo">
                  <img 
                    src={`/icons/${integration.provider}.svg`}
                    alt={integration.name}
                    className="integration-icon"
                    onError={(e) => console.error('Failed to load icon:', e)}
                  />
                </div>
                <div>
                  <h3>{integration.name}</h3>
                  <p>{integration.description}</p>
                  <span className="integration-type">{integration.type}</span>
                </div>
              </div>
              <div className="integration-actions">
                <button className="edit-button">
                  <PencilIcon className="h-5 w-5 mr-2" />
                  Edit
                </button>
                <button 
                  className="delete-button"
                  onClick={() => integration.id && handleDelete(integration.id)}
                >
                  <TrashIcon className="h-5 w-5 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default IntegrationsList; 
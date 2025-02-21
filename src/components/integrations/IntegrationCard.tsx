import React, { useState } from 'react';
import { Integration, API_BASE_URL, api } from '../../services/api';
import './IntegrationCard.css';

interface IntegrationCardProps {
  integration: Integration;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onEdit?: (integration: Integration) => void;
  onDelete?: (integration: Integration) => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({ 
  integration,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [iconLoaded, setIconLoaded] = useState(false);
  const isConnected = integration.status === 'active';
  const iconUrl = `${API_BASE_URL}/icons/${integration.provider}.svg`;

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this integration?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteIntegration(integration.id as string);
      onDelete?.(integration);
    } catch (error) {
      console.error('Failed to delete integration:', error);
      alert('Failed to delete integration');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="integration-card">
      <div className="integration-header">
        <img 
          src={iconUrl}
          alt={integration.name}
          className={`integration-icon ${!iconLoaded ? 'loading' : ''}`}
          onLoad={() => setIconLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
      <div className="integration-actions">
        <button
          className="edit-button"
          onClick={(e) => onEdit?.(integration)}
        >
          Edit
        </button>
        <button
          className="delete-button"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

export default IntegrationCard; 
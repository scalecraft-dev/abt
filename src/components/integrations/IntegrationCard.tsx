import React, { useState } from 'react';
import { Integration, API_BASE_URL } from '../../services/api';
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
  const [iconLoaded, setIconLoaded] = useState(false);
  const isConnected = integration.status === 'active';
  const iconUrl = `${API_BASE_URL}/icons/${integration.provider}.svg`;
  const handleEditClick = (e: React.MouseEvent, integration: Integration) => {
    onEdit?.(integration);
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
          onClick={(e) => handleEditClick(e, integration)}
        >
          Edit
        </button>
        <button
          className="delete-button"
          onClick={() => onDelete?.(integration)}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default IntegrationCard; 
import React from 'react';
import { Integration } from '../../services/api';
import './IntegrationCard.css';

interface IntegrationCardProps {
  integration: Integration;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({ 
  integration,
  onConnect,
  onDisconnect
}) => {
  const isConnected = integration.status === 'active';

  return (
    <div className="integration-card">
      <div className="integration-header">
        <img 
          src={`/icons/${integration.provider}.svg`}
          alt={integration.name}
          className="integration-icon"
        />
        <h3>{integration.name}</h3>
      </div>
      <p className="integration-description">
        {integration.description}
      </p>
      <div className="integration-status">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
        {isConnected ? 'Connected' : 'Not Connected'}
      </div>
      {(onConnect || onDisconnect) && (
        <button 
          className={`integration-button ${isConnected ? 'disconnect' : 'connect'}`}
          onClick={isConnected ? onDisconnect : onConnect}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      )}
    </div>
  );
};

export default IntegrationCard; 
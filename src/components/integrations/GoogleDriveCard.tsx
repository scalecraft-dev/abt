import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import './IntegrationCard.css';

interface GoogleDriveCardProps {
  status: 'connected' | 'disconnected';
  onConnect: () => void;
  onDisconnect: () => void;
}

const GoogleDriveCard: React.FC<GoogleDriveCardProps> = ({ status: initialStatus, onConnect, onDisconnect }) => {
  const [status, setStatus] = useState(initialStatus);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check integration status on mount
    const checkStatus = async () => {
      const currentStatus = await api.getIntegrationStatus('google-drive');
      setStatus(currentStatus);
    };
    checkStatus();
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const authUrl = await api.initiateGoogleDriveAuth();
      
      // Open popup for OAuth
      const popup = window.open(authUrl, 'Connect Google Drive', 
        'width=600,height=600,menubar=no,toolbar=no,location=no,status=no');
      
      // Poll for popup closure and check connection status
      const checkConnection = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(checkConnection);
          const newStatus = await api.getIntegrationStatus('google-drive');
          setStatus(newStatus);
          setIsConnecting(false);
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
    }
  };

  return (
    <div className="integration-card">
      <div className="integration-header">
        <img 
          src="/icons/google-drive.svg" 
          alt="Google Drive" 
          className="integration-icon"
        />
        <h3>Google Drive</h3>
      </div>
      <p className="integration-description">
        Connect to Google Drive to access documents, spreadsheets, and other files.
      </p>
      <div className="integration-status">
        <span className={`status-indicator ${status}`} />
        {status === 'connected' ? 'Connected' : 'Not Connected'}
      </div>
      <button 
        className={`integration-button ${status === 'connected' ? 'disconnect' : 'connect'}`}
        onClick={status === 'connected' ? onDisconnect : handleConnect}
        disabled={isConnecting}
      >
        {status === 'connected' ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
};

export default GoogleDriveCard; 
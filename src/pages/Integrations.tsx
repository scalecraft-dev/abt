import React, { useState, useEffect } from 'react';
import { api, Integration } from '../services/api';
import IntegrationsList from '../components/integrations/IntegrationsList';
import AddIntegrationModal from '../components/integrations/AddIntegrationModal';
import './Integrations.css';

const Integrations: React.FC = () => {
  const [isAddingIntegration, setIsAddingIntegration] = useState(false);
  const [availableIntegrations, setAvailableIntegrations] = useState<Integration[]>([]);
  const [configuredIntegrations, setConfiguredIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setIsLoading(true);
      const configured = await api.listIntegrations();
      setConfiguredIntegrations(configured || []);
    } catch (error) {
      console.error('Failed to load integrations:', error);
      setConfiguredIntegrations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIntegration = async () => {
    try {
      const available = await api.listAvailableIntegrations();
      setAvailableIntegrations(available);
      setIsAddingIntegration(true);
    } catch (error) {
      console.error('Failed to load available integrations:', error);
    }
  };

  const handleConnect = async (provider: string) => {
    if (provider === 'google-drive') {
      try {
        const authUrl = await api.initiateGoogleDriveAuth();
        window.open(authUrl, 'Connect Google Drive', 
          'width=600,height=600,menubar=no,toolbar=no,location=no,status=no');
        // Poll for connection status
        const checkInterval = setInterval(async () => {
          await loadIntegrations();
          const integration = configuredIntegrations.find(i => i.provider === provider);
          if (integration?.status === 'active') {
            clearInterval(checkInterval);
            setIsAddingIntegration(false);
          }
        }, 1000);
      } catch (error) {
        console.error('Failed to connect:', error);
      }
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    try {
      await api.deleteIntegration(id);
      await loadIntegrations();
    } catch (error) {
      console.error('Failed to delete integration:', error);
    }
  };

  return (
    <div className="integrations-page">
      <div className="integrations-header">
        <h1>Integrations</h1>
        <button
          onClick={handleAddIntegration}
          className="create-button"
        >
          Add Integration
        </button>
      </div>

      {isLoading ? (
        <div className="no-integrations">Loading...</div>
      ) : (
        <div className="integrations-list">
          <IntegrationsList
            availableIntegrations={availableIntegrations}
            configuredIntegrations={configuredIntegrations}
            onDelete={handleDeleteIntegration}
          />
        </div>
      )}

      {isAddingIntegration && (
        <AddIntegrationModal
          onClose={() => {
            setIsAddingIntegration(false);
            loadIntegrations();
          }}
        />
      )}
    </div>
  );
};

export default Integrations; 
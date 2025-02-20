import React, { useState, useEffect } from 'react';
import { api, Integration } from '../services/api';
import IntegrationsList from '../components/integrations/IntegrationsList';
import IntegrationModal from '../components/integrations/IntegrationModal';
import './Integrations.css';

const Integrations: React.FC = () => {
  const [availableIntegrations, setAvailableIntegrations] = useState<Integration[]>([]);
  const [configuredIntegrations, setConfiguredIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | undefined>(undefined);

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

  const handleAddIntegration = () => {
    setEditingIntegration(undefined);
    setModalOpen(true);
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

  const handleEdit = async (integration: Integration) => {
    try {
      // Fetch latest integration data
      const updatedIntegration = await api.getIntegration(integration.id!);
      setEditingIntegration(updatedIntegration);
      setModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch integration:', error);
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
            integrations={configuredIntegrations}
            onEdit={handleEdit}
            onAddIntegration={async (integration) => {
              await api.createIntegration({
                ...integration,
                config: integration.config || {}
              });
              loadIntegrations();
            }}
            onUpdateIntegration={async (integration) => {
              if (integration.id) {
                await api.updateIntegration(integration.id, {
                  ...integration,
                  config: integration.config || {}
                });
                loadIntegrations();
              }
            }}
          />
        </div>
      )}

      <IntegrationModal
        isOpen={modalOpen}
        integration={editingIntegration}
        onClose={() => {
          setModalOpen(false);
          setEditingIntegration(undefined);
          loadIntegrations();
        }}
        onSave={async (integration) => {
          const config = {
            ...integration,
            config: integration.config || {}
          };
          
          if (editingIntegration) {
            await api.updateIntegration(integration.id!, config);
          } else {
            await api.createIntegration(config);
          }
          loadIntegrations();
          setModalOpen(false);
          setEditingIntegration(undefined);
        }}
      />
    </div>
  );
};

export default Integrations; 
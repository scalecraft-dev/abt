import React, { useState } from 'react';
import { Integration } from '../../services/api';
import IntegrationCard from './IntegrationCard';
import AddIntegrationModal from './AddIntegrationModal';
import './IntegrationsList.css';

interface IntegrationsListProps {
  integrations: Integration[];
  onEdit: (integration: Integration) => void;
  onAddIntegration: (integration: Integration) => void;
  onUpdateIntegration: (integration: Integration) => void;
}

const IntegrationsList: React.FC<IntegrationsListProps> = ({
  integrations,
  onEdit,
  onAddIntegration,
  onUpdateIntegration
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);

  const handleEdit = (integration: Integration) => {
    setEditingIntegration(integration);
    setShowAddModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setEditingIntegration(null);
  };

  const handleSave = (integration: Integration) => {
    if (editingIntegration) {
      onUpdateIntegration(integration);
    } else {
      onAddIntegration(integration);
    }
    handleModalClose();
  };

  return (
    <div className="integrations-container">
      <div className="integrations-section">
        <h2>Connected Integrations</h2>
        <div className="integrations-grid">
          {integrations.map(integration => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onEdit={() => onEdit(integration)}
            />
          ))}
        </div>
      </div>

      <AddIntegrationModal
        isOpen={showAddModal}
        onClose={handleModalClose}
        onSave={handleSave}
        integration={editingIntegration}
      />
    </div>
  );
};

export default IntegrationsList; 
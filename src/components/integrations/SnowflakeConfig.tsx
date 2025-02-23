import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, SnowflakeConfig as SnowflakeConfigType, Integration } from '../../services/api';

interface SnowflakeConfigProps {
  formData: Integration;
  setFormData: (data: Integration) => void;
  onClose: () => void;
}

const SnowflakeConfig: React.FC<SnowflakeConfigProps> = ({ formData, setFormData, onClose }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async () => {
    setIsConnecting(true);
    try {
      if (formData.id) {
        // Update existing integration
        await api.updateIntegration(formData.id, {
          name: formData.name,
          type: formData.type,
          description: formData.description,
          provider: formData.provider,
          config: formData.config || {}
        });
        alert('Successfully updated Snowflake configuration');
      } else {
        // Create new integration
        await api.createIntegration({
          name: "Snowflake",
          type: "data-warehouse",
          description: "Snowflake data warehouse connection",
          provider: "snowflake",
          config: formData.config || {}
        });
        alert('Successfully saved Snowflake configuration');
      }
      onClose();
    } catch (error: any) {
      alert(`Failed to save connection: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      await api.testSnowflakeConnection({
        account: formData.config?.account || '',
        username: formData.config?.username || '',
        password: formData.config?.password || '',
        database: formData.config?.database || '',
        schema: formData.config?.schema || '',
        warehouse: formData.config?.warehouse || ''
      });
      alert('Connection test successful');
    } catch (error: any) {
      alert(`Test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="modal-content">
      <div className="form-group">
        <label>Account</label>
        <input
          type="text"
          value={formData.config?.account || ''}
          onChange={e => setFormData({
            ...formData,
            config: { ...formData.config, account: e.target.value }
          })}
        />
      </div>
      <div className="form-group">
        <label>Username</label>
        <input
          type="text"
          value={formData.config?.username || ''}
          onChange={e => setFormData({
            ...formData,
            config: { ...formData.config, username: e.target.value }
          })}
        />
      </div>
      <div className="form-group">
        <label>Password</label>
        <div className="integration-form-password">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.config?.password || ''}
            onChange={e => setFormData({
              ...formData,
              config: { ...formData.config, password: e.target.value }
            })}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <div className="form-group">
        <label>Database</label>
        <input
          type="text"
          value={formData.config?.database || ''}
          onChange={e => setFormData({
            ...formData,
            config: { ...formData.config, database: e.target.value }
          })}
        />
      </div>
      <div className="form-group">
        <label>Schema</label>
        <input
          type="text"
          value={formData.config?.schema || ''}
          onChange={e => setFormData({
            ...formData,
            config: { ...formData.config, schema: e.target.value }
          })}
        />
      </div>
      <div className="form-group">
        <label>Warehouse</label>
        <input
          type="text"
          value={formData.config?.warehouse || ''}
          onChange={e => setFormData({
            ...formData,
            config: { ...formData.config, warehouse: e.target.value }
          })}
        />
      </div>
      <div className="integration-form-buttons">
        <button
          type="button"
          onClick={testConnection}
          disabled={isTesting}
          className="test-button"
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isConnecting}
          className="create-button"
        >
          {isConnecting ? 'Saving...' : 'Save Connection'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="cancel-button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default SnowflakeConfig; 
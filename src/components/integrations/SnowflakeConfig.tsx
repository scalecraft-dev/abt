import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, SnowflakeConfig as SnowflakeConfigType } from '../../services/api';

interface SnowflakeConfigProps {
  onClose: () => void;
}

const SnowflakeConfig: React.FC<SnowflakeConfigProps> = ({ onClose }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<SnowflakeConfigType>();

  const onSubmit = async (data: SnowflakeConfigType) => {
    setIsConnecting(true);
    try {
      await api.createIntegration({
        name: "Snowflake",
        type: "data-warehouse",
        description: "Snowflake data warehouse connection",
        provider: "snowflake",
        config: data
      });
      alert('Successfully saved Snowflake configuration');
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
      const data = getValues();
      await api.testSnowflakeConnection(data);
      alert('Connection test successful');
    } catch (error: any) {
      alert(`Test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="integration-form">
      <div className="integration-form-group">
        <label className="integration-form-label">Account</label>
        <input
          {...register('account', { required: 'Account is required' })}
          type="text"
          placeholder="your-account.snowflakecomputing.com"
          className="integration-form-input"
        />
        {errors.account && (
          <span className="integration-form-error">{errors.account.message}</span>
        )}
      </div>

      <div className="integration-form-group">
        <label className="integration-form-label">Username</label>
        <input
          {...register('username', { required: 'Username is required' })}
          type="text"
          className="integration-form-input"
        />
        {errors.username && (
          <span className="integration-form-error">{errors.username.message}</span>
        )}
      </div>

      <div className="integration-form-group">
        <label className="integration-form-label">Password</label>
        <div className="integration-form-password">
          <input
            {...register('password', { required: 'Password is required' })}
            type={showPassword ? 'text' : 'password'}
            className="integration-form-input"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="integration-form-password-toggle"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.password && (
          <span className="integration-form-error">{errors.password.message}</span>
        )}
      </div>

      <div className="integration-form-group">
        <label className="integration-form-label">Database</label>
        <input
          {...register('database', { required: 'Database is required' })}
          type="text"
          className="integration-form-input"
        />
        {errors.database && (
          <span className="integration-form-error">{errors.database.message}</span>
        )}
      </div>

      <div className="integration-form-group">
        <label className="integration-form-label">Schema</label>
        <input
          {...register('schema', { required: 'Schema is required' })}
          type="text"
          className="integration-form-input"
        />
        {errors.schema && (
          <span className="integration-form-error">{errors.schema.message}</span>
        )}
      </div>

      <div className="integration-form-group">
        <label className="integration-form-label">Warehouse</label>
        <input
          {...register('warehouse', { required: 'Warehouse is required' })}
          type="text"
          className="integration-form-input"
        />
        {errors.warehouse && (
          <span className="integration-form-error">{errors.warehouse.message}</span>
        )}
      </div>

      <div className="integration-form-buttons">
        <button
          type="button"
          onClick={testConnection}
          disabled={isTesting}
          className="integration-form-button secondary"
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          type="submit"
          disabled={isConnecting}
          className="integration-form-button"
        >
          {isConnecting ? 'Saving...' : 'Save Connection'}
        </button>
      </div>
    </form>
  );
};

export default SnowflakeConfig; 
import React, { useState } from 'react';

const SnowflakeQuery: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const executeQuery = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/integrations/snowflake/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Query failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (error: any) {
      alert(`Query failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter your SQL query"
        className="w-full h-32 p-2 border rounded"
      />
      <button
        onClick={executeQuery}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {isLoading ? 'Executing...' : 'Execute Query'}
      </button>

      {results.length > 0 && (
        <div className="mt-4">
          <h3>Results:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SnowflakeQuery; 
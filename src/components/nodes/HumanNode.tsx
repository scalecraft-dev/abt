import React from 'react';

interface HumanNodeProps {
  data: {
    userId: string;
    task: string;
    instructions: string;
    status: 'pending' | 'in_progress' | 'completed';
  };
}

const HumanNode: React.FC<HumanNodeProps> = ({ data }) => {
  return (
    <div className="human-node">
      <h4>{data.task}</h4>
      <p>{data.instructions}</p>
      <div>Status: {data.status}</div>
    </div>
  );
};

export default HumanNode; 
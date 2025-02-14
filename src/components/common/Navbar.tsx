import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    {
      path: '/workflows',
      label: 'Workflows',
      icon: '⚡'
    },
    {
      path: '/agents',
      label: 'Agents',
      icon: '🤖'
    },
    {
      path: '/integrations',
      label: 'Integrations',
      icon: '🔌'
    },
    // ... other nav items
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span role="img" aria-label="logo" style={{ fontSize: '1.5rem' }}>⚡</span>
        <Link to="/">abt</Link>
      </div>
      <div className="navbar-menu">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`navbar-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar; 
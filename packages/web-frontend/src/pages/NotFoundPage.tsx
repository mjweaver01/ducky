import React from 'react';
import { Link } from 'react-router-dom';
import { useMetadata } from '../hooks/useMetadata';
import './NotFoundPage.css';

const NotFoundPage: React.FC = () => {
  useMetadata({
    title: '404 - Page Not Found',
    description: 'The page you are looking for could not be found.',
  });

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Page Not Found</h2>
        <p className="not-found-message">
          Sorry, the page you are looking for doesn't exist or has been moved.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            Go Home
          </Link>
          <Link to="/docs" className="btn btn-secondary">
            View Docs
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

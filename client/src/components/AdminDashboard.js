import React, { useState } from 'react';
import AdminImport from './AdminImport';
import AdminLanguagePairs from './AdminLanguagePairs';
import './AdminDashboard.css';

const AdminDashboard = ({ user, languagePairs }) => {
  const [activeTab, setActiveTab] = useState('import');

  if (!user?.isAdmin) {
    return (
      <div className="admin-container">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>Admin privileges required to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage words, language pairs, and system settings</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Word Import & Management
        </button>
        <button 
          className={`tab-button ${activeTab === 'language-pairs' ? 'active' : ''}`}
          onClick={() => setActiveTab('language-pairs')}
        >
          Language Pairs
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'import' && (
          <AdminImport languagePairs={languagePairs} />
        )}
        {activeTab === 'language-pairs' && (
          <AdminLanguagePairs user={user} />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 
import React from 'react';
import Layout from '../components/Layout';
import AIHealthMonitoringDashboard from '../components/AIHealthMonitoringDashboard';

const AIHealthMonitoringPage: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <AIHealthMonitoringDashboard />
      </div>
    </Layout>
  );
};

export default AIHealthMonitoringPage; 
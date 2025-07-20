import React from 'react';
import Layout from '../components/Layout';
import ABTestingDashboard from '../components/ABTestingDashboard';

const ABTestingPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <ABTestingDashboard />
      </div>
    </Layout>
  );
};

export default ABTestingPage; 
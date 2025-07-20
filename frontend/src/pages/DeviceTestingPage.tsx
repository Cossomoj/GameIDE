import React from 'react';
import Layout from '../components/Layout';
import DeviceTestingDashboard from '../components/DeviceTestingDashboard';

const DeviceTestingPage: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <DeviceTestingDashboard />
      </div>
    </Layout>
  );
};

export default DeviceTestingPage; 
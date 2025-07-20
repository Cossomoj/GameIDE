import React from 'react';
import Layout from '../components/Layout';
import EnhancedLocalizationDashboard from '../components/EnhancedLocalizationDashboard';

const EnhancedLocalizationPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <EnhancedLocalizationDashboard />
      </div>
    </Layout>
  );
};

export default EnhancedLocalizationPage; 
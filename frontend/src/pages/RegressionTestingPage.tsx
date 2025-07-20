import React from 'react';
import Layout from '../components/Layout';
import RegressionTestingDashboard from '../components/RegressionTestingDashboard';

const RegressionTestingPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Регрессионное тестирование
          </h1>
          <p className="text-gray-600">
            Автоматическое тестирование шаблонов для обнаружения регрессий при изменениях
          </p>
        </div>
        
        <RegressionTestingDashboard />
      </div>
    </Layout>
  );
};

export default RegressionTestingPage; 
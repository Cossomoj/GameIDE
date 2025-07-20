import React from 'react';
import { Box, Container } from '@mui/material';
import QualityMonitoringDashboard from '../components/QualityMonitoringDashboard';
import Layout from '../components/Layout';

const QualityMonitoringPage: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <QualityMonitoringDashboard />
        </Box>
      </Container>
    </Layout>
  );
};

export default QualityMonitoringPage; 
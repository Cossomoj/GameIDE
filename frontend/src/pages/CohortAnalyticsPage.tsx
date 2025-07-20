import React from 'react';
import { Box, Container } from '@mui/material';
import CohortAnalyticsDashboard from '../components/CohortAnalyticsDashboard';
import Layout from '../components/Layout';

const CohortAnalyticsPage: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <CohortAnalyticsDashboard />
        </Box>
      </Container>
    </Layout>
  );
};

export default CohortAnalyticsPage; 
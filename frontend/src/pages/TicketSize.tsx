import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Typography,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { ticketSizeApi } from '../api';
import type { TicketSizeBand } from '../api/types';

const TicketSize: React.FC = () => {
  const [financialYear, setFinancialYear] = useState('FY24-25');
  const [dimension, setDimension] = useState<'Products' | 'Customers'>('Customers');
  const [data, setData] = useState<TicketSizeBand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await ticketSizeApi.getBands(financialYear, dimension);
        setData(result);
      } catch (error) {
        console.error('Error fetching ticket size:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [financialYear, dimension]);

  const countData = useMemo(() => {
    const filtered = data.filter(item => item.metric === 'Count');
    return {
      bands: filtered.map(item => item.band),
      values: filtered.map(item => item.value),
      labels: filtered.map(item => item.plot_label),
    };
  }, [data]);

  const revenueData = useMemo(() => {
    const filtered = data.filter(item => item.metric === 'Revenue');
    return {
      bands: filtered.map(item => item.band),
      values: filtered.map(item => item.value / 1e7), // Convert to Crores
      labels: filtered.map(item => item.plot_label),
    };
  }, [data]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" height="100%" p={2.5}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Revenue Ticket Size Analysis
      </Typography>

      {/* Filter Section */}
      <Box 
        sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 3, 
          pb: 2, 
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}
      >
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Financial Year</InputLabel>
          <Select
            value={financialYear}
            label="Financial Year"
            onChange={(e) => setFinancialYear(e.target.value)}
          >
            <MenuItem value="FY23-24">FY23-24</MenuItem>
            <MenuItem value="FY24-25">FY24-25</MenuItem>
            <MenuItem value="FY25-26">FY25-26</MenuItem>
          </Select>
        </FormControl>

        <ToggleButtonGroup
          value={dimension}
          exclusive
          onChange={(_, value) => value && setDimension(value)}
          size="small"
        >
          <ToggleButton value="Customers">Customers</ToggleButton>
          <ToggleButton value="Products">Products</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Charts Section */}
      <Box display="flex" gap={2} flex={1} minHeight={0}>
        {/* Count Chart */}
        <Box flex={1} display="flex" flexDirection="column" minWidth={0}>
          <Typography variant="h6" gutterBottom>
            Number of {dimension}
          </Typography>
          <Box flex={1} minHeight={0}>
            <BarChart
              xAxis={[{ scaleType: 'band', data: countData.bands }]}
              series={[
                {
                  data: countData.values,
                  label: 'Count',
                  color: '#3498db',
                  valueFormatter: (value, { dataIndex }) => 
                    countData.labels[dataIndex] || value?.toString() || '0',
                },
              ]}
              margin={{ top: 50, right: 30, bottom: 50, left: 70 }}
              grid={{ vertical: false, horizontal: true }}
              barLabel="value"
              slotProps={{
                barLabel: {
                  style: {
                    fill: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 600,
                  },
                },
              }}
            />
          </Box>
        </Box>

        {/* Revenue Chart */}
        <Box flex={1} display="flex" flexDirection="column" minWidth={0}>
          <Typography variant="h6" gutterBottom>
            Total Revenue
          </Typography>
          <Box flex={1} minHeight={0}>
            <BarChart
              xAxis={[{ scaleType: 'band', data: revenueData.bands }]}
              series={[
                {
                  data: revenueData.values,
                  label: 'Revenue (CR)',
                  color: '#2ecc71',
                  valueFormatter: (value, { dataIndex }) => 
                    revenueData.labels[dataIndex] || `₹${value?.toFixed(1)} CR`,
                },
              ]}
              margin={{ top: 50, right: 30, bottom: 50, left: 70 }}
              grid={{ vertical: false, horizontal: true }}
              barLabel={(item) => `₹${item.value?.toFixed(1)}`}
              slotProps={{
                barLabel: {
                  style: {
                    fill: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 600,
                  },
                },
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TicketSize;

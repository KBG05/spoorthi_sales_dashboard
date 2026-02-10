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
import type { AxisValueFormatterContext } from '@mui/x-charts/internals';
import { useTheme } from '@mui/material/styles';
import { ticketSizeApi } from '../api';
import type { TicketSizeBand } from '../api/types';
import { ABC_COLORS } from '../constants/constants';

const TicketSize: React.FC = () => {
  const theme = useTheme();
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

  // Approximate total revenue in Crores

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
              yAxis={[{
                width: 70,
                min: 0,
                tickMinStep: (() => {
                  if (countData.values.length === 0) return 1;
                  const maxVal = Math.max(...countData.values);
                  const range = maxVal;
                  if (range < 10) return 1;
                  if (range < 50) return 5;
                  if (range < 100) return 10;
                  if (range < 500) return 50;
                  return Math.ceil(range / 5 / 100) * 100;
                })(),
              }]}
              series={[
                {
                  data: countData.values,
                  label: 'Count',
                  color: ABC_COLORS.Overall,
                  valueFormatter: (value, { dataIndex }) => 
                    countData.labels[dataIndex] || value?.toString() || '0',
                },
              ]}
              margin={{ top: 50, right: 30, bottom: 50, left: 80 }}
              grid={{ vertical: false, horizontal: true }}
              barLabel="value"
              slotProps={{
                barLabel: {
                  placement: 'outside',
                  style: {
                    fill: theme.palette.mode === 'dark' ? '#fff' : '#000',
                    fontWeight: 600,
                    fontSize: 14,
                    transform: 'translateY(-8px)',
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
              yAxis={[{
                width: 70,
                valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                  if (context.location === 'tick') {
                    // Short format for tick labels
                    return `₹${value.toFixed(0)}`;
                  }
                  // Full format for tooltips
                  return `₹${value.toFixed(2)}Cr`;
                },
                min: 0,
                tickMinStep: (() => {
                  if (revenueData.values.length === 0) return 1;
                  const maxVal = Math.max(...revenueData.values);
                  const range = maxVal;
                  if (range < 10) return 1;
                  if (range < 50) return 5;
                  if (range < 100) return 10;
                  if (range < 500) return 50;
                  return Math.ceil(range / 5 / 100) * 100;
                })(),
              }]}
              series={[
                {
                  data: revenueData.values,
                  label: 'Revenue (CR)',
                  color: ABC_COLORS.A,
                  valueFormatter: (value, { dataIndex }) => 
                    revenueData.labels[dataIndex] || `₹${value?.toFixed(2)}Cr`,
                },
              ]}
              margin={{ top: 50, right: 30, bottom: 50, left: 100 }}
              barLabel={(item) => `₹${item.value?.toFixed(1)}Cr`}
              slotProps={{
                barLabel: {
                  placement: 'outside',
                  
                  style: {
                    fill: theme.palette.mode === 'dark' ? '#fff' : '#000',
                    fontWeight: 600,
                    fontSize: 14,
                    transform: 'translateY(-8px)',
                  },
                },
              }}
              grid={{ vertical: false, horizontal: true }}
              
              // slotProps={{
              //   barLabel: {
              //     style: {
              //       fill: '#ffffff',
              //       fontSize: 11,
              //       fontWeight: 600,
              //     },

              //   },

              // }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TicketSize;

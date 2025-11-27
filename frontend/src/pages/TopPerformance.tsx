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
import { topPerformanceApi } from '../api';
import type { TopPerformersResponse } from '../api/types';

const TopPerformance: React.FC = () => {
  const theme = useTheme();
  const [financialYear, setFinancialYear] = useState('FY24-25');
  const [entityType, setEntityType] = useState<'Customers' | 'Products'>('Customers');
  const [data, setData] = useState<TopPerformersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await topPerformanceApi.getTopPerformers(entityType, financialYear);
        setData(result);
      } catch (error) {
        console.error('Error fetching top performance:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [financialYear, entityType]);

  const fyChartData = useMemo(() => {
    if (!data?.top_fy) return { ids: [], revenues: [] };
    return {
      ids: data.top_fy.map(item => `${entityType === 'Customers' ? 'C' : 'P'}${item.id}`),
      revenues: data.top_fy.map(item => item.revenue / 1_000_000),
    };
  }, [data, entityType]);

  const latestChartData = useMemo(() => {
    if (!data?.top_latest) return { ids: [], revenues: [] };
    return {
      ids: data.top_latest.map(item => `${entityType === 'Customers' ? 'C' : 'P'}${item.id}`),
      revenues: data.top_latest.map(item => item.revenue / 1_000_000),
    };
  }, [data, entityType]);

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
        Top Performers
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
          value={entityType}
          exclusive
          onChange={(_, value) => value && setEntityType(value)}
          size="small"
        >
          <ToggleButton value="Customers">Customers</ToggleButton>
          <ToggleButton value="Products">Products</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Charts Section */}
      <Box display="flex" gap={2} flex={1} minHeight={0}>
        <Box flex={1} display="flex" flexDirection="column" minWidth={0}>
          <Typography variant="h6" gutterBottom>
            Top 10 {entityType} - {financialYear}
          </Typography>
          <Box flex={1} minHeight={0}>
            <BarChart
              xAxis={[{ scaleType: 'band', data: fyChartData.ids }]}
              yAxis={[{ 
                valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                  if (context.location === 'tick') {
                    // Short format for tick labels
                    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                    return `₹${value.toFixed(0)}`;
                  }
                  // Full format for tooltips
                  return `₹${value.toFixed(2)}M`;
                },
                min: 0,
                tickMinStep: (() => {
                  // Calculate dynamic tick step based on data range
                  if (fyChartData.revenues.length === 0) return 1;
                  const maxVal = Math.max(...fyChartData.revenues);
                  const minVal = Math.min(...fyChartData.revenues);
                  const range = maxVal - minVal;
                  
                  // Adaptive step to prevent duplicate ticks
                  if (range < 5) return 1;
                  if (range < 20) return 5;
                  if (range < 100) return 10;
                  if (range < 500) return 50;
                  return Math.ceil(range / 5 / 100) * 100;
                })(),
              }]}
              series={[
                {
                  data: fyChartData.revenues,
                  label: 'Revenue (M)',
                  color: '#9b59b6',
                  valueFormatter: (value) => `₹${value?.toFixed(2)}M`,
                },
              ]}
              margin={{ top: 50, right: 30, bottom: 50, left: 100 }}
              grid={{ vertical: false, horizontal: true }}
              barLabel={(item) => `₹${item.value?.toFixed(1)}M`}
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

        <Box flex={1} display="flex" flexDirection="column" minWidth={0}>
          <Typography variant="h6" gutterBottom>
            Top 10 {entityType} - Latest Month
          </Typography>
          <Box flex={1} minHeight={0}>
            <BarChart
              xAxis={[{ scaleType: 'band', data: latestChartData.ids }]}
              yAxis={[{ 
                valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                  if (context.location === 'tick') {
                    // Short format for tick labels
                    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                    return `₹${value.toFixed(0)}`;
                  }
                  // Full format for tooltips
                  return `₹${value.toFixed(2)}M`;
                },
                min: 0,
                tickMinStep: (() => {
                  // Calculate dynamic tick step based on data range
                  if (latestChartData.revenues.length === 0) return 1;
                  const maxVal = Math.max(...latestChartData.revenues);
                  const minVal = Math.min(...latestChartData.revenues);
                  const range = maxVal - minVal;
                  
                  // Adaptive step to prevent duplicate ticks
                  if (range < 5) return 1;
                  if (range < 20) return 5;
                  if (range < 100) return 10;
                  if (range < 500) return 50;
                  return Math.ceil(range / 5 / 100) * 100;
                })(),
              }]}
              series={[
                {
                  data: latestChartData.revenues,
                  label: 'Revenue (M)',
                  color: '#16a085',
                  valueFormatter: (value) => `₹${value?.toFixed(2)}M`,
                },
              ]}
              margin={{ top: 50, right: 30, bottom: 50, left: 100 }}
              grid={{ vertical: false, horizontal: true }}
              barLabel={(item) => `₹${item.value?.toFixed(1)}M`}
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
      </Box>
    </Box>
  );
};

export default TopPerformance;

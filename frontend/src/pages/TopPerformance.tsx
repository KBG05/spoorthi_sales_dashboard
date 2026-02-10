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
import { TOP_PERFORMER_COLORS } from '../constants/constants';

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
    if (!data?.top_fy) return { labels: [], revenues: [] };
    return {
      labels: data.top_fy.map(item => 
        item.name || `${entityType === 'Customers' ? 'Customer' : 'Product'} ${item.id}`
      ),
      revenues: data.top_fy.map(item => item.revenue / 10_000_000), // Convert to Crores
    };
  }, [data, entityType]);

  const latestChartData = useMemo(() => {
    if (!data?.top_latest) return { labels: [], revenues: [] };
    return {
      labels: data.top_latest.map(item => 
        item.name || `${entityType === 'Customers' ? 'Customer' : 'Product'} ${item.id}`
      ),
      revenues: data.top_latest.map(item => item.revenue / 10_000_000), // Convert to Crores
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

      {/* Charts Section - Horizontal Bar Charts */}
      <Box display="flex" gap={2} flex={1} minHeight={0} flexDirection="column">
        <Box flex={1} display="flex" flexDirection="column" minWidth={0}>
          <Typography variant="h6" gutterBottom>
            Top 10 {entityType} - {financialYear}
          </Typography>
          <Box flex={1} minHeight={400}>
            <BarChart
              layout="horizontal"
              yAxis={[{ 
                scaleType: 'band', 
                data: fyChartData.labels, 
                tickLabelStyle: { fontSize: 12 },
                width: 200
              }]}
              xAxis={[{ 
                valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                  if (context.location === 'tick') {
                    if (value >= 100) return `₹${value.toFixed(0)}Cr`;
                    if (value >= 10) return `₹${value.toFixed(1)}Cr`;
                    return `₹${value.toFixed(2)}Cr`;
                  }
                  return `₹${value.toFixed(2)} Cr`;
                },
                min: 0,
              }]}
              series={[
                {
                  data: fyChartData.revenues,
                  label: 'Revenue of Articles (Cr)',
                  color: TOP_PERFORMER_COLORS.fy,
                  valueFormatter: (value) => `₹${value?.toFixed(2)} Cr`,
                },
              ]}
              margin={{ top: 20, right: 80, bottom: 40, left: 150 }}
              grid={{ vertical: true, horizontal: false }}
              barLabel={(item) => `₹${item.value?.toFixed(2)} Cr`}
              slotProps={{
                barLabel: {
                  style: {
                    fill: theme.palette.mode === 'dark' ? '#fff' : '#000',
                    fontWeight: 600,
                    fontSize: 12,
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
          <Box flex={1} minHeight={400}>
            <BarChart
              layout="horizontal"
              yAxis={[{ 
                scaleType: 'band', 
                data: latestChartData.labels, 
                tickLabelStyle: { fontSize: 12 },
                width: 200
              }]}
              xAxis={[{ 
                valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                  if (context.location === 'tick') {
                    if (value >= 100) return `₹${value.toFixed(0)}Cr`;
                    if (value >= 10) return `₹${value.toFixed(1)}Cr`;
                    return `₹${value.toFixed(2)}Cr`;
                  }
                  return `₹${value.toFixed(2)} Cr`;
                },
                min: 0,
              }]}
              series={[
                {
                  data: latestChartData.revenues,
                  label: 'Revenue of Articles (Cr)',
                  color: TOP_PERFORMER_COLORS.latest,
                  valueFormatter: (value) => `₹${value?.toFixed(2)} Cr`,
                },
              ]}
              margin={{ top: 20, right: 80, bottom: 40, left: 150 }}
              grid={{ vertical: true, horizontal: false }}
              barLabel={(item) => `₹${item.value?.toFixed(2)} Cr`}
              slotProps={{
                barLabel: {
                  style: {
                    fill: theme.palette.mode === 'dark' ? '#fff' : '#000',
                    fontWeight: 600,
                    fontSize: 12,
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

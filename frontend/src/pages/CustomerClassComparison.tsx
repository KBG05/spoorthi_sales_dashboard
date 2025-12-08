import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
  FormGroup,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import type { AxisValueFormatterContext } from '@mui/x-charts/internals';
import { customerClassComparisonApi } from '../api';
import type { CustomerListItem, ClassComparisonDataPoint } from '../api/types';

const ABC_CLASSES = ['A', 'B', 'C'];

// Neon/glowing color palette matching CustomerBehaviour
const NEON_COLORS = {
  customer1Overall: '#ff006e',
  customer1Product: '#00ffff',
  customer2Overall: '#ff00ff',
  customer2Product: '#ff8800',
};

const getColorForFY = (fy: string, fyList: string[], type: 'class' | 'customer') => {
  const fyIndex = fyList.indexOf(fy);
  const baseColors = {
    class: [NEON_COLORS.customer1Overall, NEON_COLORS.customer1Product, NEON_COLORS.customer2Overall, NEON_COLORS.customer2Product],
    customer: [NEON_COLORS.customer2Overall, NEON_COLORS.customer2Product, NEON_COLORS.customer1Overall, NEON_COLORS.customer1Product],
  };
  return baseColors[type][fyIndex % baseColors[type].length];
};

const CustomerClassComparison = () => {
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('A');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | ''>('');
  const [metric, setMetric] = useState<'Revenue' | 'Quantity'>('Revenue');
  const [showLabels, setShowLabels] = useState(true);
  
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [trendData, setTrendData] = useState<ClassComparisonDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const response = await customerClassComparisonApi.getAvailableYears();
        setAvailableYears(response.financial_years);
        setSelectedYears(response.financial_years.slice(0, 1));
      } catch (err) {
        console.error('Error fetching available years:', err);
        setError('Failed to load available financial years');
      }
    };
    fetchYears();
  }, []);

  useEffect(() => {
    if (selectedYears.length === 0) return;
    const fetchCustomers = async () => {
      setError(null);
      try {
        const result = await customerClassComparisonApi.getCustomers(selectedClass, selectedYears.join(','));
        setCustomers(result);
      } catch (err) {
        console.error('Error fetching customers:', err);
        setError('Failed to load customers');
      }
    };
    fetchCustomers();
  }, [selectedClass, selectedYears]);

  useEffect(() => {
    if (!selectedCustomer || selectedYears.length === 0) {
      setTrendData([]);
      return;
    }
    const fetchTrend = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await customerClassComparisonApi.getTrend(selectedClass, selectedCustomer, selectedYears.join(','), metric);
        setTrendData(result);
      } catch (err) {
        console.error('Error fetching trend data:', err);
        setError('Failed to load trend data');
      } finally {
        setLoading(false);
      }
    };
    fetchTrend();
  }, [selectedCustomer, selectedClass, selectedYears, metric]);

  const chartData = useMemo(() => {
    if (trendData.length === 0) return { months: [], data: [] };
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fyMonthOrder = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const fyGroups = trendData.reduce((acc, point) => {
      if (!acc[point.financial_year]) acc[point.financial_year] = [];
      acc[point.financial_year].push(point);
      return acc;
    }, {} as Record<string, ClassComparisonDataPoint[]>);
    const allData: Array<{ month: string; type: string; value: number }> = [];
    for (const fy of selectedYears) {
      if (!fyGroups[fy]) continue;
      const dataByMonth = fyGroups[fy].reduce((acc, point) => {
        const [, month] = point.month.split('-');
        acc[monthNames[parseInt(month) - 1]] = point;
        return acc;
      }, {} as Record<string, ClassComparisonDataPoint>);
      fyMonthOrder.forEach(monthName => {
        const point = dataByMonth[monthName];
        allData.push({ month: monthName, type: `Class ${selectedClass} Total (${fy})`, value: point ? point.class_total : 0 });
        allData.push({ month: monthName, type: `Customer ${selectedCustomer} (${fy})`, value: point ? point.customer_value : 0 });
      });
    }
    return { months: fyMonthOrder, data: allData };
  }, [trendData, selectedYears, selectedClass, selectedCustomer, showLabels]);

  return (
    <Box display="flex" flexDirection="column" height="100%" p={2.5}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Customer Class Comparison</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>ABC Class</InputLabel>
          <Select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedCustomer(''); }} label="ABC Class" size="small">
            {ABC_CLASSES.map((cls) => (<MenuItem key={cls} value={cls}>Class {cls}</MenuItem>))}
          </Select>
        </FormControl>
        <FormControl component="fieldset" sx={{ minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>Financial Years</Typography>
          <FormGroup row>
            {availableYears.map((year) => (
              <FormControlLabel key={year} control={<Checkbox checked={selectedYears.includes(year)} onChange={() => {
                setSelectedYears((prev) => {
                  if (prev.includes(year)) return prev.length === 1 ? prev : prev.filter((y) => y !== year);
                  return [...prev, year].sort((a, b) => b.localeCompare(a));
                });
              }} size="small" />} label={year} />
            ))}
          </FormGroup>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }} disabled={loading || customers.length === 0}>
          <InputLabel>Customer</InputLabel>
          <Select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value as number | '')} label="Customer" size="small">
            <MenuItem value=""><em>Select a customer</em></MenuItem>
            {customers.map((customer) => (<MenuItem key={customer.customer_id} value={customer.customer_id}>Customer {customer.customer_id}</MenuItem>))}
          </Select>
        </FormControl>
        <ToggleButtonGroup value={metric} exclusive onChange={(_, val) => val && setMetric(val)} size="small">
          <ToggleButton value="Revenue">Revenue</ToggleButton>
          <ToggleButton value="Quantity">Quantity</ToggleButton>
        </ToggleButtonGroup>
        <FormControlLabel control={<Checkbox checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} size="small" />} label="Show Labels" />
      </Box>
      {error && (<Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>)}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}><CircularProgress /></Box>
      ) : !selectedCustomer ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}><Typography color="text.secondary">Select a customer to view comparison</Typography></Box>
      ) : chartData.data.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}><Typography color="text.secondary">No data available</Typography></Box>
      ) : (
        <Box flex={1} minHeight={0} sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, p: 2 }}>
          <LineChart
            xAxis={[{ scaleType: 'band', data: chartData.months }]}
            yAxis={[
              {
                id: 'classAxis',
                scaleType: 'linear',
                position: 'left',
                label: metric === 'Revenue' ? 'Class Total (M)' : 'Class Total',
                valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                  if (context.location === 'tick') {
                    if (metric === 'Revenue') {
                      // Keep format short and consistent
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}B`;
                      if (value >= 10) return `${value.toFixed(0)}M`;
                      return `${value.toFixed(1)}M`;
                    }
                    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return `${value.toFixed(0)}`;
                  }
                  return metric === 'Revenue' ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}M` : value.toLocaleString('en-IN');
                },
                min: 0,
                tickLabelStyle: { 
                  fontSize: 11,
                  textAnchor: 'end',
                },
              },
              {
                id: 'customerAxis',
                scaleType: 'linear',
                position: 'right',
                label: metric === 'Revenue' ? 'Customer (M)' : 'Customer',
                valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                  if (context.location === 'tick') {
                    if (metric === 'Revenue') {
                      // Keep format short - max 4 chars including unit
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}B`;
                      if (value >= 10) return `${value.toFixed(0)}M`;
                      if (value >= 1) return `${value.toFixed(1)}M`;
                      return `${value.toFixed(1)}M`;
                    }
                    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return `${value.toFixed(0)}`;
                  }
                  return metric === 'Revenue' ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}M` : value.toLocaleString('en-IN');
                },
                min: 0,
                tickLabelStyle: { 
                  fontSize: 11,
                  textAnchor: 'start',
                },
              },
            ]}
            series={(() => {
              const types = [...new Set(chartData.data.map(d => d.type))];
              return types.map((type) => {
                const isClassTotal = type.includes('Class');
                return {
                  data: chartData.data.filter(d => d.type === type).map(d => d.value),
                  label: type,
                  curve: 'linear' as const,
                  showMark: showLabels,
                  yAxisId: isClassTotal ? 'classAxis' : 'customerAxis',
                  color: getColorForFY(type.match(/\(([^)]+)\)/)?.[1] || '', selectedYears, isClassTotal ? 'class' : 'customer'),
                  strokeWidth: isClassTotal ? 2 : 1.5,
                  valueFormatter: (value: number | null) => value ? (metric === 'Revenue' ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}M` : value.toLocaleString('en-IN')) : '',
                };
              });
            })()}
            margin={{ top: 20, right: 100, bottom: 50, left: 100 }}
            grid={{ vertical: false, horizontal: true }}
            slotProps={{ legend: { direction: "horizontal", position: { vertical: 'top', horizontal: "center" } } }}
            hideLegend={chartData.data.length > 50}
          />
        </Box>
      )}
    </Box>
  );
};

export default CustomerClassComparison;

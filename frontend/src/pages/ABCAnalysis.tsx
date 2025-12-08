import { useEffect, useState, useMemo, memo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  FormGroup,
  FormControlLabel,
  Checkbox,
  FormLabel,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import type { AxisValueFormatterContext } from '@mui/x-charts/internals';
import { ABC_COLORS } from '../constants/constants';
import { abcApi } from '../api';
import type { ABCTrendResponse } from '../api/types';

// Memoized chart component to prevent re-renders
const TrendChart = memo(({ 
  chartConfig, 
  metric 
}: { 
  chartConfig: { formattedDates: string[], chartSeries: any[] }, 
  metric: 'Revenue' | 'Quantity' 
}) => {
  if (chartConfig.chartSeries.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Typography color="text.secondary">No data available for selected filters</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', flex: 1, minHeight: 0 }}>
      <LineChart
        xAxis={[{
          scaleType: 'point',
          data: chartConfig.formattedDates,
          valueFormatter: (value: string, context: AxisValueFormatterContext) => {
            if (context.location === 'tick') {
              // Short format for tick labels - just month abbreviation
              return value.split(' ')[0]; // "Jan" from "Jan 2024"
            }
            // Full format for tooltips
            return value;
          },
        }]}
        yAxis={[{
          valueFormatter: (value: number, context: AxisValueFormatterContext) => {
            if (context.location === 'tick') {
              // Short format for tick labels with M suffix for Revenue
              if (metric === 'Revenue') {
                return `${value.toFixed(1)}M`;
              }
              // For quantity, use K for thousands
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value.toLocaleString();
            }
            // Full format for tooltips
            if (metric === 'Revenue') {
              return `₹${value.toFixed(2)}M`;
            }
            return value.toLocaleString();
          },
          min: 0,
          tickMinStep: (() => {
            // Calculate dynamic tick step based on data range
            const allValues = chartConfig.chartSeries.flatMap(series => series.data || []);
            if (allValues.length === 0) return 1;
            const maxVal = Math.max(...allValues);
            const minVal = Math.min(...allValues);
            const range = maxVal - minVal;
            
            if (range < 10) return 1;
            if (range < 50) return 5;
            if (range < 100) return 10;
            if (range < 500) return 50;
            if (range < 1000) return 100;
            return Math.ceil(range / 5 / 100) * 100;
          })(),
        }]}
        series={chartConfig.chartSeries}
        margin={{ top: 20, bottom: 50, left: 100, right: 30 }}
        grid={{ vertical: false, horizontal: true }}
        slotProps={{
          mark: {
            style: { strokeWidth: 2 },
          },
        }}
        sx={{
          width: '100%',
          height: '100%',
          '& .MuiChartsTooltip-mark': {
            ry: 4,
            rx: 4,
          },
        }}
      />
    </Box>
  );
});

const ABCAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<ABCTrendResponse | null>(null);
  
  // Filters
  const [financialYear, setFinancialYear] = useState('FY24-25');
  const [abcCategories, setAbcCategories] = useState<string[]>(['A', 'B', 'C']);
  const [xyzCategories, setXyzCategories] = useState<string[]>(['X', 'Y', 'Z']);
  const [metric, setMetric] = useState<'Revenue' | 'Quantity'>('Revenue');

  // Handle checkbox changes
  const handleAbcChange = (category: string) => {
    setAbcCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleXyzChange = (category: string) => {
    setXyzCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const abcString = abcCategories.join(',');
        const xyzString = xyzCategories.join(',');
        const response = await abcApi.getTrend(financialYear, abcString, xyzString, metric);
        setTrendData(response.data);
      } catch (error) {
        console.error('Error fetching ABC trend data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (abcCategories.length > 0 && xyzCategories.length > 0) {
      fetchData();
    }
  }, [financialYear, abcCategories, xyzCategories, metric]);

  // Memoize chart configuration - MUST be before any conditional returns
  const chartConfig = useMemo(() => {
    if (!trendData || !trendData.data || trendData.data.length === 0) {
      return { formattedDates: [], chartSeries: [] };
    }

    // Group data by ABC category for the chart
    const uniqueDates = [...new Set(trendData.data.map(d => d.month_date))].sort();
    
    // Get categories that actually have data
    const availableCategories = [...new Set(trendData.data.map(d => d.abc_category))];
    
    // Format dates for display
    const formattedDates = uniqueDates.map(date => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    
    // Prepare series for line chart - only include categories with data
    // Sort to ensure Overall is drawn first (behind other lines)
    const chartSeries = availableCategories
      .filter(cat => ['A', 'B', 'C', 'Overall'].includes(cat))
      .sort((a, b) => {
        if (a === 'Overall') return -1;
        if (b === 'Overall') return 1;
        return a.localeCompare(b);
      })
      .map(cat => {
        const categoryData = trendData.data.filter(d => d.abc_category === cat);
        
        return {
          type: 'line' as const,
          id: `series-${cat}`,
          label: cat,
          data: uniqueDates.map(date => {
            const point = categoryData.find(d => d.month_date === date);
            return point?.value !== undefined && point?.value !== null ? point.value : null;
          }),
          color: cat === 'A' ? ABC_COLORS.A : cat === 'B' ? ABC_COLORS.B : cat === 'C' ? ABC_COLORS.C : ABC_COLORS.Overall,
          curve: 'linear' as const,
          showMark: true,
          valueFormatter: (value: number | null) => {
            if (value === null || value === undefined) return '';
            if (metric === 'Revenue') {
              // Check if value is already in millions (< 1000) or needs conversion
              const displayValue = value > 1000 ? value / 1000000 : value;
              return `${displayValue.toFixed(2)}M`;
            }
            return value.toLocaleString();
          },
        };
      });

    return { formattedDates, chartSeries };
  }, [trendData, metric]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Early return if no data
  if (!trendData || !trendData.data || trendData.data.length === 0) {
    return (
      <Box sx={{ width: '100%', boxSizing: 'border-box' }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          ABC Analysis
        </Typography>
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography color="text.secondary">No data available for selected filters</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        ABC Analysis
      </Typography>

      {/* Filters */}
      <Paper elevation={1} sx={{ p: 2.5, mb: 2, width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
          Filters
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Financial Year */}
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Financial Year</InputLabel>
            <Select
              value={financialYear}
              label="Financial Year"
              onChange={(e: SelectChangeEvent) => setFinancialYear(e.target.value)}
              size="small"
            >
              <MenuItem value="FY23-24">FY23-24</MenuItem>
              <MenuItem value="FY24-25">FY24-25</MenuItem>
              <MenuItem value="FY25-26">FY25-26</MenuItem>
            </Select>
          </FormControl>

          {/* ABC Categories */}
          <Box>
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
              ABC Categories
            </FormLabel>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={abcCategories.includes('A')}
                    onChange={() => handleAbcChange('A')}
                    size="small"
                  />
                }
                label="A"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={abcCategories.includes('B')}
                    onChange={() => handleAbcChange('B')}
                    size="small"
                  />
                }
                label="B"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={abcCategories.includes('C')}
                    onChange={() => handleAbcChange('C')}
                    size="small"
                  />
                }
                label="C"
              />
            </FormGroup>
          </Box>

          {/* XYZ Categories */}
          <Box>
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
              XYZ Categories
            </FormLabel>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={xyzCategories.includes('X')}
                    onChange={() => handleXyzChange('X')}
                    size="small"
                  />
                }
                label="X"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={xyzCategories.includes('Y')}
                    onChange={() => handleXyzChange('Y')}
                    size="small"
                  />
                }
                label="Y"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={xyzCategories.includes('Z')}
                    onChange={() => handleXyzChange('Z')}
                    size="small"
                  />
                }
                label="Z"
              />
            </FormGroup>
          </Box>

          {/* Metric Toggle */}
          <Box>
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
              Metric
            </FormLabel>
            <ToggleButtonGroup
              value={metric}
              exclusive
              onChange={(_, newMetric) => newMetric && setMetric(newMetric)}
              size="small"
            >
              <ToggleButton value="Revenue" sx={{ px: 2.5 }}>Revenue</ToggleButton>
              <ToggleButton value="Quantity" sx={{ px: 2.5 }}>Quantity</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Paper>

      {/* Trend Chart */}
      <Paper elevation={1} sx={{ p: 2.5, flex: 1, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1, flexShrink: 0 }}>
          {metric} Trend by ABC Category
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, flexShrink: 0 }}>
          {metric === 'Revenue' ? 'Values in millions (M)' : 'Article quantities'}
        </Typography>
        
        {trendData && trendData.data.length > 0 ? (
          <TrendChart chartConfig={chartConfig} metric={metric} />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <Typography color="text.secondary">No data available for selected filters</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ABCAnalysis;

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
  Tabs,
  Tab,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import type { AxisValueFormatterContext } from '@mui/x-charts/internals';
import { ABC_COLORS } from '../constants/constants';
import { abcApi, customerTrendApi } from '../api';
import type { ABCTrendResponse, CustomerTrendDataPoint } from '../api/types';

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`trend-tabpanel-${index}`}
      aria-labelledby={`trend-tab-${index}`}
      sx={{ flex: 1, display: value === index ? 'flex' : 'none', flexDirection: 'column', minHeight: 0 }}
      {...other}
    >
      {value === index && children}
    </Box>
  );
}

// Memoized chart component for ABC Analysis
const ABCTrendChart = memo(({ 
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
              return value.split(' ')[0];
            }
            return value;
          },
        }]}
        yAxis={[{
          width: 80,
          valueFormatter: (value: number, context: AxisValueFormatterContext) => {
            if (context.location === 'tick') {
              if (metric === 'Revenue') {
                const crValue = value / 10;
                if (crValue >= 100) return `₹${crValue.toFixed(0)}Cr`;
                if (crValue >= 1) return `₹${crValue.toFixed(1)}Cr`;
                return `₹${crValue.toFixed(2)}Cr`;
              }
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value.toLocaleString();
            }
            if (metric === 'Revenue') {
              const crValue = value / 10;
              return `₹${crValue.toFixed(2)} Cr`;
            }
            return value.toLocaleString();
          },
          min: 0,
          tickMinStep: (() => {
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
        margin={{ top: 20, bottom: 20, left: 0, right: 30 }}
        grid={{ vertical: false, horizontal: true }}
        slotProps={{
          mark: { style: { strokeWidth: 2 } },
        }}
        sx={{
          width: '100%',
          height: '100%',
          '& .MuiChartsTooltip-mark': { ry: 4, rx: 4 },
        }}
      />
    </Box>
  );
});

// Memoized chart component for Customer Trend
const CustomerTrendChart = memo(({ 
  chartConfig, 
  metric 
}: { 
  chartConfig: { monthLabels: string[], chartSeries: any[] }, 
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
          data: chartConfig.monthLabels,
          valueFormatter: (value: string, context: AxisValueFormatterContext) => {
            if (context.location === 'tick') {
              return value.split(' ')[0];
            }
            return value;
          },
        }]}
        yAxis={[{
          width: 80,
          valueFormatter: (value: number, context: AxisValueFormatterContext) => {
            if (context.location === 'tick') {
              if (metric === 'Revenue') {
                const crValue = value / 10000000;
                if (crValue >= 100) return `₹${crValue.toFixed(0)}Cr`;
                if (crValue >= 1) return `₹${crValue.toFixed(1)}Cr`;
                return `₹${crValue.toFixed(2)}Cr`;
              }
              if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value.toFixed(0);
            }
            if (metric === 'Revenue') {
              const crValue = value / 10000000;
              return `₹${crValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
            }
            return value.toLocaleString('en-IN');
          },
          min: 0,
          tickMinStep: (() => {
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
            if (range < 10000) return 1000;
            return Math.ceil(range / 5 / 1000) * 1000;
          })(),
        }]}
        series={chartConfig.chartSeries}
        margin={{ top: 20, bottom: 20, left: 0, right: 30 }}
        grid={{ vertical: false, horizontal: true }}
        slotProps={{
          mark: { style: { strokeWidth: 2 } },
        }}
        sx={{
          width: '100%',
          height: '100%',
          '& .MuiChartsTooltip-mark': { ry: 4, rx: 4 },
        }}
      />
    </Box>
  );
});

const TrendAnalysis = () => {
  const [activeTab, setActiveTab] = useState(0);
  
  // ABC Analysis state
  const [abcLoading, setAbcLoading] = useState(true);
  const [abcTrendData, setAbcTrendData] = useState<ABCTrendResponse | null>(null);
  const [abcFinancialYear, setAbcFinancialYear] = useState('FY24-25');
  const [abcCategories, setAbcCategories] = useState<string[]>(['A', 'B', 'C']);
  const [xyzCategories, setXyzCategories] = useState<string[]>(['X', 'Y', 'Z']);
  const [abcMetric, setAbcMetric] = useState<'Revenue' | 'Quantity'>('Revenue');

  // Customer Trend state
  const [customerLoading, setCustomerLoading] = useState(true);
  const [customerTrendData, setCustomerTrendData] = useState<CustomerTrendDataPoint[]>([]);
  const [customerAvailableYears, setCustomerAvailableYears] = useState<string[]>([]);
  const [customerFinancialYear, setCustomerFinancialYear] = useState('');
  const [customerCategories, setCustomerCategories] = useState<string[]>(['Overall', 'A', 'B', 'C']);
  const [customerMetric, setCustomerMetric] = useState<'Revenue' | 'Quantity'>('Revenue');

  // ABC Analysis handlers
  const handleAbcChange = (category: string) => {
    setAbcCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleXyzChange = (category: string) => {
    setXyzCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  // Customer Trend handlers
  const handleCustomerCategoryChange = (category: string) => {
    setCustomerCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  // Fetch customer available years on mount
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const response = await customerTrendApi.getAvailableYears();
        const years = response.data.financial_years;
        setCustomerAvailableYears(years);
        if (years.length > 0 && !customerFinancialYear) {
          setCustomerFinancialYear(years[0]);
        }
      } catch (error) {
        console.error('Error fetching available years:', error);
        setCustomerAvailableYears([]);
      }
    };
    fetchAvailableYears();
  }, []);

  // Fetch ABC data
  useEffect(() => {
    const fetchData = async () => {
      setAbcLoading(true);
      try {
        const abcString = abcCategories.join(',');
        const xyzString = xyzCategories.join(',');
        const response = await abcApi.getTrend(abcFinancialYear, abcString, xyzString, abcMetric);
        setAbcTrendData(response.data);
      } catch (error) {
        console.error('Error fetching ABC trend data:', error);
      } finally {
        setAbcLoading(false);
      }
    };

    if (abcCategories.length > 0 && xyzCategories.length > 0) {
      fetchData();
    }
  }, [abcFinancialYear, abcCategories, xyzCategories, abcMetric]);

  // Fetch Customer Trend data
  useEffect(() => {
    const fetchData = async () => {
      if (!customerFinancialYear) return;
      
      setCustomerLoading(true);
      try {
        const categoryString = customerCategories.join(',');
        const response = await customerTrendApi.getTrend(customerFinancialYear, categoryString, customerMetric);
        setCustomerTrendData(response.data);
      } catch (error) {
        console.error('Error fetching customer trend data:', error);
        setCustomerTrendData([]);
      } finally {
        setCustomerLoading(false);
      }
    };

    if (customerCategories.length > 0) {
      fetchData();
    }
  }, [customerFinancialYear, customerCategories, customerMetric]);

  // ABC chart configuration
  const abcChartConfig = useMemo(() => {
    if (!abcTrendData || !abcTrendData.data || abcTrendData.data.length === 0) {
      return { formattedDates: [], chartSeries: [] };
    }

    const uniqueDates = [...new Set(abcTrendData.data.map(d => d.month_date))].sort();
    const availableCategories = [...new Set(abcTrendData.data.map(d => d.abc_category))];
    
    const formattedDates = uniqueDates.map(date => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    
    const chartSeries = availableCategories
      .filter(cat => ['A', 'B', 'C', 'Overall'].includes(cat))
      .sort((a, b) => {
        if (a === 'Overall') return -1;
        if (b === 'Overall') return 1;
        return a.localeCompare(b);
      })
      .map(cat => {
        const categoryData = abcTrendData.data.filter(d => d.abc_category === cat);
        
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
            if (abcMetric === 'Revenue') {
              const crValue = value / 10;
              return `₹${crValue.toFixed(2)} Cr`;
            }
            return value.toLocaleString();
          },
        };
      });

    return { formattedDates, chartSeries };
  }, [abcTrendData, abcMetric]);

  // Customer trend chart configuration
  const customerChartConfig = useMemo(() => {
    if (!customerTrendData || customerTrendData.length === 0) {
      return { monthLabels: [], chartSeries: [] };
    }

    const monthLabels = [...new Set(customerTrendData.map(d => d.month_label))];
    const uniqueCategories = [...new Set(customerTrendData.map(d => d.category))];
    
    const chartSeries = uniqueCategories
      .filter(cat => customerCategories.includes(cat))
      .map(cat => {
        const categoryData = customerTrendData.filter(d => d.category === cat);
        
        return {
          type: 'line' as const,
          id: `series-${cat}`,
          label: cat,
          data: monthLabels.map(month => {
            const point = categoryData.find(d => d.month_label === month);
            return point?.value !== undefined && point?.value !== null ? point.value : null;
          }),
          color: cat === 'Overall' ? ABC_COLORS.Overall : cat === 'A' ? ABC_COLORS.A : cat === 'B' ? ABC_COLORS.B : ABC_COLORS.C,
          curve: 'linear' as const,
          showMark: true,
          valueFormatter: (value: number | null) => {
            if (value === null || value === undefined) return '';
            if (customerMetric === 'Revenue') {
              const crValue = value / 10000000;
              return `₹${crValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
            }
            return value.toLocaleString('en-IN');
          },
        };
      });

    return { monthLabels, chartSeries };
  }, [customerTrendData, customerCategories, customerMetric]);

  return (
    <Box sx={{ width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        Trend Analysis
      </Typography>

      {/* Tabs */}
      <Paper elevation={1} sx={{ mb: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Product Trends (ABC)" id="trend-tab-0" aria-controls="trend-tabpanel-0" />
          <Tab label="Customer Trends" id="trend-tab-1" aria-controls="trend-tabpanel-1" />
        </Tabs>
      </Paper>

      {/* ABC Analysis Tab */}
      <TabPanel value={activeTab} index={0}>
        {abcLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Filters */}
            <Paper elevation={1} sx={{ p: 2.5, mb: 2, width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <FormControl sx={{ minWidth: 180 }}>
                  <InputLabel>Financial Year</InputLabel>
                  <Select
                    value={abcFinancialYear}
                    label="Financial Year"
                    onChange={(e: SelectChangeEvent) => setAbcFinancialYear(e.target.value)}
                    size="small"
                  >
                    <MenuItem value="FY23-24">FY23-24</MenuItem>
                    <MenuItem value="FY24-25">FY24-25</MenuItem>
                    <MenuItem value="FY25-26">FY25-26</MenuItem>
                  </Select>
                </FormControl>

                <Box>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
                    ABC Categories
                  </FormLabel>
                  <FormGroup row>
                    {['A', 'B', 'C'].map(cat => (
                      <FormControlLabel
                        key={cat}
                        control={
                          <Checkbox
                            checked={abcCategories.includes(cat)}
                            onChange={() => handleAbcChange(cat)}
                            size="small"
                          />
                        }
                        label={cat}
                      />
                    ))}
                  </FormGroup>
                </Box>

                <Box>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
                    XYZ Categories
                  </FormLabel>
                  <FormGroup row>
                    {['X', 'Y', 'Z'].map(cat => (
                      <FormControlLabel
                        key={cat}
                        control={
                          <Checkbox
                            checked={xyzCategories.includes(cat)}
                            onChange={() => handleXyzChange(cat)}
                            size="small"
                          />
                        }
                        label={cat}
                      />
                    ))}
                  </FormGroup>
                </Box>

                <Box>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
                    Metric
                  </FormLabel>
                  <ToggleButtonGroup
                    value={abcMetric}
                    exclusive
                    onChange={(_, newMetric) => newMetric && setAbcMetric(newMetric)}
                    size="small"
                  >
                    <ToggleButton value="Revenue" sx={{ px: 2.5 }}>Revenue</ToggleButton>
                    <ToggleButton value="Quantity" sx={{ px: 2.5 }}>Quantity</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>
            </Paper>

            {/* Chart */}
            <Paper elevation={1} sx={{ p: 2.5, flex: 1, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1, flexShrink: 0 }}>
                {abcMetric} Trend by ABC Category
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, flexShrink: 0 }}>
                {abcMetric === 'Revenue' ? 'Values in crores (Cr)' : 'Article quantities'}
              </Typography>
              
              {abcTrendData && abcTrendData.data.length > 0 ? (
                <ABCTrendChart chartConfig={abcChartConfig} metric={abcMetric} />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <Typography color="text.secondary">No data available for selected filters</Typography>
                </Box>
              )}
            </Paper>
          </>
        )}
      </TabPanel>

      {/* Customer Trend Tab */}
      <TabPanel value={activeTab} index={1}>
        {customerLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Filters */}
            <Paper elevation={1} sx={{ p: 2.5, mb: 2, width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <FormControl sx={{ minWidth: 180 }}>
                  <InputLabel>Financial Year</InputLabel>
                  <Select
                    value={customerFinancialYear}
                    label="Financial Year"
                    onChange={(e: SelectChangeEvent) => setCustomerFinancialYear(e.target.value)}
                    size="small"
                    disabled={customerAvailableYears.length === 0}
                  >
                    {customerAvailableYears.map(year => (
                      <MenuItem key={year} value={year}>{year}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
                    Customer Categories
                  </FormLabel>
                  <FormGroup row>
                    {['Overall', 'A', 'B', 'C'].map(cat => (
                      <FormControlLabel
                        key={cat}
                        control={
                          <Checkbox
                            checked={customerCategories.includes(cat)}
                            onChange={() => handleCustomerCategoryChange(cat)}
                            size="small"
                          />
                        }
                        label={cat}
                      />
                    ))}
                  </FormGroup>
                </Box>

                <Box>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
                    Metric
                  </FormLabel>
                  <ToggleButtonGroup
                    value={customerMetric}
                    exclusive
                    onChange={(_, newMetric) => newMetric && setCustomerMetric(newMetric)}
                    size="small"
                  >
                    <ToggleButton value="Revenue" sx={{ px: 2.5 }}>Revenue</ToggleButton>
                    <ToggleButton value="Quantity" sx={{ px: 2.5 }}>Quantity</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>
            </Paper>

            {/* Chart */}
            <Paper elevation={1} sx={{ p: 2.5, flex: 1, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1, flexShrink: 0 }}>
                Customer {customerMetric} Trend by Category
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, flexShrink: 0 }}>
                {customerMetric === 'Revenue' ? 'Values in crores (Cr)' : 'Article quantities'} • Financial Year: {customerFinancialYear}
              </Typography>
              
              {customerTrendData && customerTrendData.length > 0 ? (
                <CustomerTrendChart chartConfig={customerChartConfig} metric={customerMetric} />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <Typography color="text.secondary">No data available for selected filters</Typography>
                </Box>
              )}
            </Paper>
          </>
        )}
      </TabPanel>
    </Box>
  );
};

export default TrendAnalysis;

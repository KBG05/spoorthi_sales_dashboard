import { useEffect, useState, useMemo, memo, useRef } from 'react';
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
  Autocomplete,
  TextField,
  Chip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { useTheme } from '@mui/material/styles';
import type { AxisValueFormatterContext } from '@mui/x-charts/internals';
import { ABC_COLORS, CATEGORY_TREND_COLORS } from '../constants/constants';
import { abcApi, customerTrendApi } from '../api';
import type { ABCTrendResponse, CategoryTrendResponse, CustomerTrendDataPoint } from '../api/types';

// Charts never shrink below this; on short screens the page scrolls instead of
// squashing the plot into a flat line (the old "trend not showing" bug).
const CHART_MIN_HEIGHT = 380;

const formatCategoryTrendDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

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
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(CHART_MIN_HEIGHT);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const h = entries[0].contentRect.height;
      if (h >= CHART_MIN_HEIGHT) setChartHeight(h);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (chartConfig.chartSeries.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Typography color="text.secondary">No data available for selected filters</Typography>
      </Box>
    );
  }

  return (
    <Box ref={containerRef} sx={{ width: '100%', flex: 1, minHeight: CHART_MIN_HEIGHT }}>
      <LineChart
        height={chartHeight}
        xAxis={[{
          scaleType: 'point',
          data: chartConfig.formattedDates,
          height: 44,
          tickLabelStyle: { fontSize: 12, fontWeight: 600, fill: theme.palette.text.secondary },
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
          '& .MuiChartsTooltip-mark': { ry: 4, rx: 4 },
          '& .MuiChartsAxis-tickLabel': { fill: theme.palette.text.secondary },
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
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(CHART_MIN_HEIGHT);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const h = entries[0].contentRect.height;
      if (h >= CHART_MIN_HEIGHT) setChartHeight(h);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (chartConfig.chartSeries.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Typography color="text.secondary">No data available for selected filters</Typography>
      </Box>
    );
  }

  return (
    <Box ref={containerRef} sx={{ width: '100%', flex: 1, minHeight: CHART_MIN_HEIGHT }}>
      <LineChart
        height={chartHeight}
        xAxis={[{
          scaleType: 'point',
          data: chartConfig.monthLabels,
          height: 44,
          tickLabelStyle: { fontSize: 12, fontWeight: 600, fill: theme.palette.text.secondary },
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
          '& .MuiChartsTooltip-mark': { ry: 4, rx: 4 },
          '& .MuiChartsAxis-tickLabel': { fill: theme.palette.text.secondary },
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
  const [abcFinancialYear, setAbcFinancialYear] = useState('');
  const [abcAvailableYears, setAbcAvailableYears] = useState<string[]>([]);
  const [abcCategories, setAbcCategories] = useState<string[]>(['A', 'B', 'C']);
  const [xyzCategories, setXyzCategories] = useState<string[]>(['X', 'Y', 'Z']);
  const [abcMetric, setAbcMetric] = useState<'Revenue' | 'Quantity'>('Revenue');
  const [abcProductCategories, setAbcProductCategories] = useState<string[]>([]);

  // Product Category Trend state
  const [catLoading, setCatLoading] = useState(true);
  const [catTrendData, setCatTrendData] = useState<CategoryTrendResponse | null>(null);
  const [catFinancialYear, setCatFinancialYear] = useState('');
  const [catSelected, setCatSelected] = useState<string[]>([]); // empty = backend default (top 5)
  const [catMetric, setCatMetric] = useState<'Revenue' | 'Quantity'>('Revenue');
  // Categories with sales in each FY, shared by the ABC filter and the category tab
  const [categoriesByYear, setCategoriesByYear] = useState<Record<string, string[]>>({});

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

  // Fetch ABC available years on mount
  useEffect(() => {
    const fetchAbcAvailableYears = async () => {
      try {
        const response = await abcApi.getAvailableYears();
        const years = response.data.financial_years;
        setAbcAvailableYears(years);
        if (years.length > 0 && !abcFinancialYear) {
          setAbcFinancialYear(years[0]);
          setCatFinancialYear(years[0]);
        } else if (years.length === 0) {
          setAbcLoading(false);
          setCatLoading(false);
        }
      } catch (error) {
        console.error('Error fetching ABC years:', error);
        setAbcAvailableYears([]);
        setAbcLoading(false);
        setCatLoading(false);
      }
    };
    fetchAbcAvailableYears();
  }, []);

  // Fetch ABC data
  useEffect(() => {
    const fetchData = async () => {
      setAbcLoading(true);
      try {
        const abcString = abcCategories.join(',');
        const xyzString = xyzCategories.join(',');
        const response = await abcApi.getTrend(abcFinancialYear, abcString, xyzString, abcMetric, abcProductCategories);
        setAbcTrendData(response.data);
      } catch (error) {
        console.error('Error fetching ABC trend data:', error);
        setAbcTrendData(null);
      } finally {
        setAbcLoading(false);
      }
    };

    if (!abcFinancialYear) return;
    if (abcCategories.length > 0 && xyzCategories.length > 0) {
      fetchData();
    } else {
      // Nothing selected: show the empty state instead of the previous chart
      setAbcTrendData(null);
      setAbcLoading(false);
    }
  }, [abcFinancialYear, abcCategories, xyzCategories, abcMetric, abcProductCategories]);

  // Drop ABC product-category picks that don't exist in a newly chosen FY
  useEffect(() => {
    const available = categoriesByYear[abcFinancialYear];
    if (!available) return;
    setAbcProductCategories(prev => {
      const kept = prev.filter(c => available.includes(c));
      return kept.length === prev.length ? prev : kept;
    });
  }, [abcFinancialYear, categoriesByYear]);

  // Load the category list for the ABC tab's FY (the category tab loads its own via its trend call)
  useEffect(() => {
    if (!abcFinancialYear || categoriesByYear[abcFinancialYear]) return;
    abcApi.getCategoryTrend(abcFinancialYear, [], 'Revenue')
      .then(res => setCategoriesByYear(prev => ({ ...prev, [abcFinancialYear]: res.data.available_categories })))
      .catch(error => console.error('Error fetching product categories:', error));
  }, [abcFinancialYear, categoriesByYear]);

  // Fetch Product Category trend data
  useEffect(() => {
    if (!catFinancialYear) return;
    const fetchData = async () => {
      setCatLoading(true);
      try {
        const response = await abcApi.getCategoryTrend(catFinancialYear, catSelected, catMetric);
        setCatTrendData(response.data);
        setCategoriesByYear(prev => ({ ...prev, [catFinancialYear]: response.data.available_categories }));
      } catch (error) {
        console.error('Error fetching category trend data:', error);
        setCatTrendData(null);
      } finally {
        setCatLoading(false);
      }
    };
    fetchData();
  }, [catFinancialYear, catSelected, catMetric]);

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
    } else {
      setCustomerTrendData([]);
      setCustomerLoading(false);
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

  // Product category chart configuration (same shape as the ABC chart, so it reuses ABCTrendChart)
  const catChartConfig = useMemo(() => {
    if (!catTrendData || catTrendData.data.length === 0) {
      return { formattedDates: [], chartSeries: [] };
    }
    const uniqueDates = [...new Set(catTrendData.data.map(d => d.month_date))].sort();
    const formattedDates = uniqueDates.map(formatCategoryTrendDate);

    const chartSeries = catTrendData.selected_categories.map((cat, i) => {
      const byDate = new Map(
        catTrendData.data.filter(d => d.category === cat).map(d => [d.month_date, d.value])
      );
      return {
        type: 'line' as const,
        id: `cat-${cat}`,
        label: cat,
        // Months with no sales for a category are a real zero, not a gap
        data: uniqueDates.map(date => byDate.get(date) ?? 0),
        color: CATEGORY_TREND_COLORS[i % CATEGORY_TREND_COLORS.length],
        curve: 'linear' as const,
        showMark: true,
        valueFormatter: (value: number | null) => {
          if (value === null || value === undefined) return '';
          if (catMetric === 'Revenue') return `₹${(value / 10).toFixed(2)} Cr`;
          return value.toLocaleString('en-IN');
        },
      };
    });

    return { formattedDates, chartSeries };
  }, [catTrendData, catMetric]);

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
    <Box sx={{ width: '100%', minHeight: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
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
          <Tab label="Product Category Trends" id="trend-tab-2" aria-controls="trend-tabpanel-2" />
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
                    disabled={abcAvailableYears.length === 0}
                  >
                    {abcAvailableYears.map((year) => (
                      <MenuItem key={year} value={year}>{year}</MenuItem>
                    ))}
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

                <Autocomplete
                  multiple
                  size="small"
                  limitTags={2}
                  options={categoriesByYear[abcFinancialYear] ?? []}
                  value={abcProductCategories}
                  onChange={(_, value) => setAbcProductCategories(value)}
                  sx={{ minWidth: 280, maxWidth: 420, flex: 1 }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Product Category" placeholder={abcProductCategories.length ? '' : 'All categories'} />
                  )}
                />

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
            <Paper elevation={1} sx={{ p: 2.5, flex: 1, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: CHART_MIN_HEIGHT + 100 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1, flexShrink: 0 }}>
                {abcMetric} Trend by ABC Category
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, flexShrink: 0 }}>
                {abcMetric === 'Revenue' ? 'Values in crores (Cr)' : 'Article quantities'}
                {abcProductCategories.length > 0 && ` • ${abcProductCategories.join(', ')}`}
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
            <Paper elevation={1} sx={{ p: 2.5, flex: 1, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: CHART_MIN_HEIGHT + 100 }}>
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

      {/* Product Category Trend Tab */}
      <TabPanel value={activeTab} index={2}>
        <Paper elevation={1} sx={{ p: 2.5, mb: 2, width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel>Financial Year</InputLabel>
              <Select
                value={catFinancialYear}
                label="Financial Year"
                onChange={(e: SelectChangeEvent) => {
                  setCatFinancialYear(e.target.value);
                  setCatSelected([]); // back to that year's top 5
                }}
                size="small"
                disabled={abcAvailableYears.length === 0}
              >
                {abcAvailableYears.map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              size="small"
              limitTags={4}
              options={catTrendData?.available_categories ?? []}
              value={catTrendData?.selected_categories ?? catSelected}
              onChange={(_, value) => setCatSelected(value)}
              sx={{ minWidth: 320, flex: 1 }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option}
                    size="small"
                    sx={{ borderLeft: `4px solid ${CATEGORY_TREND_COLORS[index % CATEGORY_TREND_COLORS.length]}` }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Product Categories" helperText="Defaults to the top 5 by revenue" />
              )}
            />

            <Box>
              <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
                Metric
              </FormLabel>
              <ToggleButtonGroup
                value={catMetric}
                exclusive
                onChange={(_, newMetric) => newMetric && setCatMetric(newMetric)}
                size="small"
              >
                <ToggleButton value="Revenue" sx={{ px: 2.5 }}>Revenue</ToggleButton>
                <ToggleButton value="Quantity" sx={{ px: 2.5 }}>Quantity</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Paper>

        <Paper elevation={1} sx={{ p: 2.5, flex: 1, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: CHART_MIN_HEIGHT + 100 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1, flexShrink: 0 }}>
            {catMetric} Trend by Product Category
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, flexShrink: 0 }}>
            {catMetric === 'Revenue' ? 'Values in crores (Cr)' : 'Article quantities'} • Financial Year: {catFinancialYear}
          </Typography>

          {catLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <CircularProgress />
            </Box>
          ) : (
            <ABCTrendChart chartConfig={catChartConfig} metric={catMetric} />
          )}
        </Paper>
      </TabPanel>
    </Box>
  );
};

export default TrendAnalysis;

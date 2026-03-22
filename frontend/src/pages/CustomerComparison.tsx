import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  FormControl,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Typography,
  Autocomplete,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Button,
  Select,
  MenuItem,
  InputLabel,
  Grid,
  Paper,
  Chip,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import type { AxisValueFormatterContext } from '@mui/x-charts/internals';
import { customerComparisonApi } from '../api';
import { ABC_COLORS } from '../constants/constants';
import type { CustomerListItem, ProductListItem, CustomerBehaviourDataPoint } from '../api/types';

// Distinctive colors for each customer line
const CUSTOMER_COLORS = ['#FF6B9D', '#00D9FF'];

const CustomerComparison: React.FC = () => {
  const [financialYear, setFinancialYear] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [abcClasses, setAbcClasses] = useState<string[]>(['A']);
  const [metric, setMetric] = useState<'Revenue' | 'Quantity'>('Revenue');
  const [articles, setArticles] = useState<ProductListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [showLabels, setShowLabels] = useState(true);
  const [trendData, setTrendData] = useState<CustomerBehaviourDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Fetch available years on mount
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const response = await customerComparisonApi.getAvailableYears();
        const years = response.data.financial_years;
        setAvailableYears(years);
        if (years.length > 0 && !financialYear) {
          setFinancialYear(years[0]);
        }
      } catch (error) {
        console.error('Error fetching available years:', error);
        setAvailableYears([]);
      }
    };
    fetchAvailableYears();
  }, []);

  // Fetch articles when FY or ABC classes change
  useEffect(() => {
    if (!financialYear) return;

    const fetchArticles = async () => {
      setLoadingArticles(true);
      try {
        const result = await customerComparisonApi.getArticles(
          financialYear,
          abcClasses.join(',')
        );
        setArticles(result);
        if (selectedArticle && !result.some(a => a.article_no === selectedArticle)) {
          setSelectedArticle(null);
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
      } finally {
        setLoadingArticles(false);
      }
    };
    if (abcClasses.length > 0) {
      fetchArticles();
    }
  }, [financialYear, abcClasses]);

  // Fetch customers when article is selected
  useEffect(() => {
    if (!selectedArticle) {
      setCustomers([]);
      setSelectedCustomers([]);
      return;
    }

    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const result = await customerComparisonApi.getCustomers(
          financialYear,
          selectedArticle,
        );
        setCustomers(result);
        const validIds = result.map(c => c.customer_id);
        setSelectedCustomers(prev => prev.filter(id => validIds.includes(id)));
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, [financialYear, selectedArticle]);

  // Fetch trend data when customers are selected
  const selectedCustomersKey = useMemo(
    () => JSON.stringify(selectedCustomers.sort()),
    [selectedCustomers],
  );

  useEffect(() => {
    if (!selectedArticle || selectedCustomers.length === 0) {
      setTrendData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await customerComparisonApi.getTrend(
          financialYear,
          selectedArticle,
          selectedCustomers.join(','),
          metric,
        );
        const processed = result.map(item => ({
          ...item,
          month: new Date(item.month).toLocaleDateString('en-US', { month: 'short' }),
        }));
        setTrendData(processed);
      } catch (error) {
        console.error('Error fetching trend:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [financialYear, selectedArticle, selectedCustomersKey, metric]);

  const getOverallColor = () => {
    if (abcClasses.length === 1) {
      const classKey = abcClasses[0] as 'A' | 'B' | 'C';
      if (classKey in ABC_COLORS) {
        return ABC_COLORS[classKey];
      }
    }
    return ABC_COLORS.Overall;
  };

  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  return (
    <Box display="flex" flexDirection="column" height="100%" p={2.5}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Customer Comparison
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
          alignItems: 'flex-start',
        }}
      >
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Financial Year</InputLabel>
          <Select
            value={financialYear}
            label="Financial Year"
            onChange={(e) => setFinancialYear(e.target.value)}
            disabled={availableYears.length === 0}
          >
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Typography variant="caption" sx={{ mb: 0.5 }}>
            Article Classes
          </Typography>
          <FormGroup row>
            {['A', 'B', 'C'].map((cls) => (
              <FormControlLabel
                key={cls}
                control={
                  <Checkbox
                    checked={abcClasses.includes(cls)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAbcClasses([...abcClasses, cls]);
                      } else {
                        setAbcClasses(abcClasses.filter((c) => c !== cls));
                      }
                    }}
                    size="small"
                  />
                }
                label={cls}
              />
            ))}
          </FormGroup>
        </FormControl>

        <ToggleButtonGroup
          value={metric}
          exclusive
          onChange={(_, value) => value && setMetric(value)}
          size="small"
        >
          <ToggleButton value="Revenue">Revenue</ToggleButton>
          <ToggleButton value="Quantity">Quantity</ToggleButton>
        </ToggleButtonGroup>

        {/* Article selector */}
        <Box display="flex" flexDirection="column" gap={1}>
          <Box display="flex" gap={1} alignItems="flex-start">
            <Autocomplete
              size="small"
              sx={{ minWidth: 350, flex: 1 }}
              options={articles}
              getOptionLabel={(option) =>
                option.article_name
                  ? `${option.article_no} - ${option.article_name}`
                  : option.article_no
              }
              value={articles.find((a) => a.article_no === selectedArticle) || null}
              onChange={(_, newValue) => {
                setSelectedArticle(newValue?.article_no || null);
              }}
              loading={loadingArticles}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Article"
                  placeholder="Search articles..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingArticles ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedArticle(null)}
              disabled={!selectedArticle}
              sx={{ mt: '4px' }}
            >
              Clear
            </Button>
          </Box>
        </Box>

        {/* Customer selector (max 2) */}
        <Box display="flex" flexDirection="column" gap={1}>
          <Box display="flex" gap={1} alignItems="center">
            <Autocomplete
              multiple
              size="small"
              sx={{ minWidth: 350, flex: 1 }}
              options={customers}
              getOptionLabel={(option) =>
                option.customer_name
                  ? `${option.customer_id} - ${option.customer_name}`
                  : option.customer_id
              }
              value={customers.filter((c) => selectedCustomers.includes(c.customer_id))}
              onChange={(_, newValue) => {
                const uniqueIds = [...new Set(newValue.map((c) => c.customer_id))];
                setSelectedCustomers(uniqueIds.slice(0, 2));
              }}
              loading={loadingCustomers}
              disabled={!selectedArticle}
              limitTags={2}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const label = option.customer_name || option.customer_id;
                  return (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.customer_id}
                      label={label}
                      size="small"
                      sx={{
                        backgroundColor:
                          CUSTOMER_COLORS[
                            selectedCustomers.indexOf(option.customer_id) %
                              CUSTOMER_COLORS.length
                          ],
                        color: 'white',
                      }}
                    />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Customers (max 2)"
                  placeholder={
                    selectedCustomers.length >= 2
                      ? 'Max 2 reached'
                      : 'Search customers...'
                  }
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingCustomers ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedCustomers([])}
              disabled={selectedCustomers.length === 0}
            >
              Clear
            </Button>
          </Box>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              size="small"
            />
          }
          label="Show Labels"
        />
      </Box>

      {/* Chart Section */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <CircularProgress />
        </Box>
      ) : !selectedArticle ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <Typography color="text.secondary">
            Select an article to compare customers
          </Typography>
        </Box>
      ) : selectedCustomers.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <Typography color="text.secondary">
            Select up to 2 customers to compare side by side
          </Typography>
        </Box>
      ) : (
        <Box flex={1} minHeight={0}>
          <Grid container spacing={2}>
            {selectedCustomers.map((customerId, index) => {
              const customerColor = CUSTOMER_COLORS[index % CUSTOMER_COLORS.length];
              const overallColor = getOverallColor();
              const customerInfo = customers.find(
                (c) => c.customer_id === customerId,
              );
              const customerLabel =
                customerInfo?.customer_name || customerId;

              // Filter data for this customer
              const customerData = trendData.filter((d) =>
                d.type.includes(`Customer ${customerId}`),
              );

              return (
                <Grid
                  size={{
                    xs: 12,
                    md: selectedCustomers.length === 1 ? 12 : 6,
                  }}
                  key={customerId}
                >
                  <Paper
                    sx={{
                      p: 2,
                      height: selectedCustomers.length === 1 ? 500 : 450,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      gutterBottom
                      sx={{ fontWeight: 'bold', color: customerColor }}
                    >
                      {customerLabel}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 1 }}
                    >
                      Article: {selectedArticle}
                    </Typography>
                    {customerData.length === 0 ? (
                      <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        height="80%"
                      >
                        <Typography color="text.secondary">
                          No data available
                        </Typography>
                      </Box>
                    ) : (
                      <LineChart
                        xAxis={[
                          {
                            scaleType: 'band',
                            data: months,
                          },
                        ]}
                        yAxis={[
                          {
                            id: 'totalAxis',
                            label: 'Customer Total',
                            width: 110,
                            valueFormatter: (
                              value: number,
                              context: AxisValueFormatterContext,
                            ) => {
                              if (context.location === 'tick') {
                                if (metric === 'Revenue') {
                                  if (value >= 10000000)
                                    return `₹${(value / 10000000).toFixed(0)}Cr`;
                                  if (value >= 100000)
                                    return `₹${(value / 100000).toFixed(0)}L`;
                                  if (value >= 1000)
                                    return `₹${(value / 1000).toFixed(0)}K`;
                                  return `₹${value.toFixed(0)}`;
                                }
                                if (value >= 1000000)
                                  return `${(value / 1000000).toFixed(0)}M`;
                                if (value >= 1000)
                                  return `${(value / 1000).toFixed(0)}K`;
                                return `${value.toFixed(0)}`;
                              }
                              if (metric === 'Revenue') {
                                if (value >= 10000000)
                                  return `₹${(value / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
                                if (value >= 100000)
                                  return `₹${(value / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
                                return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                              }
                              return value.toLocaleString('en-IN');
                            },
                            min: 0,
                          },
                          {
                            id: 'articleAxis',
                            label: 'Article',
                            width: 110,
                            position: 'right',
                            valueFormatter: (
                              value: number,
                              context: AxisValueFormatterContext,
                            ) => {
                              if (context.location === 'tick') {
                                if (metric === 'Revenue') {
                                  if (value >= 10000000)
                                    return `₹${(value / 10000000).toFixed(0)}Cr`;
                                  if (value >= 100000)
                                    return `₹${(value / 100000).toFixed(0)}L`;
                                  if (value >= 1000)
                                    return `₹${(value / 1000).toFixed(0)}K`;
                                  return `₹${value.toFixed(0)}`;
                                }
                                if (value >= 1000000)
                                  return `${(value / 1000000).toFixed(0)}M`;
                                if (value >= 1000)
                                  return `${(value / 1000).toFixed(0)}K`;
                                return `${value.toFixed(0)}`;
                              }
                              if (metric === 'Revenue') {
                                if (value >= 10000000)
                                  return `₹${(value / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
                                if (value >= 100000)
                                  return `₹${(value / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
                                return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                              }
                              return value.toLocaleString('en-IN');
                            },
                            min: 0,
                          },
                        ]}
                        series={(() => {
                          const allSeries: any[] = [];

                          // Overall series (customer total across all articles)
                          const overallData = customerData.filter((d) =>
                            d.type.includes('Overall'),
                          );
                          if (overallData.length > 0) {
                            const monthValueMap = new Map(
                              overallData.map((d) => [d.month, d.value]),
                            );
                            const alignedData = months.map(
                              (month) => monthValueMap.get(month) || null,
                            );

                            allSeries.push({
                              data: alignedData,
                              label: 'Customer Total',
                              curve: 'linear' as const,
                              showMark: showLabels,
                              color: overallColor,
                              strokeWidth: 2,
                              connectNulls: true,
                              yAxisId: 'totalAxis',
                              valueFormatter: (value: number | null) => {
                                if (value === null || value === undefined)
                                  return '';
                                if (metric === 'Revenue') {
                                  if (value >= 10000000)
                                    return `₹${(value / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
                                  if (value >= 100000)
                                    return `₹${(value / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
                                  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                                }
                                return value.toLocaleString('en-IN');
                              },
                            });
                          }

                          // Article-specific series
                          const articleData = customerData.filter((d) =>
                            d.type.includes('Article'),
                          );
                          if (articleData.length > 0) {
                            const monthValueMap = new Map(
                              articleData.map((d) => [d.month, d.value]),
                            );
                            const alignedData = months.map(
                              (month) => monthValueMap.get(month) || null,
                            );

                            allSeries.push({
                              data: alignedData,
                              label: `Article ${selectedArticle}`,
                              curve: 'linear' as const,
                              showMark: showLabels,
                              color: customerColor,
                              strokeWidth: 2,
                              strokeDasharray: '5 5',
                              connectNulls: true,
                              yAxisId: 'articleAxis',
                              valueFormatter: (value: number | null) => {
                                if (value === null || value === undefined)
                                  return '';
                                if (metric === 'Revenue') {
                                  if (value >= 10000000)
                                    return `₹${(value / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
                                  if (value >= 100000)
                                    return `₹${(value / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
                                  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                                }
                                return value.toLocaleString('en-IN');
                              },
                            });
                          }

                          return allSeries;
                        })()}
                        margin={{ top: 10, right: 0, bottom: 40, left: 0 }}
                        grid={{ vertical: false, horizontal: true }}
                        slotProps={{
                          legend: {
                            direction: 'horizontal',
                            position: {
                              vertical: 'top',
                              horizontal: 'center',
                            },
                          },
                        }}
                      />
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default CustomerComparison;

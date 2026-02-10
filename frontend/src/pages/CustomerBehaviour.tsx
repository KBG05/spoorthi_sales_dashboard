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
import { customerBehaviourApi } from '../api';
import { ABC_COLORS } from '../constants/constants';
import type { CustomerListItem, ProductListItem, CustomerBehaviourDataPoint } from '../api/types';

// Colors for multi-product charts - distinctive colors that stand out from ABC colors
const PRODUCT_COLORS = ['#FF6B9D', '#00D9FF', '#FFB800', '#A855F7'];

const CustomerBehaviour: React.FC = () => {
  const [financialYear, setFinancialYear] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [abcClasses, setAbcClasses] = useState<string[]>(['A']);
  const [metric, setMetric] = useState<'Revenue' | 'Quantity'>('Revenue');
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showLabels, setShowLabels] = useState(true);
  const [productData, setProductData] = useState<Map<number, CustomerBehaviourDataPoint[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Color logic: Overall uses ABC class color
  const getOverallColor = () => {
    if (abcClasses.length === 1) {
      const classKey = abcClasses[0] as 'A' | 'B' | 'C';
      if (classKey in ABC_COLORS) {
        return ABC_COLORS[classKey];
      }
    }
    return ABC_COLORS.Overall; // Default blue
  };

  // Fetch available years on mount
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const response = await customerBehaviourApi.getAvailableYears();
        const years = response.data.financial_years;
        setAvailableYears(years);
        // Auto-select the first (latest) year
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

  // Fetch customers when FY or ABC classes change
  useEffect(() => {
    if (!financialYear) return; // Don't fetch if year not selected yet
    
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const result = await customerBehaviourApi.getCustomers(
          financialYear,
          abcClasses.join(',')
        );
        setCustomers(result);
        // Keep existing selection if still valid
        if (selectedCustomer && !result.some(c => c.customer_id === selectedCustomer)) {
          setSelectedCustomer(null);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoadingCustomers(false);
      }
    };
    if (abcClasses.length > 0) {
      fetchCustomers();
    }
  }, [financialYear, abcClasses]);

  // Fetch products when customer is selected
  useEffect(() => {
    if (!selectedCustomer) {
      setProducts([]);
      setSelectedProducts([]);
      return;
    }

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const result = await customerBehaviourApi.getProducts(
          financialYear,
          selectedCustomer.toString()
        );
        setProducts(result);
        // Reset product selections if they're not in the new product list
        const validIds = result.map(p => p.product_id);
        setSelectedProducts(prev => prev.filter(id => validIds.includes(id)));
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [financialYear, selectedCustomer]);

  // Group products by product_id and combine their names
  const groupedProducts = useMemo(() => {
    const productMap = new Map<number, { product_id: number; product_names: string[] }>();
    
    products.forEach(product => {
      if (productMap.has(product.product_id)) {
        const existing = productMap.get(product.product_id)!;
        if (product.product_name && !existing.product_names.includes(product.product_name)) {
          existing.product_names.push(product.product_name);
        }
      } else {
        productMap.set(product.product_id, {
          product_id: product.product_id,
          product_names: product.product_name ? [product.product_name] : []
        });
      }
    });
    
    return Array.from(productMap.values());
  }, [products]);

  // Memoize selected products to prevent unnecessary re-renders
  const selectedProductsKey = useMemo(() => JSON.stringify(selectedProducts.sort()), [selectedProducts]);

  // Fetch trend data when products are selected
  useEffect(() => {
    if (!selectedCustomer || selectedProducts.length === 0) {
      setProductData(new Map());
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const newProductData = new Map<number, CustomerBehaviourDataPoint[]>();
        
        // Fetch data for each selected product
        await Promise.all(
          selectedProducts.map(async (productId) => {
            const result = await customerBehaviourApi.getTrend(
              financialYear,
              selectedCustomer.toString(),
              productId.toString(),
              metric
            );
            // Convert month dates to month names
            const dataWithMonths = result.map(item => ({
              ...item,
              month: new Date(item.month).toLocaleDateString('en-US', { month: 'short' })
            }));
            newProductData.set(productId, dataWithMonths);
          })
        );
        
        setProductData(newProductData);
      } catch (error) {
        console.error('Error fetching customer behaviour:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [financialYear, selectedCustomer, selectedProductsKey, metric]);

  return (
    <Box display="flex" flexDirection="column" height="100%" p={2.5}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Customer Purchasing Behavior Analysis
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
          alignItems: 'flex-start'
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
            {availableYears.map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Typography variant="caption" sx={{ mb: 0.5 }}>Customer Classes</Typography>
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

        <Box display="flex" flexDirection="column" gap={1}>
          <Box display="flex" gap={1} alignItems="flex-start">
            <Autocomplete
              size="small"
              sx={{ minWidth: 300, flex: 1 }}
              options={customers}
              getOptionLabel={(option) => 
                option.customer_name 
                  ? `${option.customer_id} - ${option.customer_name}` 
                  : `Customer ${option.customer_id}`
              }
              value={customers.find(c => c.customer_id === selectedCustomer) || null}
              onChange={(_, newValue) => {
                setSelectedCustomer(newValue?.customer_id || null);
              }}
              loading={loadingCustomers}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Customer"
                  placeholder="Search customers..."
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
              onClick={() => setSelectedCustomer(null)}
              disabled={!selectedCustomer}
              sx={{ mt: '4px' }}
            >
              Clear
            </Button>
          </Box>
        </Box>

        <Box display="flex" flexDirection="column" gap={1}>
          <Box display="flex" gap={1} alignItems="center">
            <Autocomplete
              multiple
              size="small"
              sx={{ minWidth: 350, flex: 1 }}
              options={groupedProducts}
              getOptionLabel={(option) => {
                const names = option.product_names.length > 0 
                  ? option.product_names.join(', ') 
                  : 'No Name';
                return `${option.product_id} - ${names}`;
              }}
              value={groupedProducts.filter(p => selectedProducts.includes(p.product_id))}
              onChange={(_, newValue) => {
                // Deduplicate by product_id
                const uniqueProducts = new Map(newValue.map(p => [p.product_id, p]));
                const uniqueIds = Array.from(uniqueProducts.keys());
                setSelectedProducts(uniqueIds.slice(0, 4));
              }}
              loading={loadingProducts}
              disabled={!selectedCustomer}
              limitTags={2}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const label = option.product_names.length > 0 
                    ? option.product_names.join(', ') 
                    : `Product ${option.product_id}`;
                  return (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.product_id}
                      label={label}
                      size="small"
                      sx={{
                        backgroundColor: PRODUCT_COLORS[selectedProducts.indexOf(option.product_id) % PRODUCT_COLORS.length],
                        color: 'white',
                      }}
                    />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Products (max 4)"
                  placeholder={selectedProducts.length >= 4 ? 'Max 4 reached' : 'Search products...'}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingProducts ? <CircularProgress size={20} /> : null}
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
              onClick={() => setSelectedProducts([])}
              disabled={selectedProducts.length === 0}
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
      ) : !selectedCustomer ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <Typography color="text.secondary">
            Select a customer to view behavior
          </Typography>
        </Box>
      ) : selectedProducts.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <Typography color="text.secondary">
            Select up to 4 products to view detailed comparison
          </Typography>
        </Box>
      ) : (
        <Box flex={1} minHeight={0}>
          <Grid container spacing={2}>
            {selectedProducts.map((productId, index) => {
              const data = productData.get(productId) || [];
              const productColor = PRODUCT_COLORS[index % PRODUCT_COLORS.length];
              const overallColor = getOverallColor();
              const productInfo = groupedProducts.find(p => p.product_id === productId);
              const productLabel = productInfo?.product_names.length ? productInfo.product_names.join(', ') : `Product ${productId}`;
              
              return (
                <Grid size={{ xs: 12, md: selectedProducts.length === 1 ? 12 : 6 }} key={productId}>
                  <Paper sx={{ p: 2, height: selectedProducts.length === 1 ? 500 : 350 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: productColor }}>
                      {productId} - {productLabel}
                    </Typography>
                    {data.length === 0 ? (
                      <Box display="flex" justifyContent="center" alignItems="center" height="80%">
                        <Typography color="text.secondary">No data available</Typography>
                      </Box>
                    ) : (
                      <LineChart
                        xAxis={[{
                          scaleType: 'band',
                          data: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
                        }]}
                        yAxis={[
                          {
                            id: 'totalAxis',
                            label: metric === 'Revenue' ? 'Customer Total' : 'Customer Total',
                            width: 110,
                            valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                              if (context.location === 'tick') {
                                if (metric === 'Revenue') {
                                  // Keep in lakhs/thousands, not crores
                                  if (value >= 10000000) return `₹${(value / 10000000).toFixed(0)}Cr`;
                                  if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
                                  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                                  return `₹${value.toFixed(0)}`;
                                }
                                if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                return `${value.toFixed(0)}`;
                              }
                              if (metric === 'Revenue') {
                                // Tooltip shows full value in appropriate unit
                                if (value >= 10000000) return `₹${(value / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
                                if (value >= 100000) return `₹${(value / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
                                return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                              }
                              return value.toLocaleString('en-IN');
                            },
                            min: 0,
                          },
                          {
                            id: 'productAxis',
                            label: metric === 'Revenue' ? 'Product' : 'Product',
                            width: 110,
                            position: 'right',
                            valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                              if (context.location === 'tick') {
                                if (metric === 'Revenue') {
                                  // Keep in lakhs/thousands, not crores
                                  if (value >= 10000000) return `₹${(value / 10000000).toFixed(0)}Cr`;
                                  if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
                                  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                                  return `₹${value.toFixed(0)}`;
                                }
                                if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                return `${value.toFixed(0)}`;
                              }
                              if (metric === 'Revenue') {
                                // Tooltip shows full value in appropriate unit
                                if (value >= 10000000) return `₹${(value / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
                                if (value >= 100000) return `₹${(value / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
                                return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                              }
                              return value.toLocaleString('en-IN');
                            },
                            min: 0,
                          }
                        ]}
                        series={(() => {
                          const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
                          const allSeries: any[] = [];
                          
                          // Overall series (customer total)
                          const overallData = data.filter(d => d.type.includes('Overall'));
                          if (overallData.length > 0) {
                            const monthValueMap = new Map(overallData.map(d => [d.month, d.value]));
                            const alignedData = months.map(month => monthValueMap.get(month) || null);
                            
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
                                if (value === null || value === undefined) return '';
                                if (metric === 'Revenue') {
                                  // Customer Total - use lakhs/thousands
                                  if (value >= 10000000) return `₹${(value / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
                                  if (value >= 100000) return `₹${(value / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
                                  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                                }
                                return value.toLocaleString('en-IN');
                              },
                            });
                          }
                          
                          // Product-specific series
                          const productDataFiltered = data.filter(d => d.type.includes('Product'));
                          if (productDataFiltered.length > 0) {
                            const monthValueMap = new Map(productDataFiltered.map(d => [d.month, d.value]));
                            const alignedData = months.map(month => monthValueMap.get(month) || null);
                            
                            allSeries.push({
                              data: alignedData,
                              label: productLabel,
                              curve: 'linear' as const,
                              showMark: showLabels,
                              color: productColor,
                              strokeWidth: 2,
                              strokeDasharray: '5 5',
                              connectNulls: true,
                              yAxisId: 'productAxis',
                              valueFormatter: (value: number | null) => {
                                if (value === null || value === undefined) return '';
                                if (metric === 'Revenue') {
                                  // Product axis - use lakhs/thousands
                                  if (value >= 10000000) return `₹${(value / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
                                  if (value >= 100000) return `₹${(value / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
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
                            direction: "horizontal",
                            position: { vertical: 'top', horizontal: "center" }
                          }
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

export default CustomerBehaviour;

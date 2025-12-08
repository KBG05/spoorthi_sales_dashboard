import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import type { AxisValueFormatterContext } from '@mui/x-charts/internals';
import { customerBehaviourApi } from '../api';
import { ABC_COLORS } from '../constants/constants';
import type { CustomerListItem, ProductListItem, CustomerBehaviourDataPoint } from '../api/types';

const CustomerBehaviour: React.FC = () => {
  const [financialYear, setFinancialYear] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [abcClasses, setAbcClasses] = useState<string[]>(['A']);
  const [metric, setMetric] = useState<'Revenue' | 'Quantity'>('Revenue');
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [data, setData] = useState<CustomerBehaviourDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Color logic: Overall uses ABC class color, Product uses fixed color
  const getCustomerColors = () => {
    let overallColor: string = ABC_COLORS.Overall; // Default blue
    
    if (abcClasses.length === 1) {
      const classKey = abcClasses[0] as 'A' | 'B' | 'C';
      if (classKey in ABC_COLORS) {
        overallColor = ABC_COLORS[classKey];
      }
    }
    
    return {
      customerOverall: overallColor,
      customerProduct: '#ff006e', // Pink/magenta for product
    };
  };
  
  const CUSTOMER_COLORS = getCustomerColors();

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
      setSelectedProduct(null);
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
        // Reset product selection if it's not in the new product list
        if (selectedProduct !== null && !result.some(p => p.product_id === selectedProduct)) {
          setSelectedProduct(null);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [financialYear, selectedCustomer]);

  // Fetch trend data when product is selected
  useEffect(() => {
    if (!selectedCustomer || selectedProduct === null) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await customerBehaviourApi.getTrend(
          financialYear,
          selectedCustomer.toString(),
          selectedProduct.toString(),
          metric
        );
        // Convert month dates to month names
        const dataWithMonths = result.map(item => ({
          ...item,
          month: new Date(item.month).toLocaleDateString('en-US', { month: 'short' })
        }));
        
        setData(dataWithMonths);
      } catch (error) {
        console.error('Error fetching customer behaviour:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [financialYear, selectedCustomer, selectedProduct, metric]);

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
              getOptionLabel={(option) => `Customer ${option.customer_id}`}
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
              size="small"
              sx={{ minWidth: 300, flex: 1 }}
              options={products}
              getOptionLabel={(option) => `Product ${option.product_id}`}
              value={products.find(p => p.product_id === selectedProduct) || null}
              onChange={(_, newValue) => setSelectedProduct(newValue?.product_id || null)}
              loading={loadingProducts}
              disabled={!selectedCustomer}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Product"
                  placeholder="Search products..."
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
              onClick={() => setSelectedProduct(null)}
              disabled={selectedProduct === null}
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
      ) : selectedProduct === null ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <Typography color="text.secondary">
            Select a product to view detailed comparison
          </Typography>
        </Box>
      ) : data.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <Typography color="text.secondary">No data available</Typography>
        </Box>
      ) : (
  <Box flex={1} minHeight={0} sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, p: 2 }}>
          <LineChart
            xAxis={[{
              scaleType: 'band',
              data: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
              valueFormatter: (value: string) => value,
            }]}
            yAxis={[
              // Left Y-axis: Overall customer revenue/quantity (all products)
              {
                id: 'overallAxis',
                label: metric === 'Revenue' ? 'Total Customer Revenue (M)' : 'Total Quantity',
                valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                  if (context.location === 'tick') {
                    if (metric === 'Revenue') {
                      if (value >= 1000000) {
                        const mValue = value / 1000000;
                        return mValue % 1 === 0 ? `₹${mValue.toFixed(0)}M` : `₹${mValue.toFixed(1)}M`;
                      }
                      if (value >= 1000) {
                        const kValue = value / 1000;
                        return kValue % 1 === 0 ? `₹${kValue.toFixed(0)}K` : `₹${kValue.toFixed(1)}K`;
                      }
                      return `₹${value.toFixed(0)}`;
                    }
                    if (value >= 1000000) {
                      const mValue = value / 1000000;
                      return mValue % 1 === 0 ? `${mValue.toFixed(0)}M` : `${mValue.toFixed(1)}M`;
                    }
                    if (value >= 1000) {
                      const kValue = value / 1000;
                      return kValue % 1 === 0 ? `${kValue.toFixed(0)}K` : `${kValue.toFixed(1)}K`;
                    }
                    return value.toFixed(0);
                  }
                  if (metric === 'Revenue') {
                    return `₹${value.toLocaleString('en-IN')}`;
                  }
                  return value.toLocaleString('en-IN');
                },
                min: 0,
                tickMinStep: (() => {
                  const overallData = data.filter(d => d.type.includes('Overall'));
                  const allValues = overallData.map(d => d.value || 0);
                  if (allValues.length === 0) return 1;
                  const maxVal = Math.max(...allValues);
                  const minVal = Math.min(...allValues);
                  const range = maxVal - minVal;
                  
                  // For quantity, ensure we always have visible ticks
                  if (metric === 'Quantity') {
                    // Calculate tick step to ensure 4-6 ticks on the axis
                    const idealTickCount = 5;
                    const roughStep = range / idealTickCount;
                    
                    // Round to nearest sensible value
                    if (roughStep === 0) return 1;
                    
                    const magnitude = Math.floor(Math.log10(roughStep));
                    const normalized = roughStep / Math.pow(10, magnitude);
                    let roundedNormalized = 1;
                    
                    if (normalized > 5) roundedNormalized = 10;
                    else if (normalized > 2) roundedNormalized = 5;
                    else if (normalized > 1) roundedNormalized = 2;
                    
                    return roundedNormalized * Math.pow(10, magnitude);
                  }
                  
                  // For revenue, use original logic
                  if (range < 10) return 1;
                  if (range < 50) return 5;
                  if (range < 100) return 10;
                  if (range < 500) return 50;
                  if (range < 1000) return 100;
                  if (range < 10000) return 1000;
                  if (range < 100000) return 10000;
                  return Math.ceil(range / 5 / 10000) * 10000;
                })(),
              },
              // Right Y-axis: Selected product revenue/quantity
              {
                id: 'productAxis',
                position: 'right' as const,
                label: metric === 'Revenue' ? 'Product Revenue (M)' : 'Product Quantity',
                valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                  if (context.location === 'tick') {
                    if (metric === 'Revenue') {
                      if (value >= 1000000) {
                        const mValue = value / 1000000;
                        return mValue % 1 === 0 ? `₹${mValue.toFixed(0)}M` : `₹${mValue.toFixed(1)}M`;
                      }
                      if (value >= 1000) {
                        const kValue = value / 1000;
                        return kValue % 1 === 0 ? `₹${kValue.toFixed(0)}K` : `₹${kValue.toFixed(1)}K`;
                      }
                      return `₹${value.toFixed(0)}`;
                    }
                    if (value >= 1000000) {
                      const mValue = value / 1000000;
                      return mValue % 1 === 0 ? `${mValue.toFixed(0)}M` : `${mValue.toFixed(1)}M`;
                    }
                    if (value >= 1000) {
                      const kValue = value / 1000;
                      return kValue % 1 === 0 ? `${kValue.toFixed(0)}K` : `${kValue.toFixed(1)}K`;
                    }
                    return value.toFixed(0);
                  }
                  if (metric === 'Revenue') {
                    return `₹${value.toLocaleString('en-IN')}`;
                  }
                  return value.toLocaleString('en-IN');
                },
                min: 0,
                tickMinStep: (() => {
                  const productData = data.filter(d => d.type.includes('Product'));
                  const allValues = productData.map(d => d.value || 0);
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
                  if (range < 100000) return 10000;
                  return Math.ceil(range / 5 / 10000) * 10000;
                })(),
              }
            ]}
            series={(() => {
              // Financial year order: Apr to Mar
              const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
              
              // Get unique customer IDs from data
              const customerIds = [...new Set(
                data
                  .filter(d => d.type.includes('Overall'))
                  .map(d => {
                    const match = d.type.match(/Customer (\d+)/);
                    return match ? parseInt(match[1]) : null;
                  })
                  .filter(id => id !== null)
              )] as number[];
              
              const allSeries: any[] = [];
              
              // Create series for the customer
              customerIds.forEach((customerId) => {
                // Use colors for single customer
                const overallColor = CUSTOMER_COLORS.customerOverall;
                const productColor = CUSTOMER_COLORS.customerProduct;
                
                // Overall series (left axis)
                const overallData = data.filter(d => 
                  d.type.includes(`Customer ${customerId} Overall`)
                );
                if (overallData.length > 0) {
                  const monthValueMap = new Map(overallData.map(d => [d.month, d.value]));
                  const alignedData = months.map(month => monthValueMap.get(month) || null);
                  
                  allSeries.push({
                    data: alignedData,
                    label: `Customer ${customerId} (All Products)`,
                    curve: 'linear' as const,
                    showMark: showLabels,
                    color: overallColor,
                    strokeWidth: 3,
                    connectNulls: true,
                    yAxisId: 'overallAxis',
                    valueFormatter: (value: number | null) =>
                      metric === 'Revenue'
                        ? `₹${(value || 0).toLocaleString('en-IN')}`
                        : (value?.toLocaleString('en-IN') || '0'),
                  });
                }
                
                // Product-specific series (right axis)
                const productData = data.filter(d => 
                  d.type.includes(`Customer ${customerId} Product`)
                );
                if (productData.length > 0) {
                  const monthValueMap = new Map(productData.map(d => [d.month, d.value]));
                  const alignedData = months.map(month => monthValueMap.get(month) || null);
                  
                  // Extract product ID from type
                  const productMatch = productData[0].type.match(/Product (\d+)/);
                  const productId = productMatch ? productMatch[1] : selectedProduct;
                  
                  allSeries.push({
                    data: alignedData,
                    label: `Customer ${customerId} (Product ${productId})`,
                    curve: 'linear' as const,
                    showMark: showLabels,
                    color: productColor,
                    strokeWidth: 2,
                    strokeDasharray: '5 5', // Dashed line for product-specific
                    connectNulls: true,
                    yAxisId: 'productAxis',
                    valueFormatter: (value: number | null) =>
                      metric === 'Revenue'
                        ? `₹${(value || 0).toLocaleString('en-IN')}`
                        : (value?.toLocaleString('en-IN') || '0'),
                  });
                }
              });
              
              return allSeries;
            })()}
            margin={{ top: 10, right: 120, bottom: 50, left: 80 }}
            grid={{ vertical: false, horizontal: true }}
            slotProps={{
              legend: {
                direction: "horizontal",
                position: {
                  vertical: 'top',
                  horizontal: "center"
                }
              }
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default CustomerBehaviour;

import React, { useState, useEffect } from 'react';
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
  Autocomplete,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import type { AxisValueFormatterContext } from '@mui/x-charts/internals';
import { productBehaviourApi } from '../api';
import { ABC_COLORS } from '../constants/constants';
import type { ProductListItem, ProductBehaviourDataPoint } from '../api/types';

const ProductBehaviour: React.FC = () => {
  const [financialYear, setFinancialYear] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [abcClass, setAbcClass] = useState<'A' | 'B' | 'C'>('A');
  const [metric, setMetric] = useState<'Revenue' | 'Quantity'>('Revenue');
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showLabels, setShowLabels] = useState(true);
  const [data, setData] = useState<ProductBehaviourDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Fetch available years on mount
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const response = await productBehaviourApi.getAvailableYears();
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

  // Fetch products when FY or ABC class changes
  useEffect(() => {
    if (!financialYear) return; // Don't fetch if year not selected yet
    
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const result = await productBehaviourApi.getProducts(financialYear, abcClass);
        setProducts(result);
        // Keep existing selections that are still valid
        const validProductIds = result.map(p => p.product_id);
        setSelectedProducts(prev => prev.filter(id => validProductIds.includes(id)));
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [financialYear, abcClass]);

  // Fetch trend data when products are selected
  useEffect(() => {
    if (selectedProducts.length === 0) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch data for each selected product and combine
        const allResults = await Promise.all(
          selectedProducts.map(productId =>
            productBehaviourApi.getTrend(financialYear, abcClass, productId, metric)
          )
        );
        setData(allResults.flat());
      } catch (error) {
        console.error('Error fetching product behaviour:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [financialYear, abcClass, selectedProducts, metric]);

  return (
    <Box display="flex" flexDirection="column" height="100%" p={2.5}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Product Behavior vs Class Trend
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
        <FormControl size="small" sx={{ minWidth: 150 }}>
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

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>ABC Class</InputLabel>
          <Select
            value={abcClass}
            label="ABC Class"
            onChange={(e) => setAbcClass(e.target.value as 'A' | 'B' | 'C')}
          >
            <MenuItem value="A">A</MenuItem>
            <MenuItem value="B">B</MenuItem>
            <MenuItem value="C">C</MenuItem>
          </Select>
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
          <Box display="flex" gap={1} alignItems="center">
            <Autocomplete
              multiple
              size="small"
              sx={{ minWidth: 300, flex: 1 }}
              options={products}
              getOptionLabel={(option) => `Product ${option.product_id}`}
              value={products.filter(p => selectedProducts.includes(p.product_id))}
              onChange={(_, newValue) => setSelectedProducts(newValue.map(v => v.product_id))}
              loading={loadingProducts}
              limitTags={2}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Products"
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
              onClick={() => setSelectedProducts(products.map(p => p.product_id))}
              disabled={loadingProducts || products.length === 0}
            >
              Select All
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedProducts([])}
              disabled={selectedProducts.length === 0}
            >
              Deselect All
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
      ) : selectedProducts.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <Typography color="text.secondary">
            Select products to view behavior analysis
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
              data: [...new Set(data.map(d => d.month))],
            }]}
            yAxis={[
              {
                id: 'classAxis',
                scaleType: 'linear',
                position: 'left',
                label: metric === 'Revenue' ? 'Class Total (M)' : 'Class Total',
                valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                  if (context.location === 'tick') {
                    // Keep format short - max 4 chars
                    if (metric === 'Revenue') {
                      const mValue = value / 1000000;
                      if (mValue >= 1000) return `${(mValue / 1000).toFixed(0)}B`;
                      if (mValue >= 10) return `${mValue.toFixed(0)}M`;
                      return `${mValue.toFixed(1)}M`;
                    }
                    // For quantity with unit suffix
                    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return `${value.toFixed(0)}`;
                  }
                  // Full format for tooltips
                  if (metric === 'Revenue') {
                    return `₹${(value / 1000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}M`;
                  }
                  return value.toLocaleString('en-IN');
                },
                min: 0,
                tickLabelStyle: {
                  fontSize: 11,
                  textAnchor: 'end',
                },
                tickMinStep: (() => {
                  // Calculate dynamic tick step based on data range
                  const classData = data.filter(d => d.type.startsWith('Class')).map(d => d.value);
                  const maxVal = Math.max(...classData);
                  const minVal = Math.min(...classData);
                  const range = maxVal - minVal;
                  
                  // If range is very small (like all zeros or very close values), use appropriate step
                  if (range < 10) return 1;
                  if (range < 100) return 10;
                  if (range < 1000) return 100;
                  return Math.ceil(range / 5 / 1000) * 1000; // Divide into ~5 steps
                })(),
              },
              {
                id: 'productAxis',
                scaleType: 'linear',
                position: 'right',
                label: metric === 'Revenue' ? 'Product (M)' : 'Product',
                valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                  if (context.location === 'tick') {
                    // Keep format short - max 4 chars total
                    if (metric === 'Revenue') {
                      const mValue = value / 1000000;
                      if (mValue >= 1000) return `${(mValue / 1000).toFixed(0)}B`;
                      if (mValue >= 10) return `${mValue.toFixed(0)}M`;
                      if (mValue >= 1) return `${mValue.toFixed(1)}M`;
                      // For < 1M, show as decimal but keep short
                      return `${mValue.toFixed(1)}M`;
                    }
                    // For quantity with unit suffix
                    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return `${value.toFixed(0)}`
                  }
                  // Full format for tooltips
                  if (metric === 'Revenue') {
                    return `₹${(value / 1000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}M`;
                  }
                  return value.toLocaleString('en-IN');
                },
                min: 0,
                tickLabelStyle: {
                  fontSize: 11,
                  textAnchor: 'start',
                },
                tickMinStep: (() => {
                  // Calculate dynamic tick step based on data range
                  const productData = data.filter(d => !d.type.startsWith('Class')).map(d => d.value);
                  if (productData.length === 0) return 1;
                  
                  const maxVal = Math.max(...productData);
                  const minVal = Math.min(...productData);
                  const range = maxVal - minVal;
                  
                  // If range is very small (like all zeros or very close values), use appropriate step
                  if (range < 10) return 1;
                  if (range < 100) return 10;
                  if (range < 1000) return 100;
                  return Math.ceil(range / 5 / 1000) * 1000; // Divide into ~5 steps
                })(),
              },
            ]}
            series={(() => {
              const types = [...new Set(data.map(d => d.type))];
              return types.map((type) => {
                const isClassTotal = type.startsWith('Class');
                let color;
                let strokeWidth;
                
                if (isClassTotal) {
                  // Match 'Class A Total', 'Class B Total', 'Class C Total'
                  const match = type.match(/Class\s([ABC])\sTotal/i);
                  if (match) {
                    color = ABC_COLORS[match[1] as 'A' | 'B' | 'C'];
                  }
                  strokeWidth = 2;
                } else {
                  // Product lines use Overall color
                  color = ABC_COLORS.Overall;
                  strokeWidth = 1.5;
                }
                return {
                  data: data.filter(d => d.type === type).map(d => d.value),
                  label: type,
                  curve: 'linear' as const,
                  showMark: showLabels,
                  yAxisId: isClassTotal ? 'classAxis' : 'productAxis',
                  color,
                  strokeWidth,
                  valueFormatter: (value: number | null) => {
                    if (value === null || value === undefined) return '';
                    if (metric === 'Revenue') {
                      return `₹${(value / 1000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}M`;
                    }
                    return value.toLocaleString('en-IN');
                  },
                };
              });
            })()}
            margin={{ top: 20, right: 100, bottom: 50, left: 100 }}
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
            hideLegend={data.length > 50} />
        </Box>
      )}
    </Box>
  );
};

export default ProductBehaviour;

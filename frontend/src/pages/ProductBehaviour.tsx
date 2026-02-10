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
  Autocomplete,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Grid,
  Paper,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import type { AxisValueFormatterContext } from '@mui/x-charts/internals';
import { productBehaviourApi } from '../api';
import { ABC_COLORS } from '../constants/constants';
import type { ProductListItem, ProductBehaviourDataPoint } from '../api/types';

// Colors for multi-product charts - distinctive colors that stand out from ABC colors
const PRODUCT_COLORS = ['#FF6B9D', '#00D9FF', '#FFB800', '#A855F7'];

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
        // Convert month dates to month names
        const processedData = allResults.flat().map(item => ({
          ...item,
          month: new Date(item.month).toLocaleDateString('en-US', { month: 'short' })
        }));
        setData(processedData);
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
              options={groupedProducts}
              getOptionLabel={(option) => {
                const names = option.product_names.length > 0 
                  ? option.product_names.join(', ') 
                  : 'No Name';
                return `${option.product_id} - ${names}`;
              }}
              value={groupedProducts.filter(p => selectedProducts.includes(p.product_id))}
              onChange={(_, newValue) => {
                // Limit to max 4 products
                if (newValue.length <= 4) {
                  setSelectedProducts(newValue.map(v => v.product_id));
                }
              }}
              loading={loadingProducts}
              limitTags={2}
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
              onClick={() => setSelectedProducts(groupedProducts.map(p => p.product_id))}
              disabled={loadingProducts || groupedProducts.length === 0}
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
            Select up to 4 products to view behavior analysis
          </Typography>
        </Box>
      ) : data.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <Typography color="text.secondary">No data available</Typography>
        </Box>
      ) : (
        <Box flex={1} minHeight={0}>
          <Grid container spacing={2}>
            {selectedProducts.map((productId, index) => {
              const productData = data.filter(d => 
                d.type === `Product ${productId}` || d.type.startsWith('Class')
              );
              const productColor = PRODUCT_COLORS[index % PRODUCT_COLORS.length];
              const productInfo = groupedProducts.find(p => p.product_id === productId);
              const productLabel = productInfo?.product_names.length ? productInfo.product_names.join(', ') : `Product ${productId}`;
              
              return (
                <Grid size={{ xs: 12, md: selectedProducts.length === 1 ? 12 : 6 }} key={productId}>
                  <Paper sx={{ p: 2, height: selectedProducts.length === 1 ? 500 : 350 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: productColor }}>
                      {productId} - {productLabel}
                    </Typography>
                    {productData.length === 0 ? (
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
                            id: 'classAxis',
                            label: metric === 'Revenue' ? 'Class Total (Cr)' : 'Class Total',
                            width: 110,
                            valueFormatter: (value: number, context: AxisValueFormatterContext) => {
                              if (context.location === 'tick') {
                                if (metric === 'Revenue') {
                                  const crValue = value / 10000000;
                                  if (crValue >= 100) return `₹${crValue.toFixed(0)}Cr`;
                                  if (crValue >= 1) return `₹${crValue.toFixed(2)}Cr`;
                                  return `₹${crValue.toFixed(4)}Cr`;
                                }
                                if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                return `${value.toFixed(0)}`;
                              }
                              if (metric === 'Revenue') {
                                const crValue = value / 10000000;
                                return `₹${crValue.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} Cr`;
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
                          const types = [...new Set(productData.map(d => d.type))];
                          return types.map((type) => {
                            const isClassTotal = type.startsWith('Class');
                            let color;
                            let strokeWidth;
                            
                            if (isClassTotal) {
                              const match = type.match(/Class\s([ABC])\sTotal/i);
                              if (match) {
                                color = ABC_COLORS[match[1] as 'A' | 'B' | 'C'];
                              }
                              strokeWidth = 2;
                            } else {
                              color = productColor;
                              strokeWidth = 2;
                            }
                            
                            // Create month->value map for this type
                            const monthValueMap = new Map(
                              productData.filter(d => d.type === type).map(d => [d.month, d.value])
                            );
                            // Align data with fixed month array
                            const alignedData = months.map(month => monthValueMap.get(month) || null);
                            
                            return {
                              data: alignedData,
                              label: type === `Product ${productId}` ? productLabel : type,
                              curve: 'linear' as const,
                              showMark: showLabels,
                              yAxisId: isClassTotal ? 'classAxis' : 'productAxis',
                              color,
                              strokeWidth,
                              strokeDasharray: isClassTotal ? undefined : '5 5',
                              connectNulls: true,
                              valueFormatter: (value: number | null) => {
                                if (value === null || value === undefined) return '';
                                if (metric === 'Revenue') {
                                  if (isClassTotal) {
                                    const crValue = value / 10000000;
                                    return `₹${crValue.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} Cr`;
                                  } else {
                                    // Product axis - use lakhs/thousands
                                    if (value >= 10000000) return `₹${(value / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
                                    if (value >= 100000) return `₹${(value / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
                                    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                                  }
                                }
                                return value.toLocaleString('en-IN');
                              },
                            };
                          });
                        })()}
                        height={selectedProducts.length === 1 ? 450 : 300}
                        margin={{ top: 10, right: 0, bottom: 40, left: 0 }}
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

export default ProductBehaviour;

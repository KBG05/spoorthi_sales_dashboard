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
import { productBehaviourApi } from '../api';
import type { ProductListItem, ProductBehaviourDataPoint } from '../api/types';

const ProductBehaviour: React.FC = () => {
  const [financialYear, setFinancialYear] = useState('FY24-25');
  const [abcClass, setAbcClass] = useState<'A' | 'B' | 'C'>('A');
  const [metric, setMetric] = useState<'Revenue' | 'Quantity'>('Revenue');
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showLabels, setShowLabels] = useState(false);
  const [data, setData] = useState<ProductBehaviourDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Fetch products when FY or ABC class changes
  useEffect(() => {
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
          >
            <MenuItem value="FY23-24">FY23-24</MenuItem>
            <MenuItem value="FY24-25">FY24-25</MenuItem>
            <MenuItem value="FY25-26">FY25-26</MenuItem>
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
        <Box flex={1} minHeight={0}>
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
                label: metric === 'Revenue' ? 'Class Total (Cr)' : 'Class Total',
                valueFormatter: (value: number) => {
                  if (metric === 'Revenue') {
                    return `₹${(value / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`;
                  }
                  return value.toLocaleString('en-IN');
                },
              },
              {
                id: 'productAxis',
                scaleType: 'linear',
                position: 'right',
                label: metric === 'Revenue' ? 'Product (Cr)' : 'Product',
                valueFormatter: (value: number) => {
                  if (metric === 'Revenue') {
                    return `₹${(value / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`;
                  }
                  return value.toLocaleString('en-IN');
                },
              },
            ]}
            series={(() => {
              const types = [...new Set(data.map(d => d.type))];
              return types.map((type) => {
                const isClassTotal = type.startsWith('Class');
                return {
                  data: data.filter(d => d.type === type).map(d => d.value),
                  label: type,
                  curve: 'linear' as const,
                  showMark: showLabels,
                  yAxisId: isClassTotal ? 'classAxis' : 'productAxis',
                  valueFormatter: (value: number | null) => {
                    if (value === null || value === undefined) return '';
                    if (metric === 'Revenue') {
                      return `₹${(value / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
                    }
                    return value.toLocaleString('en-IN');
                  },
                };
              });
            })()}
            leftAxis="classAxis"
            rightAxis="productAxis"
            margin={{ top: 10, right: 100, bottom: 50, left: 100 }}
            grid={{ vertical: false, horizontal: true }}
            slotProps={{
              legend: {
                hidden: data.length > 50,
                direction: 'row',
                position: { vertical: 'top', horizontal: 'middle' },
                padding: 0,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default ProductBehaviour;

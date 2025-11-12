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
  FormGroup,
  Button,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { customerBehaviourApi } from '../api';
import type { CustomerListItem, ProductListItem, CustomerBehaviourDataPoint } from '../api/types';

const CustomerBehaviour: React.FC = () => {
  const [financialYear, setFinancialYear] = useState('FY24-25');
  const [abcClasses, setAbcClasses] = useState<string[]>(['A']);
  const [metric, setMetric] = useState<'Revenue' | 'Quantity'>('Revenue');
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showLabels, setShowLabels] = useState(false);
  const [data, setData] = useState<CustomerBehaviourDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Fetch customers when FY or ABC classes change
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const result = await customerBehaviourApi.getCustomers(
          financialYear,
          abcClasses.join(',')
        );
        setCustomers(result);
        // Keep existing selections that are still valid
        const validCustomerIds = result.map(c => c.customer_id);
        setSelectedCustomers(prev => prev.filter(id => validCustomerIds.includes(id)));
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

  // Fetch products when customers are selected
  useEffect(() => {
    if (selectedCustomers.length === 0) {
      setProducts([]);
      setSelectedProducts([]);
      return;
    }

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const result = await customerBehaviourApi.getProducts(
          financialYear,
          selectedCustomers.join(',')
        );
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
  }, [financialYear, selectedCustomers]);

  // Fetch trend data when products are selected
  useEffect(() => {
    if (selectedCustomers.length === 0 || selectedProducts.length === 0) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await customerBehaviourApi.getTrend(
          financialYear,
          selectedCustomers.join(','),
          selectedProducts.join(','),
          metric
        );
        setData(result);
      } catch (error) {
        console.error('Error fetching customer behaviour:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [financialYear, selectedCustomers, selectedProducts, metric]);

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
          <Box display="flex" gap={1} alignItems="center">
            <Autocomplete
              multiple
              size="small"
              sx={{ minWidth: 300, flex: 1 }}
              options={customers}
              getOptionLabel={(option) => `Customer ${option.customer_id}`}
              value={customers.filter(c => selectedCustomers.includes(c.customer_id))}
              onChange={(_, newValue) => setSelectedCustomers(newValue.map(v => v.customer_id))}
              loading={loadingCustomers}
              limitTags={2}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Customers"
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
              onClick={() => setSelectedCustomers(customers.map(c => c.customer_id))}
              disabled={loadingCustomers || customers.length === 0}
            >
              Select All
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedCustomers([])}
              disabled={selectedCustomers.length === 0}
            >
              Deselect All
            </Button>
          </Box>
        </Box>

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
              disabled={selectedCustomers.length === 0}
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
              disabled={loadingProducts || products.length === 0 || selectedCustomers.length === 0}
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
      ) : selectedCustomers.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <Typography color="text.secondary">
            Select customers and products to view behavior analysis
          </Typography>
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
            yAxis={[{
              valueFormatter: (value: number) => {
                if (metric === 'Revenue') {
                  return `${value.toFixed(0)}M`;
                }
                return value.toLocaleString();
              },
            }]}
            series={[...new Set(data.map(d => d.type))].map(type => ({
              data: data.filter(d => d.type === type).map(d => d.value),
              label: type,
              curve: 'linear',
              showMark: showLabels,
              valueFormatter: (value) =>
                metric === 'Revenue'
                  ? `₹${((value || 0) / 1_000_000).toFixed(2)}M`
                  : (value?.toLocaleString() || '0'),
            }))}
            margin={{ top: 10, right: 30, bottom: 50, left: 100 }}
            grid={{ vertical: false, horizontal: true }}
            slotProps={{
              legend: {
                hidden: data.length > 50, // Hide legend if too many series
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

export default CustomerBehaviour;

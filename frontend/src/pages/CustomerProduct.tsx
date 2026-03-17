import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  Autocomplete,
  TextField,
  Paper,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { customerProductApi } from '../api';
import type { CustomerProductRow } from '../api/types';

const CustomerProduct: React.FC = () => {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [customers, setCustomers] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [articles, setArticles] = useState<string[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [data, setData] = useState<CustomerProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load available dates on mount
  useEffect(() => {
    const fetchDates = async () => {
      try {
        const result = await customerProductApi.getDates();
        setDates(result.dates);
        if (result.dates.length > 0) {
          setSelectedDate(result.dates[0]); // latest
        }
      } catch (error) {
        console.error('Error fetching dates:', error);
      }
    };
    fetchDates();
  }, []);

  // Load customers when date changes
  useEffect(() => {
    if (!selectedDate) return;
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const result = await customerProductApi.getCustomers(selectedDate);
        setCustomers(result.customers);
        setSelectedCustomer(null);
        setSelectedArticle(null);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, [selectedDate]);

  // Load articles when customer changes
  useEffect(() => {
    if (!selectedDate) return;
    const fetchArticles = async () => {
      try {
        const result = await customerProductApi.getArticles(
          selectedDate,
          selectedCustomer ?? undefined,
        );
        setArticles(result.articles);
        setSelectedArticle(null);
      } catch (error) {
        console.error('Error fetching articles:', error);
      }
    };
    fetchArticles();
  }, [selectedDate, selectedCustomer]);

  // Load table data
  useEffect(() => {
    if (!selectedDate) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await customerProductApi.getData(
          selectedDate,
          selectedCustomer ?? undefined,
          selectedArticle ?? undefined,
        );
        setData(result.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDate, selectedCustomer, selectedArticle]);

  // Client-side search filtering
  const filteredRows = useMemo(() => {
    if (!debouncedSearch) return data;
    const q = debouncedSearch.toLowerCase();
    return data.filter(
      (row) =>
        row.customer_name.toLowerCase().includes(q) ||
        row.article_no.toLowerCase().includes(q) ||
        row.last_purchase_date.includes(q),
    );
  }, [data, debouncedSearch]);

  const columns: GridColDef[] = [
    {
      field: 'customer_name',
      headerName: 'Customer Name',
      flex: 2,
      minWidth: 250,
    },
    {
      field: 'article_no',
      headerName: 'Article No',
      flex: 0.8,
      minWidth: 150,
    },
    {
      field: 'last_purchase_date',
      headerName: 'Last Purchase Date',
      flex: 1,
      minWidth: 150,
    },
  ];

  const title = selectedCustomer
    ? selectedArticle
      ? `Showing Product List for: ${selectedCustomer} | Article: ${selectedArticle}`
      : `Showing Product List for: ${selectedCustomer}`
    : 'Showing Product List for All Customers';

  return (
    <Box display="flex" flexDirection="column" height="100%" minHeight={0} overflow="hidden" p={2.5}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Customer Product List
      </Typography>

      {/* Filters */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 2,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Prediction Month</InputLabel>
          <Select
            value={selectedDate}
            label="Prediction Month"
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={dates.length === 0}
          >
            {dates.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Autocomplete
          size="small"
          sx={{ minWidth: 300 }}
          options={customers}
          value={selectedCustomer}
          onChange={(_, val) => setSelectedCustomer(val)}
          loading={loadingCustomers}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select a Customer"
              placeholder="All Customers"
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

        <Autocomplete
          size="small"
          sx={{ minWidth: 200 }}
          options={articles}
          value={selectedArticle}
          onChange={(_, val) => setSelectedArticle(val)}
          renderInput={(params) => (
            <TextField {...params} label="Select an Article" placeholder="All Articles" />
          )}
        />
      </Box>

      {/* Search + Count */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search by customer or article..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 350 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Typography variant="body2" color="text.secondary">
          {filteredRows.length.toLocaleString()} records found
        </Typography>
      </Box>

      {/* Title */}
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
        {title}
      </Typography>

      {/* DataGrid */}
      <Paper
        elevation={1}
        sx={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <DataGrid
          rows={filteredRows.map((row, idx) => ({ id: idx, ...row }))}
          columns={columns}
          loading={loading}
          pageSizeOptions={[25, 50, 100, 200]}
          initialState={{
            pagination: { paginationModel: { pageSize: 50 } },
          }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: false,
              printOptions: { disableToolbarButton: true },
              csvOptions: { disableToolbarButton: false },
            },
          }}
          getRowId={(row) => row.id}
          sx={{
            border: 'none',
            height: '100%',
            '& .MuiDataGrid-cell': {
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRight: '1px solid',
              borderColor: 'divider',
              py: 1.5,
            },
            '& .MuiDataGrid-columnHeaders': {
              fontWeight: 600,
              bgcolor: 'background.paper',
              borderBottom: '2px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-columnHeader': {
              borderRight: '1px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-columnSeparator': {
              display: 'none',
            },
          }}
          disableRowSelectionOnClick
          rowHeight={48}
        />
      </Paper>
    </Box>
  );
};

export default CustomerProduct;

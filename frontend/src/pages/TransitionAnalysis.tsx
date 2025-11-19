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
  Paper,
  Typography,
  TextField,
  ListSubheader,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { transitionAnalysisApi } from '../api';
import type { TransitionAnalysisResponse } from '../api/types';

const TransitionAnalysis: React.FC = () => {
  const [analysisType, setAnalysisType] = useState<'Products' | 'Customers'>('Products');
  const [financialYear, setFinancialYear] = useState('FY24-25');
  const [data, setData] = useState<TransitionAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [searchTexts, setSearchTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await transitionAnalysisApi.getTransitions(analysisType, financialYear);
        setData(result);
      } catch (error) {
        console.error('Error fetching transition analysis:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [analysisType, financialYear]);

  const columns: GridColDef[] = useMemo(() => {
    if (!data) return [];

    return data.column_headers.map((header, index) => ({
      field: header,
      headerName: header,
      width: index === 0 ? 225 : 180,
      minWidth: index === 0 ? 180 : 150,
      renderCell: (params) => {
        const value = params.value;
        let bgColor = 'inherit';
        
        // Apply color coding for Category columns
        if (header.startsWith('Category_')) {
          if (value === 'A') {
            bgColor = 'rgba(0, 210, 91, 0.1)';
          } else if (value === 'B') {
            bgColor = 'rgba(94, 114, 228, 0.1)';
          } else if (value === 'C') {
            bgColor = 'rgba(252, 171, 0, 0.1)';
          }
        }

        return (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: bgColor,
              px: 1,
            }}
          >
            {value}
          </Box>
        );
      },
    }));
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.data.map((row, index) => ({
      id: index,
      ...row,
    }));
  }, [data]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    
    return rows.filter((row) => {
      return Object.entries(columnFilters).every(([column, filterValue]) => {
        if (!filterValue) return true;
        const cellValue = String((row as any)[column] || '');
        return cellValue === filterValue;
      });
    });
  }, [rows, columnFilters, data]);

  const getUniqueValues = (columnName: string) => {
    if (!data) return [];
    const values = rows.map(row => (row as any)[columnName]).filter(Boolean);
    return [...new Set(values)].sort();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box display="flex" flexDirection="column" height="100%" p={2.5}>
        <Typography>No transition data available</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" height="100%" p={2.5}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        ABC Category Transition Analysis
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
          alignItems: 'center'
        }}
      >
        <ToggleButtonGroup
          value={analysisType}
          exclusive
          onChange={(_, value) => value && setAnalysisType(value)}
          size="small"
        >
          <ToggleButton value="Products">Products</ToggleButton>
          <ToggleButton value="Customers">Customers</ToggleButton>
        </ToggleButtonGroup>

        {analysisType === 'Customers' && (
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
        )}

        {/* Column Filters */}
        {data && data.column_headers.map((header) => {
          const uniqueValues = getUniqueValues(header);
          const searchText = searchTexts[header] || '';
          const filteredValues = uniqueValues.filter(value =>
            String(value).toLowerCase().includes(searchText.toLowerCase())
          );

          return (
            <FormControl key={header} size="small" sx={{ minWidth: 250 }}>
              <InputLabel>{header}</InputLabel>
              <Select
                value={columnFilters[header] || ''}
                label={header}
                onChange={(e) => {
                  setColumnFilters(prev => ({
                    ...prev,
                    [header]: e.target.value,
                  }));
                }}
                onClose={() => {
                  setSearchTexts(prev => ({ ...prev, [header]: '' }));
                }}
                MenuProps={{
                  autoFocus: false,
                  PaperProps: {
                    style: {
                      maxHeight: 400,
                    },
                  },
                }}
              >
                <ListSubheader>
                  <TextField
                    size="small"
                    autoFocus
                    placeholder="Type to search..."
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    value={searchText}
                    onChange={(e) => {
                      setSearchTexts(prev => ({
                        ...prev,
                        [header]: e.target.value,
                      }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Escape') {
                        e.stopPropagation();
                      }
                    }}
                  />
                </ListSubheader>
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                {filteredValues.map((value) => (
                  <MenuItem key={String(value)} value={String(value)}>
                    {String(value)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        })}
      </Box>

      {/* Table Section */}
      <Paper elevation={1} sx={{ flex: 1, width: '100%', maxWidth: 1200, mx: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: false,
              printOptions: { disableToolbarButton: true },
              csvOptions: { disableToolbarButton: false },
            },
          }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': {
              fontSize: '0.875rem',
              padding: '8px',
              borderRight: '1px solid',
              borderColor: 'divider',
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
          rowHeight={52}
        />
      </Paper>
    </Box>
  );
};

export default TransitionAnalysis;

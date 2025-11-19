import { useEffect, useState, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TextField,
  ListSubheader,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { crossSellApi } from '../api';
import type { CrossSellRecommendation } from '../api/types';

const CrossSell = () => {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<CrossSellRecommendation[]>([]);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [searchTexts, setSearchTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await crossSellApi.getRecommendations();
        setRecommendations(data);
      } catch (error) {
        console.error('Error fetching cross-sell recommendations:', error);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const columns: GridColDef[] = [
    {
      field: 'customer',
      headerName: 'Distributor',
      width: 270,
      minWidth: 200,
    },
    {
      field: 'products_purchased',
      headerName: 'Products Purchased',
      flex: 1,
      minWidth: 350,
      wrapText: true,
      renderCell: (params) => (
        <Box sx={{ 
          whiteSpace: 'normal', 
          lineHeight: '1.5',
          py: 1,
        }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'recommendations',
      headerName: 'Recommendations',
      flex: 1,
      minWidth: 350,
      wrapText: true,
      renderCell: (params) => (
        <Box sx={{ 
          whiteSpace: 'normal', 
          lineHeight: '1.5',
          py: 1,
          fontWeight: 500, 
          color: 'primary.main' 
        }}>
          {params.value}
        </Box>
      ),
    },
  ];

  const rows = recommendations.map((rec, index) => ({
    id: index,
    customer: rec.customer,
    products_purchased: rec.products_purchased,
    recommendations: rec.recommendations,
  }));

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      return Object.entries(columnFilters).every(([column, filterValue]) => {
        if (!filterValue) return true;
        const cellValue = String((row as any)[column] || '');
        return cellValue === filterValue;
      });
    });
  }, [rows, columnFilters]);

  const getUniqueValues = (columnName: string) => {
    const values = rows.map(row => (row as any)[columnName]).filter(Boolean);
    return [...new Set(values)].sort();
  };

  const filterableColumns = [
    { field: 'customer', label: 'Distributor' },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', p: 2.5 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        Cross-Sell Analysis
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Product recommendations based on purchase patterns across distributors
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
        {filterableColumns.map(({ field, label }) => {
          const uniqueValues = getUniqueValues(field);
          const searchText = searchTexts[field] || '';
          const filteredValues = uniqueValues.filter(value =>
            String(value).toLowerCase().includes(searchText.toLowerCase())
          );

          return (
            <FormControl key={field} size="small" sx={{ minWidth: 250 }}>
              <InputLabel>{label}</InputLabel>
              <Select
                value={columnFilters[field] || ''}
                label={label}
                onChange={(e) => {
                  setColumnFilters(prev => ({
                    ...prev,
                    [field]: e.target.value,
                  }));
                }}
                onClose={() => {
                  setSearchTexts(prev => ({ ...prev, [field]: '' }));
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
                        [field]: e.target.value,
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

      <Paper elevation={1} sx={{ flex: 1, width: '100%', maxWidth: 1400, mx: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
          getRowHeight={() => 'auto'}
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': {
              fontSize: '0.875rem',
              borderRight: '1px solid',
              borderColor: 'divider',
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
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
        />
      </Paper>
    </Box>
  );
};

export default CrossSell;

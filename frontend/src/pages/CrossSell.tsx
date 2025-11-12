import { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { crossSellApi } from '../api';
import type { CrossSellRecommendation } from '../api/types';

const CrossSell = () => {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<CrossSellRecommendation[]>([]);

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
      width: 520,
      minWidth: 350,
    },
    {
      field: 'recommendations',
      headerName: 'Recommendations',
      width: 520,
      minWidth: 350,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 500, color: 'primary.main' }}>
          {params.value}
        </Typography>
      ),
    },
  ];

  const rows = recommendations.map((rec, index) => ({
    id: index,
    customer: rec.customer,
    products_purchased: rec.products_purchased,
    recommendations: rec.recommendations,
  }));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        Cross-Sell Analysis
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Product recommendations based on purchase patterns across distributors
      </Typography>

      <Paper elevation={1} sx={{ flex: 1, width: '100%', maxWidth: 1400, mx: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': {
              fontSize: '0.875rem',
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
          rowHeight={52}
        />
      </Paper>
    </Box>
  );
};

export default CrossSell;

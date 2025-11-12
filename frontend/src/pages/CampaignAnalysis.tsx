import { Box, Typography, Alert } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const CampaignAnalysis = () => {
  return (
    <Box p={2.5}>
      <Typography variant="h5" gutterBottom>
        Campaign Analysis
      </Typography>
      
      <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mt: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          No Backend Endpoint Available
        </Typography>
        <Typography variant="body2">
          Campaign analysis functionality is currently unavailable because:
        </Typography>
        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
          <li>No backend API endpoint exists for campaign data</li>
          <li>Database may not contain campaign tracking tables</li>
          <li>Campaign feature requires additional data infrastructure</li>
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Contact your administrator to set up campaign tracking and analytics infrastructure.
        </Typography>
      </Alert>
    </Box>
  );
};

export default CampaignAnalysis;

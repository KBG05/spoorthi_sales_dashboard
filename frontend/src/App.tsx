import { Routes, Route, Navigate } from 'react-router';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { AppLayout } from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import TrendAnalysis from './pages/TrendAnalysis';
import CustomerBehaviour from './pages/CustomerBehaviour';
import ProductBehaviour from './pages/ProductBehaviour';
import CrossSell from './pages/CrossSell';
import TopPerformance from './pages/TopPerformance';
import TicketSize from './pages/TicketSize';
import Forecast from './pages/Forecast';
import TransitionAnalysis from './pages/TransitionAnalysis';
import ExportData from './pages/ExportData';
import CBA from './pages/CBA';
import CustomerClassComparison from './pages/CustomerClassComparison';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="trend-analysis" element={<TrendAnalysis />} />
        {/* Redirects for old routes */}
        <Route path="abc-analysis" element={<Navigate to="/trend-analysis" replace />} />
        <Route path="customer-trend" element={<Navigate to="/trend-analysis" replace />} />
        <Route path="customer-behaviour" element={<CustomerBehaviour />} />
        <Route path="cba" element={<CBA />} />
        <Route path="customer-class-comparison" element={<CustomerClassComparison />} />
        <Route path="ticket-size" element={<TicketSize />} />
        <Route path="product-behaviour" element={<ProductBehaviour />} />
        <Route path="transition-analysis" element={<TransitionAnalysis />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="top-performance" element={<TopPerformance />} />
        <Route path="cross-sell" element={<CrossSell />} />
        <Route path="export-data" element={<ExportData />} />
      </Route>
    </Routes>
  );
}

export default App;

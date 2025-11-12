import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Dev server proxy rules added so CAS (Central Authentication Service) routes
// and API calls are forwarded to the backend during development. This
// enables client-side routing to work when CAS redirects back to paths
// served by the SPA.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Custom plugin to handle SPA fallback in preview mode
    {
      name: 'spa-fallback',
      configurePreviewServer(server) {
        server.middlewares.use((req, _res, next) => {
          // Skip if it's an API or asset request
          if (
            req.url?.startsWith('/api') ||
            req.url?.startsWith('/cas') ||
            req.url?.includes('.') // has file extension
          ) {
            return next()
          }
          // Serve index.html for all other routes
          req.url = '/index.html'
          next()
        })
      },
    },
  ],
  base: '/',
  server: {
    // Allow network access (useful when testing on other devices)
    host: true,
    port: 5173,
    strictPort: false,
    // Proxy backend API and CAS routes to the FastAPI server in dev.
    // Adjust targets if your backend runs on a different host/port.
    proxy: {
      // Proxy API calls (optional rewrite if frontend uses /api prefix)
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Forward CAS endpoints (e.g. /cas/login, /cas/validate) directly
      '/cas': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 5173,
    // SPA fallback for preview builds - serve index.html for all routes
    strictPort: false,
    open: false,
    host: true,
  },
  // Configure Connect server middleware to handle SPA routing
  // All non-file requests (like /dashboard) will serve index.html
  appType: 'spa',
})

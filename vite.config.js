import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'ethers-vendor': ['ethers'],
          // Feature chunks
          'dashboard': [
            './src/components/Dashboard/StreamList',
            './src/components/Dashboard/StreamCard',
            './src/components/Dashboard/CreateStreamForm',
          ],
          'marketplace': [
            './src/components/Marketplace/OrderBook',
            './src/components/Marketplace/OrderBookRow',
            './src/components/Marketplace/CreateOrderForm',
          ],
          'analytics': [
            './src/components/Analytics/StreamAnalytics',
          ],
          'history': [
            './src/components/History/OrderHistory',
            './src/components/History/TradeHistory',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase limit slightly for better chunking
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://www.alphavantage.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/fmp': {
        target: 'https://financialmodelingprep.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fmp/, ''),
      },
    },
  },
  plugins: [react(), tailwind()],
})

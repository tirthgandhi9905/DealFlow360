import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://happy-beers-visit.loca.lt',
        changeOrigin: true,
        secure: false,
        headers: {
          'bypass-tunnel-reminder': 'true',
        },
      },
    },
  },
})

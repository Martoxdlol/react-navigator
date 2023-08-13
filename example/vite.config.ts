import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    watch: {
      ignored: ['!**/node_modules/react-navigator/**'],
    },
  },
  optimizeDeps: {
    exclude: ['react-navigator'],
  },
  plugins: [react()],
})

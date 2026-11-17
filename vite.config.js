import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: ['localhost', '127.0.0.1', '.e-kitobxon.uz', '.replit.dev', '.repl.co'],
  },
})

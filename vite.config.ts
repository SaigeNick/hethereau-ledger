import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the same build runs on Cloudflare Pages or any static host.
export default defineConfig({
  base: './',
  plugins: [react()],
})

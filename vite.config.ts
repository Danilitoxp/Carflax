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
    proxy: {
      '/api-marketing': {
        target: 'https://marketing-carflax.velbav.easypanel.host',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-marketing/, '')
      },
      '/api-campaign': {
        target: 'https://marketing-gestao-de-tempo.velbav.easypanel.host',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-campaign/, '')
      },
      '/secullum-auth': {
        target: 'https://autenticador.secullum.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/secullum-auth/, '')
      },
      '/secullum-api': {
        target: 'https://pontowebintegracaoexterna.secullum.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/secullum-api/, '')
      }
    }
  }
})

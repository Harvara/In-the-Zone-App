import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(() => {
  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: process.env.MANHUNT_BACKEND || 'http://host.docker.internal:8080',
          changeOrigin: true,
          configure(proxy) {
            proxy.on('proxyReq', request => { request.removeHeader('origin') })
          },
        },
      },
    },
  }
})

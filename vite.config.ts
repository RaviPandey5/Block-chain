import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.VITE_ALCHEMY_API_KEY': JSON.stringify(process.env.VITE_ALCHEMY_API_KEY),
    'process.env.VITE_CONTRACT_ADDRESS': JSON.stringify(process.env.VITE_CONTRACT_ADDRESS),
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
    include: ['ethers', 'wagmi', '@wagmi/core', 'viem'],
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      external: ['ethers'],
    },
  },
});

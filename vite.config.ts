import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 部署到 https://lvyiyiyi.github.io/star-math-hero/ 时的资源前缀
  // 本地开发 '/'; 生产构建 '/star-math-hero/'。也可用 VITE_BASE 覆盖（如部署到根路径）
  base: process.env.VITE_BASE ?? (process.env.NODE_ENV === 'production' ? '/star-math-hero/' : '/'),
  build: {
    target: 'es2022',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

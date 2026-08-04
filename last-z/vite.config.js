import { defineConfig } from 'vite';
export default defineConfig({
  root: '.',
  server: { host: true, port: 5199, strictPort: true },
  build: { target: 'es2020' }
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

/* PORT が指定されていればそれに従う（プレビュー環境向け） */
const port = Number(process.env.PORT) || 5173;

export default defineConfig({
  plugins: [react()],
  server: { port }
});

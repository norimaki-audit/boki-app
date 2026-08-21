import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

/* PORT が指定されていればそれに従う（プレビュー環境向け） */
const port = Number(process.env.PORT) || 5173;
/* GitHub Pages のようにサブパスへ配置する場合は BASE_PATH を指定する */
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: { port }
});

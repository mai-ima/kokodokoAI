import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Vercel等の環境変数をクライアントサイドの process.env.API_KEY に埋め込む設定
    // undefinedの場合は空文字として埋め込み、ランタイムエラーを防ぐ
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  }
});
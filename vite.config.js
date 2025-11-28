import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  plugins: [react()],
  // 这里的 '/star-tracker/' 必须和您的 GitHub 仓库名称一致，前后都要有斜杠
  base: '/star-tracker/', 
})
import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    base: './',
    server: {
        port: 3000,
        open: false
    },
    // 仅使用 Vite 进行开发时的热重载
    // 生产环境保持原有的多脚本加载方式
    build: {
        outDir: 'dist',
        copyPublicDir: true
    }
});

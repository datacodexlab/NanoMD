import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import pkg from './package.json';
// https://vite.dev/config/
export default defineConfig({
    base: './',
    plugins: [react()],
    define: {
        // Single source of truth for the version shown in the UI
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});

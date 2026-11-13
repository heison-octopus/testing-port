import { defineConfig } from 'vite';import tailwindcss from '@tailwindcss/vite';import react from '@vitejs/plugin-react';import { fileURLToPath } from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),plugins:[react(),tailwindcss()],server:{host:'127.0.0.1',port:5180,proxy:{'/api':'http://127.0.0.1:3300'}},build:{outDir:'../dist',emptyOutDir:true}});

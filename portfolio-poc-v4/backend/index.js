import { createApp } from './app.js';
const {
  app
} = createApp(process.env.V4_DB_PATH ? {file: process.env.V4_DB_PATH} : {});
app.listen(4194, '127.0.0.1', () => console.log('V4 Stage 1 API: http://127.0.0.1:4194'));

import { createApp } from './app.js'; import { env } from './shared/config/env.js';
const server=createApp().listen(env.PORT,()=>console.log(`Lotzy API listening on http://localhost:${env.PORT}`));
const shutdown=()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();}; process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown);

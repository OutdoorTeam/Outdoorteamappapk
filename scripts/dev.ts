import { spawn } from 'child_process';
import { createServer } from 'vite';

// Start the Express server
const serverProcess = spawn('node', ['dist/server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

// Start Vite dev server
const viteServer = await createServer({
  configFile: './vite.config.js',
});

await viteServer.listen();
console.log(`Vite dev server running on port ${viteServer.config.server.port}`);

// Handle cleanup
process.on('SIGTERM', () => {
  serverProcess.kill();
  viteServer.close();
});

process.on('SIGINT', () => {
  serverProcess.kill();
  viteServer.close();
  process.exit(0);
});

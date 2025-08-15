import { spawn, ChildProcess } from 'child_process';
import { createServer } from 'vite';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Build server first
console.log('Building server...');
try {
  await execAsync('tsc --project tsconfig.server.json');
  console.log('Server built successfully');
} catch (error) {
  console.error('Failed to build server:', error);
  process.exit(1);
}

// Check if the built server file exists
const serverPath = path.resolve('./dist/server/index.js');
if (!fs.existsSync(serverPath)) {
  console.error('Server build file not found at:', serverPath);
  process.exit(1);
}

let serverProcess: ChildProcess | null = null;

// Start the Express server
console.log('Starting Express server...');
serverProcess = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { 
    ...process.env, 
    NODE_ENV: 'development',
    PORT: '3001'
  }
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Give server a moment to start
await new Promise(resolve => setTimeout(resolve, 2000));

// Start Vite dev server
console.log('Starting Vite dev server...');
const viteServer = await createServer({
  configFile: './vite.config.js',
});

await viteServer.listen();
console.log(`Vite dev server running on port ${viteServer.config.server.port}`);

// Handle cleanup
process.on('SIGTERM', () => {
  console.log('Shutting down servers...');
  if (serverProcess) {
    serverProcess.kill();
  }
  viteServer.close();
});

process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  if (serverProcess) {
    serverProcess.kill();
  }
  viteServer.close();
  process.exit(0);
});

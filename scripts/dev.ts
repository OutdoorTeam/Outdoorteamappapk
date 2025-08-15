import { spawn } from 'child_process';
import { createServer } from 'vite';
import path from 'path';

// Build the server first
console.log('Building server...');
const buildProcess = spawn('npx', ['tsc', '--project', 'tsconfig.server.json'], {
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', async (code) => {
  if (code !== 0) {
    console.error('Server build failed');
    process.exit(1);
  }

  console.log('Server built successfully, starting servers...');

  // Start the Express server from the root directory (not dist)
  // This ensures node_modules can be found
  const serverProcess = spawn('node', ['dist/server/index.js'], {
    stdio: 'inherit',
    env: { 
      ...process.env, 
      NODE_ENV: 'development',
      DATA_DIRECTORY: process.env.DATA_DIRECTORY || './data'
    },
    cwd: process.cwd() // Run from root directory
  });

  // Start Vite dev server
  const viteServer = await createServer({
    configFile: './vite.config.js',
  });

  await viteServer.listen();
  console.log(`Vite dev server running on port ${viteServer.config.server.port}`);

  // Handle cleanup
  const cleanup = () => {
    console.log('Shutting down servers...');
    serverProcess.kill();
    viteServer.close();
    process.exit(0);
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  // Handle server process exit
  serverProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Server process exited with code ${code}`);
    }
    viteServer.close();
    process.exit(code || 0);
  });
});

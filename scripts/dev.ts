import { spawn } from 'child_process';
import { createServer } from 'vite';
import { vitePort } from '../vite.config.js';

let serverProcess: any = null;
let viteServer: any = null;

async function startDev() {
  try {
    // Start the Express API server
    console.log('🚀 Starting Express server...');
    serverProcess = spawn('tsx', ['server/index.ts'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    });

    // Handle server process errors
    serverProcess.on('error', (error: Error) => {
      console.error('❌ Express server error:', error);
    });

    serverProcess.on('exit', (code: number) => {
      if (code !== 0) {
        console.error(`❌ Express server exited with code ${code}`);
      }
    });

    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start Vite dev server
    console.log('🎨 Starting Vite dev server...');
    viteServer = await createServer({
      configFile: './vite.config.js',
    });

    await viteServer.listen(vitePort);
    console.log(`✅ Vite dev server running on port ${vitePort}`);
    console.log(`🌐 Frontend: http://localhost:${vitePort}`);
    console.log(`🔧 API: http://localhost:3001`);

  } catch (error) {
    console.error('❌ Error starting development servers:', error);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down development servers...`);
  
  if (viteServer) {
    viteServer.close().then(() => {
      console.log('🎨 Vite server closed');
    });
  }
  
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    console.log('🚀 Express server stopped');
  }
  
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle nodemon restarts
process.once('SIGUSR2', () => {
  gracefulShutdown('SIGUSR2');
});

startDev();

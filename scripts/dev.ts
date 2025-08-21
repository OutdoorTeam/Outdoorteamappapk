import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Starting Outdoor Team development servers...');

// Start Vite dev server for frontend
console.log('📦 Starting Vite dev server...');
const viteProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: join(rootDir, 'client'),
  env: { ...process.env, FORCE_COLOR: '1' }
});

// Start backend server with tsx watch
console.log('🔧 Starting backend server...');
const backendProcess = spawn('npx', ['tsx', 'watch', 'server/index.ts'], {
  stdio: 'inherit',
  shell: true,
  cwd: rootDir,
  env: { 
    ...process.env, 
    NODE_ENV: 'development',
    PORT: '3001',
    DATA_DIRECTORY: './data',
    FORCE_COLOR: '1'
  }
});

// Handle process termination
const cleanup = () => {
  console.log('\n🛑 Shutting down development servers...');
  
  if (viteProcess && !viteProcess.killed) {
    viteProcess.kill('SIGTERM');
  }
  
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Handle process errors
viteProcess.on('error', (error) => {
  console.error('❌ Vite process error:', error);
});

backendProcess.on('error', (error) => {
  console.error('❌ Backend process error:', error);
});

viteProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Vite process exited with code ${code}`);
  }
});

backendProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Backend process exited with code ${code}`);
  }
});

console.log('✅ Development servers started successfully!');
console.log('🌐 Frontend: http://localhost:3000');
console.log('🔌 Backend: http://localhost:3001');
console.log('📊 Health check: http://localhost:3001/health');
console.log('\nPress Ctrl+C to stop all servers');

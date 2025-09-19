import { createServer, type ViteDevServer } from 'vite';

let viteServer: ViteDevServer | null = null;

async function startDev() {
  viteServer = await createServer({ configFile: './vite.config.js' });
  await viteServer.listen();

  const port = viteServer.config.server.port ?? 5173;
  console.log(`Vite dev server running on port ${port}`);
}

startDev().catch((err) => {
  console.error('Failed to start Vite dev server', err);
  process.exit(1);
});

const shutdown = async () => {
  if (viteServer) {
    try {
      await viteServer.close();
    } catch (err) {
      console.error('Error closing Vite server', err);
    }
  }
  process.exit(0);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

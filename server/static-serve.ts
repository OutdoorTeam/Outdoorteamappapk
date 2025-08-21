import path from 'path';
import express from 'express';
import fs from 'fs';

/**
 * Sets up static file serving for the Express app in production
 * @param app Express application instance
 */
export function setupStaticServing(app: express.Application) {
  // Determine the static path based on environment
  const staticPath = process.env.NODE_ENV === 'production'
    ? path.join(process.cwd(), 'dist', 'public')
    : path.join(process.cwd(), 'client', 'dist');

  console.log(`📁 Serving static files from: ${staticPath}`);
  
  // Verify the static path exists
  if (!fs.existsSync(staticPath)) {
    console.error(`❌ Static files directory does not exist: ${staticPath}`);
    console.error('   Make sure to run "npm run build" before starting the server');
    process.exit(1);
  }

  // Verify index.html exists
  const indexPath = path.join(staticPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ index.html not found at: ${indexPath}`);
    console.error('   Make sure the build completed successfully');
    process.exit(1);
  }

  // Serve static files with proper caching headers
  app.use(express.static(staticPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Don't cache index.html to ensure app updates are loaded
      if (path.basename(filePath) === 'index.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));

  // For any other routes that don't start with /api/, serve the index.html file (SPA routing)
  app.get('/*splat', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Skip health check route
    if (req.path === '/health') {
      return next();
    }

    // Skip static assets (they should be served by the static middleware above)
    if (req.path.includes('.')) {
      return next();
    }

    console.log(`🔄 Serving SPA route: ${req.path}`);

    // Send index.html for all other routes (SPA routing)
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).send('Error loading application');
      }
    });
  });

  console.log('✅ Static file serving configured');
  console.log(`   📂 Static path: ${staticPath}`);
  console.log(`   📄 Index path: ${indexPath}`);
}

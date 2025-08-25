import path from 'path';
import express from 'express';
import fs from 'fs';

/**
 * Sets up static file serving for the Express app
 * @param app Express application instance
 */
export function setupStaticServing(app: express.Application) {
  const publicPath = path.join(process.cwd(), 'public');
  const indexPath = path.join(publicPath, 'index.html');
  
  console.log('Setting up static serving from:', publicPath);
  console.log('Index file exists:', fs.existsSync(indexPath));

  // Serve static files from the public directory with proper headers
  app.use(express.static(publicPath, {
    maxAge: '1d', // Cache static assets for 1 day
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Set appropriate cache headers based on file type
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
      }
    }
  }));

  // Catch-all handler for SPA routing - must be last
  app.get('/*splat', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Skip files that should return 404 if not found
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|pdf|json|xml|txt)$/)) {
      return next();
    }

    // Check if index.html exists
    if (!fs.existsSync(indexPath)) {
      console.error('index.html not found at:', indexPath);
      res.status(500).send('Application not properly built. Missing index.html');
      return;
    }

    // Serve index.html for all other routes (SPA routing)
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).send('Error loading application');
      }
    });
  });
}

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
      
      // Add CORS headers for static assets to support instance.app deployments
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  }));

  // Health check for static serving
  app.get('/static-health', (req, res) => {
    res.json({ 
      status: 'ok',
      publicPath,
      indexExists: fs.existsSync(indexPath),
      timestamp: new Date().toISOString()
    });
  });

  // Catch-all handler for SPA routing - must be last
  app.get('/*splat', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Skip health checks
    if (req.path === '/health' || req.path === '/static-health') {
      return next();
    }

    // Skip files that should return 404 if not found
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|pdf|json|xml|txt|map)$/)) {
      return next();
    }

    // Check if index.html exists
    if (!fs.existsSync(indexPath)) {
      console.error('index.html not found at:', indexPath);
      res.status(500).json({ 
        error: 'Application not properly built',
        message: 'Missing index.html',
        path: indexPath,
        publicPath
      });
      return;
    }

    // Serve index.html for all other routes (SPA routing)
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).json({ 
          error: 'Error loading application',
          message: err.message
        });
      }
    });
  });
}

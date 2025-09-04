
import path from 'path';
import express from 'express';
import fs from 'fs';

export function setupStaticServing(app: express.Application) {
  const publicPath = path.join(process.cwd(), 'public');
  const indexPath = path.join(publicPath, 'index.html');
  
  console.log('Setting up static serving from:', publicPath);
  console.log('Index file exists:', fs.existsSync(indexPath));
  console.log('Current working directory:', process.cwd());

  // Serve static files from the 'public' directory
  app.use(express.static(publicPath, {
    maxAge: '1d', // Cache static assets for 1 day
    etag: true,
    lastModified: true,
    index: false, // We will handle the index.html manually
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // Health check for static serving
  app.get('/static-health', (req, res) => {
    const files = fs.existsSync(publicPath) ? fs.readdirSync(publicPath) : [];
    res.json({ 
      status: 'ok',
      publicPath,
      indexExists: fs.existsSync(indexPath),
      files: files.slice(0, 10), // Show first 10 files
      totalFiles: files.length,
      cwd: process.cwd(),
      timestamp: new Date().toISOString()
    });
  });

  // Serve manifest.json explicitly for PWA
  app.get('/site.webmanifest', (req, res) => {
    const manifestPath = path.join(publicPath, 'site.webmanifest');
    if (fs.existsSync(manifestPath)) {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.sendFile(manifestPath);
    } else {
      res.status(404).send('Manifest not found');
    }
  });

  // Handle service worker
  app.get('/sw.js', (req, res) => {
    const swPath = path.join(publicPath, 'sw.js');
    if (fs.existsSync(swPath)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Service-Worker-Allowed', '/');
      res.sendFile(swPath);
    } else {
      res.status(404).send('Service worker not found');
    }
  });

  // Catch-all handler for SPA routing. This should be the LAST route.
  app.get('/*splat', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Skip health checks and other specific server routes
    if (req.path === '/health' || req.path === '/static-health' || req.path === '/deployment-info') {
      return next();
    }

    // For any other non-API GET request, serve the main index.html file.
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error serving index.html:', err);
          res.status(500).json({ 
            error: 'Error loading application',
            message: err.message,
            path: indexPath,
            exists: fs.existsSync(indexPath)
          });
        }
      });
    } else {
      console.error('index.html not found at:', indexPath);
      console.error('Files in public directory:', fs.existsSync(publicPath) ? fs.readdirSync(publicPath) : 'Directory does not exist');
      
      res.status(404).json({ 
        error: 'Application not built',
        message: 'Missing index.html - run npm run build',
        path: indexPath,
        publicPath,
        cwd: process.cwd(),
        exists: fs.existsSync(indexPath),
        publicExists: fs.existsSync(publicPath),
        files: fs.existsSync(publicPath) ? fs.readdirSync(publicPath) : []
      });
    }
  });
}

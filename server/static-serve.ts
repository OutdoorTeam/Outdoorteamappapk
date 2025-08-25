import path from 'path';
import express from 'express';
import fs from 'fs';

export function setupStaticServing(app: express.Application) {
  const publicPath = path.join(process.cwd(), 'public');
  const indexPath = path.join(publicPath, 'index.html');
  
  console.log('Setting up static serving from:', publicPath);
  console.log('Index file exists:', fs.existsSync(indexPath));

  // MUCH MORE PERMISSIVE static serving
  app.use(express.static(publicPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
      
      // Very permissive CORS for static assets
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
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

  // More permissive catch-all handler
  app.get('/*splat', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Skip health checks
    if (req.path === '/health' || req.path === '/static-health') {
      return next();
    }

    // More permissive file handling - serve index.html for most routes
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|pdf|json|xml|txt)$/)) {
      // For missing assets, still try to serve index.html in some cases
      if (req.path.includes('chunk') || req.path.includes('vendor')) {
        return next(); // Let these 404 properly
      }
    }

    // Always try to serve index.html if it exists
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error serving index.html:', err);
          res.status(500).json({ 
            error: 'Error loading application',
            message: err.message
          });
        }
      });
    } else {
      console.error('index.html not found at:', indexPath);
      res.status(404).json({ 
        error: 'Application not built',
        message: 'Missing index.html',
        path: indexPath,
        publicPath
      });
    }
  });
}

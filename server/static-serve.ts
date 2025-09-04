
import path from 'path';
import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Since this is an ES module, __dirname is not available. We construct it.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupStaticServing(app: express.Application) {
  // In production, server runs from dist/server, so we go up to dist/ and then to public/
  const publicPath = path.resolve(__dirname, '../public');
  const indexPath = path.join(publicPath, 'index.html');
  
  console.log('Setting up static serving from:', publicPath);
  console.log('Index file path:', indexPath);
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
    },
    // This ensures that if a file is not found, it passes to the next middleware (our SPA handler)
    // instead of sending a 404, which is the default. We will handle 404s for assets ourselves.
    fallthrough: true 
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

    // Check if the request looks like a static asset. If so, and it wasn't found by express.static,
    // it's a 404. This prevents serving index.html for missing assets.
    const isAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|json|webmanifest|map|txt|woff|woff2|ttf|eot)$/.test(req.path);
    if (isAsset) {
      console.warn(`404 - Static asset not found: ${req.path}`);
      return res.status(404).send('Asset not found');
    }

    // For any other non-API GET request, serve the main index.html file for the SPA.
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

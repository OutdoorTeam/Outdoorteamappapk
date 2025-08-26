import path from 'path';
import express from 'express';
import fs from 'fs';

export function setupStaticServing(app: express.Application) {
  const publicPath = path.join(process.cwd(), 'public');
  const indexPath = path.join(publicPath, 'index.html');
  
  console.log('Setting up static serving from:', publicPath);
  console.log('Index file exists:', fs.existsSync(indexPath));
  console.log('Current working directory:', process.cwd());

  // VERY permissive static serving for deployment
  app.use(express.static(publicPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true,
    dotfiles: 'allow',
    index: false, // Don't serve index.html automatically
    setHeaders: (res, filePath) => {
      // Set appropriate cache headers
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', process.env.NODE_ENV === 'production' ? 'public, max-age=86400' : 'no-cache');
      }
      
      // VERY permissive CORS for static assets - support all deployment platforms
      const origin = res.req.headers.origin;
      if (origin && (
        origin.includes('.instance.app') || 
        origin.includes('instance.app') ||
        origin.includes('mimo.run') ||
        origin.includes('vercel.app') ||
        origin.includes('netlify.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      )) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      
      // Additional headers for deployment platforms
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
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
  app.get('/manifest.json', (req, res) => {
    const manifestPath = path.join(publicPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.sendFile(manifestPath);
    } else {
      // Fallback manifest
      res.setHeader('Content-Type', 'application/manifest+json');
      res.json({
        name: "Outdoor Team",
        short_name: "OutdoorTeam",
        start_url: "/",
        display: "standalone",
        theme_color: "#D3B869",
        background_color: "#000000",
        icons: []
      });
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
      // Minimal service worker fallback
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Service-Worker-Allowed', '/');
      res.send(`
        // Minimal service worker
        self.addEventListener('install', () => {
          console.log('Service worker installed');
        });
        
        self.addEventListener('fetch', (event) => {
          // Let browser handle all requests
        });
      `);
    }
  });

  // Very permissive catch-all handler for SPA routing
  app.get('/*splat', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }

    // Skip health checks and other system routes
    if (req.path === '/health' || 
        req.path === '/static-health' || 
        req.path.startsWith('/assets/') ||
        req.path === '/manifest.json' ||
        req.path === '/sw.js') {
      return next();
    }

    // For static assets, try to serve them directly
    const requestedFile = path.join(publicPath, req.path);
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf|json|xml|txt|map)$/) && fs.existsSync(requestedFile)) {
      return res.sendFile(requestedFile);
    }

    // For everything else (SPA routes), serve index.html
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      
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

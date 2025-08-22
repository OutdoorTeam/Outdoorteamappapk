import path from 'path';
import express from 'express';

/**
 * Sets up static file serving for the Express app in production
 * @param app Express application instance
 * @param dataDirectory Data directory path for uploads
 */
export function setupStaticServing(app: express.Application, dataDirectory: string = './data') {
  console.log('Setting up static file serving...');
  
  // In production, serve the built frontend files
  if (process.env.NODE_ENV === 'production') {
    const publicDir = path.join(process.cwd(), 'dist', 'public');
    console.log('Serving static files from:', publicDir);
    
    // Serve static files with caching headers
    app.use(express.static(publicDir, {
      maxAge: '1d', // Cache static assets for 1 day
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        // Cache JavaScript and CSS files longer
        if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // Cache images longer
        if (filePath.match(/\.(jpg|jpeg|png|gif|ico|svg|webp)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
        }
      }
    }));

    console.log('✅ Static file serving configured for production');
  } else {
    console.log('Development mode - static files served by Vite');
  }

  // Serve uploaded files from data directory
  const uploadsPath = path.join(dataDirectory, 'uploads');
  app.use('/uploads', express.static(uploadsPath, {
    maxAge: '1h',
    setHeaders: (res) => {
      // Security headers for uploaded files
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
    }
  }));

  console.log('📁 Upload files served from:', uploadsPath);

  // Health check route (before catch-all)
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3001,
      dataDirectory: dataDirectory
    });
  });

  // Catch-all handler for React Router (only in production)
  if (process.env.NODE_ENV === 'production') {
    app.get('/*splat', (req, res) => {
      // Skip API routes and uploads
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path === '/health') {
        return res.status(404).json({ error: 'Not found' });
      }
      
      // Serve React app for all other routes
      const indexPath = path.join(process.cwd(), 'dist', 'public', 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error serving index.html:', err);
          res.status(500).json({ error: 'Internal server error' });
        }
      });
    });

    console.log('🎯 React Router catch-all handler configured');
  }
}

import path from 'path';
import express from 'express';
import fs from 'fs';

/**
 * Sets up static file serving for the Express app in production
 * @param app Express application instance
 * @param dataDirectory Data directory path for uploads
 */
export function setupStaticServing(app: express.Application, dataDirectory: string = './data') {
  console.log('Setting up static file serving...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('Current working directory:', process.cwd());
  
  // In production, serve the built frontend files
  if (process.env.NODE_ENV === 'production') {
    const publicDir = path.resolve(process.cwd(), 'dist', 'public');
    console.log('Production mode - serving static files from:', publicDir);
    
    // Check if the directory exists
    if (fs.existsSync(publicDir)) {
      console.log('✅ Static directory found:', publicDir);
      
      // List contents for debugging
      try {
        const files = fs.readdirSync(publicDir);
        console.log('Static directory contents:', files.slice(0, 10)); // Show first 10 files
      } catch (error) {
        console.warn('Could not read static directory contents:', error);
      }
    } else {
      console.error('❌ Static directory not found:', publicDir);
      console.log('Available directories in dist:');
      try {
        const distDir = path.resolve(process.cwd(), 'dist');
        if (fs.existsSync(distDir)) {
          const distContents = fs.readdirSync(distDir);
          console.log('dist/ contents:', distContents);
        } else {
          console.log('dist/ directory does not exist');
        }
      } catch (error) {
        console.error('Error checking dist directory:', error);
      }
    }
    
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
  const uploadsPath = path.resolve(dataDirectory, 'uploads');
  console.log('Setting up uploads path:', uploadsPath);
  
  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsPath)) {
    console.log('📁 Creating uploads directory:', uploadsPath);
    try {
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log('✅ Uploads directory created');
    } catch (error) {
      console.error('❌ Failed to create uploads directory:', error);
    }
  }
  
  app.use('/uploads', express.static(uploadsPath, {
    maxAge: '1h',
    setHeaders: (res) => {
      // Security headers for uploaded files
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
    }
  }));

  console.log('📁 Upload files served from:', uploadsPath);

  // Catch-all handler for React Router (only in production)
  if (process.env.NODE_ENV === 'production') {
    app.get('/*splat', (req, res) => {
      // Skip API routes, uploads, and health check
      if (req.path.startsWith('/api/') || 
          req.path.startsWith('/uploads/') || 
          req.path === '/health') {
        return res.status(404).json({ error: 'Not found' });
      }
      
      // Serve React app for all other routes
      const indexPath = path.resolve(process.cwd(), 'dist', 'public', 'index.html');
      console.log('Serving index.html from:', indexPath);
      
      // Check if index.html exists
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).json({ error: 'Internal server error' });
          }
        });
      } else {
        console.error('❌ index.html not found at:', indexPath);
        res.status(404).json({ 
          error: 'Frontend not found',
          message: 'The application frontend is not properly built or deployed',
          indexPath: indexPath
        });
      }
    });

    console.log('🎯 React Router catch-all handler configured');
  }
}

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

  console.log(`📁 Environment: ${process.env.NODE_ENV}`);
  console.log(`📁 Current working directory: ${process.cwd()}`);
  console.log(`📁 Attempting to serve static files from: ${staticPath}`);
  
  // Check if the expected path exists, if not try alternatives
  let finalStaticPath = staticPath;
  
  if (!fs.existsSync(staticPath)) {
    console.warn(`❌ Primary static path does not exist: ${staticPath}`);
    
    // Try alternative paths for production
    const alternatives = [
      path.join(process.cwd(), 'public'),
      path.join(process.cwd(), 'dist'),
      path.join(process.cwd(), 'client', 'public'),
      path.join(__dirname, '..', '..', 'dist', 'public'),
      path.join(__dirname, '..', '..', 'public')
    ];
    
    for (const altPath of alternatives) {
      console.log(`📁 Checking alternative path: ${altPath}`);
      if (fs.existsSync(altPath)) {
        const indexExists = fs.existsSync(path.join(altPath, 'index.html'));
        console.log(`📄 Index.html exists in ${altPath}: ${indexExists}`);
        if (indexExists) {
          finalStaticPath = altPath;
          console.log(`✅ Using alternative static path: ${finalStaticPath}`);
          break;
        }
      }
    }
    
    if (!fs.existsSync(finalStaticPath)) {
      console.error(`❌ No valid static files directory found!`);
      console.error('   Tried paths:', [staticPath, ...alternatives]);
      console.error('   Make sure to run "npm run build" before starting the server');
      
      // In production, this is critical, so exit
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      } else {
        // In development, just warn and continue
        console.warn('   Continuing without static file serving in development mode');
        return;
      }
    }
  }

  // Verify index.html exists
  const indexPath = path.join(finalStaticPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ index.html not found at: ${indexPath}`);
    
    // List contents of the directory for debugging
    try {
      const files = fs.readdirSync(finalStaticPath);
      console.error('   Directory contents:', files);
    } catch (err) {
      console.error('   Could not read directory contents:', err);
    }
    
    if (process.env.NODE_ENV === 'production') {
      console.error('   Make sure the build completed successfully');
      process.exit(1);
    } else {
      console.warn('   Continuing without index.html in development mode');
      return;
    }
  }

  console.log(`✅ Static files directory confirmed: ${finalStaticPath}`);
  console.log(`✅ Index.html confirmed at: ${indexPath}`);

  // Serve static files with proper caching headers
  app.use(express.static(finalStaticPath, {
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
  console.log(`   📂 Static path: ${finalStaticPath}`);
  console.log(`   📄 Index path: ${indexPath}`);
}

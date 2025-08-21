import path from 'path';
import express from 'express';
import fs from 'fs';

/**
 * Sets up static file serving for the Express app in production
 * @param app Express application instance
 */
export function setupStaticServing(app: express.Application) {
  // In production, always serve from dist/public
  // In development, serve from client/dist (Vite output)
  const staticPath = process.env.NODE_ENV === 'production'
    ? path.join(process.cwd(), 'dist', 'public')
    : path.join(process.cwd(), 'client', 'dist');

  console.log(`📁 Environment: ${process.env.NODE_ENV}`);
  console.log(`📁 Current working directory: ${process.cwd()}`);
  console.log(`📁 Serving static files from: ${staticPath}`);
  
  // Verify the static path exists
  if (!fs.existsSync(staticPath)) {
    console.error(`❌ Static files directory does not exist: ${staticPath}`);
    console.error('   Make sure to run "npm run build" before starting the server');
    
    if (process.env.NODE_ENV === 'production') {
      console.error('   For production deployment, ensure dist/public contains the built frontend');
      process.exit(1);
    } else {
      console.warn('   Continuing without static file serving in development mode');
      return;
    }
  }

  // Verify index.html exists
  const indexPath = path.join(staticPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ index.html not found at: ${indexPath}`);
    
    // List contents of the directory for debugging
    try {
      const files = fs.readdirSync(staticPath);
      console.error('   Directory contents:', files);
    } catch (err) {
      console.error('   Could not read directory contents:', err);
    }
    
    if (process.env.NODE_ENV === 'production') {
      console.error('   Make sure the build completed successfully and generated dist/public/index.html');
      process.exit(1);
    } else {
      console.warn('   Continuing without index.html in development mode');
      return;
    }
  }

  console.log(`✅ Static files directory confirmed: ${staticPath}`);
  console.log(`✅ Index.html confirmed at: ${indexPath}`);

  // Serve static files with proper caching headers
  app.use(express.static(staticPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      const fileName = path.basename(filePath);
      
      // Don't cache index.html to ensure app updates are loaded
      if (fileName === 'index.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      
      // Cache static assets for a long time
      else if (fileName.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
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

    console.log(`🔄 Serving SPA route: ${req.path} from ${indexPath}`);

    // Send index.html for all other routes (SPA routing)
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).send(`
          <html>
            <head><title>Error - Outdoor Team</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Error cargando la aplicación</h1>
              <p>Por favor, intenta nuevamente en unos minutos.</p>
              <p><a href="/">Volver al inicio</a></p>
            </body>
          </html>
        `);
      }
    });
  });

  console.log('✅ Static file serving configured for production deployment');
  console.log(`   📂 Static path: ${staticPath}`);
  console.log(`   📄 Index path: ${indexPath}`);
  console.log(`   🌐 Ready for app.outdoorteam.com deployment`);
}

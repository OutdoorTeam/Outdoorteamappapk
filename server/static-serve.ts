import path from 'path';
import express from 'express';

/**
 * Sets up static file serving for the Express app
 * @param app Express application instance
 */
export function setupStaticServing(app: express.Application) {
  // Determine the static path based on environment
  const staticPath = process.env.NODE_ENV === 'production'
    ? path.join(process.cwd(), 'dist', 'public')
    : path.join(process.cwd(), 'public');

  console.log(`📁 Serving static files from: ${staticPath}`);
  
  // Serve static files from the appropriate directory
  app.use(express.static(staticPath));

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

    // Send index.html for all other routes (SPA routing)
    const indexPath = path.join(staticPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).send('Error loading application');
      }
    });
  });
}

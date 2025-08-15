import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupStaticServing(app: express.Application): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // In production, serve static files from the dist/public directory
    const publicPath = path.join(__dirname, '../public');
    
    console.log('Setting up static serving for production');
    console.log('Static files directory:', publicPath);
    
    // Serve static files
    app.use(express.static(publicPath, {
      maxAge: '1d', // Cache static assets for 1 day
      etag: true,
      lastModified: true
    }));
    
    // Handle client-side routing - serve index.html for all non-API routes
    app.get('/*splat', (req, res) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
        return;
      }
      
      // Send index.html for client-side routing
      const indexPath = path.join(publicPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error serving index.html:', err);
          res.status(500).send('Internal Server Error');
        }
      });
    });
  } else {
    console.log('Development mode - static files served by Vite');
  }
}

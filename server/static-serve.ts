import { Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupStaticServing(app: Express) {
  // In production, serve static files from the built client
  if (process.env.NODE_ENV === 'production') {
    const publicPath = path.join(__dirname, '..', 'public');
    app.use(express.static(publicPath));
    
    // Serve index.html for all non-API routes
    app.get('/*splat', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(publicPath, 'index.html'));
      }
    });
  }
  
  console.log('Static serving configured for:', process.env.NODE_ENV);
}

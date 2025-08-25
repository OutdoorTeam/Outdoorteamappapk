import path from 'path';
import express from 'express';
import fs from 'fs';

export function setupStaticServing(app: express.Application) {
  // En producción, los archivos estáticos están en public/ 
  const publicPath = path.join(process.cwd(), 'public');
  const indexPath = path.join(publicPath, 'index.html');
  
  console.log('🗂️ Setting up static serving');
  console.log('📁 Public path:', publicPath);
  console.log('📄 Index path:', indexPath);
  console.log('📋 Index exists:', fs.existsSync(indexPath));

  // Verificar si estamos en el contexto correcto
  if (!fs.existsSync(publicPath)) {
    console.warn('⚠️ Public directory not found, trying alternative paths...');
    
    // Rutas alternativas para diferentes contextos de deploy
    const alternativePaths = [
      path.join(process.cwd(), 'dist', 'public'),
      path.join(process.cwd(), 'client', 'dist'),
      path.join(__dirname, '..', 'public'),
      path.join(__dirname, '..', '..', 'public'),
      path.join(__dirname, '..', '..', 'dist', 'public'),
      // For instance.app deployment structure
      '/app/public',
      '/app/dist/public',
      './build',
      './dist'
    ];
    
    for (const altPath of alternativePaths) {
      if (fs.existsSync(altPath)) {
        console.log('✅ Found alternative path:', altPath);
        const altIndexPath = path.join(altPath, 'index.html');
        
        if (fs.existsSync(altIndexPath)) {
          console.log('✅ Using alternative public path:', altPath);
          return setupWithPath(app, altPath, altIndexPath);
        }
      }
    }
    
    console.error('❌ No valid public directory found!');
    console.log('Available directories:');
    try {
      const currentDir = fs.readdirSync(process.cwd());
      console.log('Current directory contents:', currentDir);
    } catch (err) {
      console.error('Could not read current directory:', err);
    }
    
    // Fallback: ONLY handle non-API routes for debugging
    app.get('/*splat', (req: express.Request, res: express.Response) => {
      // CRITICAL: Never interfere with API routes
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found - static fallback should not handle this' });
        return;
      }
      
      res.status(404).json({ 
        error: 'Static files not found',
        message: 'The application build files are missing',
        searchedPaths: alternativePaths,
        currentWorkingDirectory: process.cwd(),
        nodeEnv: process.env.NODE_ENV
      });
    });
    return;
  }

  return setupWithPath(app, publicPath, indexPath);
}

function setupWithPath(app: express.Application, publicPath: string, indexPath: string) {
  console.log('🚀 Configuring static serving with path:', publicPath);

  // CRITICAL: Configure express.static to NOT interfere with API routes
  // This middleware will only handle file requests that don't start with /api/
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    // BYPASS static serving for ALL API routes
    if (req.path.startsWith('/api/')) {
      return next(); // Let API routes handle it
    }
    
    // For non-API routes, use express.static
    const staticMiddleware = express.static(publicPath, {
      maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
      etag: true,
      lastModified: true,
      index: false, // No servir index.html automáticamente desde static
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        
        // Cache agresivo para assets con hash (js, css con hash en el nombre)
        if (ext === '.js' || ext === '.css') {
          if (filePath.includes('-') || filePath.includes('.')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 año
          } else {
            res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hora
          }
        }
        // Cache moderado para imágenes y fuentes
        else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
          res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 día
        }
        // No cache para HTML
        else if (ext === '.html') {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }

        // Headers de seguridad básicos para todos los archivos
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Ultra-permissive CORS for static files (for deployment compatibility)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
      }
    });
    
    staticMiddleware(req, res, next);
  });

  // Endpoint de health check para verificar que los archivos estáticos están disponibles
  app.get('/static-health', (req: express.Request, res: express.Response) => {
    const stats = {
      status: 'ok',
      publicPath,
      indexExists: fs.existsSync(indexPath),
      publicDirExists: fs.existsSync(publicPath),
      files: [] as string[],
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      workingDirectory: process.cwd()
    };

    // Listar algunos archivos para debug
    try {
      const files = fs.readdirSync(publicPath).slice(0, 10); // Primeros 10 archivos
      stats.files = files;
    } catch (error) {
      console.error('Error reading public directory:', error);
    }

    res.json(stats);
  });

  // CRITICAL: SPA fallback - MUST be LAST and MUST NOT interfere with API routes
  app.get('/*splat', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const requestPath = req.path;
    
    // CRITICAL: NEVER handle API routes in static serving
    if (requestPath.startsWith('/api/')) {
      console.warn(`⚠️ Static fallback received API request: ${requestPath} - this should not happen!`);
      return next(); // Pass to next middleware (should be 404 handler)
    }

    // Skip health checks
    if (requestPath === '/health' || requestPath === '/static-health') {
      return next();
    }

    // Skip requests para archivos que claramente son assets
    const fileExtension = path.extname(requestPath).toLowerCase();
    const isAssetFile = [
      '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', 
      '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.json', '.xml',
      '.txt', '.map', '.wasm'
    ].includes(fileExtension);

    if (isAssetFile) {
      // Si es un archivo asset que no existe, devolver 404
      res.status(404).json({ 
        error: 'Asset not found',
        path: requestPath,
        type: 'asset'
      });
      return;
    }

    // Para todo lo demás (rutas SPA), servir index.html
    console.log(`📝 SPA fallback for route: ${requestPath}`);
    
    if (fs.existsSync(indexPath)) {
      // Set headers for SPA routing
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Ultra-permissive CORS for SPA
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('❌ Error serving index.html:', err);
          res.status(500).json({ 
            error: 'Error loading application',
            message: err.message,
            path: requestPath,
            indexPath
          });
        }
      });
    } else {
      console.error('❌ index.html not found at:', indexPath);
      res.status(404).json({ 
        error: 'Application not found',
        message: 'The application build files are missing',
        indexPath,
        publicPath,
        requestedPath: requestPath,
        environment: process.env.NODE_ENV,
        workingDirectory: process.cwd()
      });
    }
  });

  console.log('✅ Static serving configured successfully');
  console.log(`📂 Serving static files from: ${publicPath}`);
  console.log(`🏠 SPA fallback to: ${indexPath}`);
  console.log('🔒 API routes protected: /api/* will NOT be handled by static serving');
}

// Función alternativa más simple para casos específicos
export function setupSimpleStatic(app: express.Application, buildPath?: string) {
  const staticPath = buildPath || path.join(process.cwd(), 'public');
  const indexFile = path.join(staticPath, 'index.html');

  console.log('🔧 Setting up simple static serving');
  console.log('📁 Static path:', staticPath);

  // CRITICAL: Only handle non-API routes
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
      return next(); // Never interfere with API routes
    }
    
    const staticMiddleware = express.static(staticPath, {
      maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
      setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
      }
    });
    
    staticMiddleware(req, res, next);
  });

  // Fallback SPA simple - NEVER handle API routes
  app.get('/*splat', (req: express.Request, res: express.Response) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
      return;
    }
    
    if (fs.existsSync(indexFile)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.sendFile(indexFile);
    } else {
      res.status(404).json({ 
        error: 'Application not built',
        staticPath,
        indexFile,
        exists: fs.existsSync(staticPath)
      });
    }
  });

  console.log('✅ Simple static serving configured');
}
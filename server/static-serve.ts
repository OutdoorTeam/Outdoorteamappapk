import path from 'path';
import express from 'express';
import fs from 'fs';

export function setupStaticServing(app: express.Application) {
  // En producción, los archivos estáticos están en public/ (no dist/public)
  // porque el build de Vite genera en dist/public y luego se copia a public/
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
      path.join(__dirname, '..', '..', 'public')
    ];
    
    for (const altPath of alternativePaths) {
      if (fs.existsSync(altPath)) {
        console.log('✅ Found alternative path:', altPath);
        // Recrear variables con el path correcto
        const altPublicPath = altPath;
        const altIndexPath = path.join(altPublicPath, 'index.html');
        
        if (fs.existsSync(altIndexPath)) {
          console.log('✅ Using alternative public path:', altPublicPath);
          return setupWithPath(app, altPublicPath, altIndexPath);
        }
      }
    }
    
    console.error('❌ No valid public directory found!');
    return;
  }

  return setupWithPath(app, publicPath, indexPath);
}

function setupWithPath(app: express.Application, publicPath: string, indexPath: string) {
  console.log('🚀 Configuring static serving with path:', publicPath);

  // Configurar express.static con opciones optimizadas para producción
  app.use(express.static(publicPath, {
    // Cache control para diferentes tipos de archivos
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0', // 1 año para assets con hash
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
    }
  }));

  // Endpoint de health check para verificar que los archivos estáticos están disponibles
  app.get('/static-health', (req, res) => {
    const stats = {
      status: 'ok',
      publicPath,
      indexExists: fs.existsSync(indexPath),
      publicDirExists: fs.existsSync(publicPath),
      files: [] as string[],
      timestamp: new Date().toISOString()
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

  // **CRÍTICO**: Fallback para SPA - debe ir DESPUÉS de todas las rutas API
  // y DESPUÉS del middleware de archivos estáticos
  app.get('/*splat', (req, res, next) => {
    const requestPath = req.path;
    
    // Skip API routes - estos deben manejarse antes que este middleware
    if (requestPath.startsWith('/api/')) {
      return next(); // Continuar al próximo middleware (probablemente 404 de API)
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
      '.txt', '.map'
    ].includes(fileExtension);

    if (isAssetFile) {
      // Si es un archivo asset que no existe, devolver 404
      return next();
    }

    // Para todo lo demás (rutas SPA), servir index.html
    console.log(`📝 SPA fallback for route: ${requestPath}`);
    
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('❌ Error serving index.html:', err);
          res.status(500).json({ 
            error: 'Error loading application',
            message: err.message,
            path: requestPath
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
        requestedPath: requestPath
      });
    }
  });

  console.log('✅ Static serving configured successfully');
  console.log(`📂 Serving static files from: ${publicPath}`);
  console.log(`🏠 SPA fallback to: ${indexPath}`);
}

// Función alternativa más simple para casos específicos
export function setupSimpleStatic(app: express.Application, buildPath?: string) {
  const staticPath = buildPath || path.join(process.cwd(), 'public');
  const indexFile = path.join(staticPath, 'index.html');

  console.log('🔧 Setting up simple static serving');
  console.log('📁 Static path:', staticPath);

  // Servir archivos estáticos
  app.use(express.static(staticPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0'
  }));

  // Fallback SPA simple
  app.get('/*splat', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    if (fs.existsSync(indexFile)) {
      res.sendFile(indexFile);
    } else {
      res.status(404).json({ error: 'Application not built' });
    }
  });

  console.log('✅ Simple static serving configured');
}


import path from 'path'
import express from 'express'
import fs from 'fs'

export function setupStaticServing(app: express.Application) {
  // Use `dist/public` as the static assets directory
  const publicPath = path.resolve(process.cwd(), 'public')
  const indexPath = path.join(publicPath, 'index.html')

  console.log('Setting up static serving from:', publicPath)
  console.log('Index file path:', indexPath)
  console.log('Index file exists:', fs.existsSync(indexPath))
  console.log('Current working directory:', process.cwd())

  // Serve static files from `dist/public`
  app.use(express.static(publicPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    index: false, // We handle the index fallback manually
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      }
    },
    fallthrough: true
  }))

  // Health check for static serving (optional)
  app.get('/static-health', (_req, res) => {
    const files = fs.existsSync(publicPath) ? fs.readdirSync(publicPath) : []
    res.json({
      status: 'ok',
      publicPath,
      indexExists: fs.existsSync(indexPath),
      files: files.slice(0, 10),
      totalFiles: files.length,
      cwd: process.cwd(),
      timestamp: new Date().toISOString()
    })
  })

  // SPA Fallback: Serve index.html for any non-API, non-asset request
  app.get('*', (req, res, next) => {
    // Skip API routes and health checks
    if (req.path.startsWith('/api/')) return next()
    if (['/health', '/static-health', '/deployment-info'].includes(req.path)) return next()

    // If it looks like an asset but wasn't found by express.static, return 404
    const isAsset = /\.(js|css|png|jpe?g|gif|svg|ico|json|webmanifest|map|txt|woff2?|ttf|eot)$/.test(req.path)
    if (isAsset) {
      console.warn(`404 - Static asset not found: ${req.path}`)
      return res.status(404).send('Asset not found')
    }

    // For all other GET requests, serve the SPA's index.html
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error serving index.html:', err)
          res.status(500).json({ error: 'Error loading application' })
        }
      })
    } else {
      console.error('index.html not found at:', indexPath)
      return res.status(404).json({ error: 'Application not built - run npm run build' })
    }
  })
}

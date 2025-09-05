import path from 'path'
import express from 'express'
import fs from 'fs'

export function setupStaticServing(app: express.Application) {
  const distPath = path.resolve(process.cwd(), 'dist')
  const indexPath = path.join(distPath, 'index.html')

  console.log('Setting up static serving from:', distPath)
  console.log('Index file path:', indexPath)
  console.log('Index file exists:', fs.existsSync(indexPath))
  console.log('Current working directory:', process.cwd())

  // Archivos estáticos
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      }
    },
    fallthrough: true
  }))

  // Health estático (opcional)
  app.get('/static-health', (_req, res) => {
    const files = fs.existsSync(distPath) ? fs.readdirSync(distPath) : []
    res.json({
      status: 'ok',
      distPath,
      indexExists: fs.existsSync(indexPath),
      files: files.slice(0, 10),
      totalFiles: files.length,
      cwd: process.cwd(),
      timestamp: new Date().toISOString()
    })
  })

  // Fallback SPA (último handler)
  app.get('*', (req, res, next) => {
    // saltar API/health
    if (req.path.startsWith('/api/')) return next()
    if (['/health', '/static-health', '/deployment-info'].includes(req.path)) return next()

    // si parece asset y no existe, 404 (no devolver index.html)
    const isAsset = /\.(js|css|png|jpe?g|gif|svg|ico|json|webmanifest|map|txt|woff2?|ttf|eot)$/.test(req.path)
    if (isAsset) {
      console.warn(`404 - Static asset not found: ${req.path}`)
      return res.status(404).send('Asset not found')
    }

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

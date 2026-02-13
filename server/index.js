const express = require('express')
const multer = require('multer')
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()
const PORT = process.env.PORT || 80
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434'

// ── Ensure uploads directory exists ──
const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

// ── Multer configuration ──
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const name = crypto.randomUUID() + ext
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)'))
    }
  },
})

// ── API: Upload image ──
app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 400 : 400
      return res.status(status).json({ message: err.message })
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' })
    }
    res.json({ url: `/api/uploads/${req.file.filename}` })
  })
})

// ── API: Serve uploaded images ──
app.use(
  '/api/uploads',
  express.static(uploadsDir, {
    maxAge: '1y',
    immutable: true,
  })
)

// ── Ollama proxy ──
app.use(
  '/ollama',
  createProxyMiddleware({
    target: OLLAMA_HOST,
    changeOrigin: true,
    pathRewrite: { '^/ollama': '' },
  })
)

// ── Serve static Vite build ──
const distDir = path.join(__dirname, '..', 'dist')
app.use(express.static(distDir))

// ── SPA fallback (Express 5 requires named param instead of bare *) ──
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

// ── Start server ──
app.listen(PORT, () => {
  console.log(`Link Analysis server running on port ${PORT}`)
  console.log(`Uploads directory: ${uploadsDir}`)
  console.log(`Ollama proxy target: ${OLLAMA_HOST}`)
})

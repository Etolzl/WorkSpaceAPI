const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 4001;

// Middleware de seguridad personalizado
const securityMiddleware = (req, res, next) => {
  // Headers de seguridad
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Limitar tamaño del payload (1MB máximo)
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > 1024 * 1024) {
    return res.status(413).json({ error: 'Payload demasiado grande' });
  }
  
  next();
};

// Rate limiting simple en memoria
const loginAttempts = new Map();
const generalAttempts = new Map();

const rateLimitMiddleware = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutos
  const maxAttempts = 5; // máximo 5 intentos por IP
  
  if (!loginAttempts.has(clientIP)) {
    loginAttempts.set(clientIP, { count: 0, resetTime: now + windowMs });
  }
  
  const attempts = loginAttempts.get(clientIP);
  
  if (now > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = now + windowMs;
  }
  
  if (attempts.count >= maxAttempts) {
    return res.status(429).json({ 
      error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
      retryAfter: Math.ceil((attempts.resetTime - now) / 1000)
    });
  }
  
  attempts.count++;
  next();
};

// Rate limiting para operaciones generales (más permisivo)
const generalRateLimitMiddleware = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutos
  const maxAttempts = 100; // máximo 100 requests por IP en 5 minutos
  
  if (!generalAttempts.has(clientIP)) {
    generalAttempts.set(clientIP, { count: 0, resetTime: now + windowMs });
  }
  
  const attempts = generalAttempts.get(clientIP);
  
  if (now > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = now + windowMs;
  }
  
  if (attempts.count >= maxAttempts) {
    return res.status(429).json({ 
      error: 'Demasiadas solicitudes. Intenta de nuevo en 5 minutos.',
      retryAfter: Math.ceil((attempts.resetTime - now) / 1000)
    });
  }
  
  attempts.count++;
  next();
};

const auth = require('./routes/auth');
const users = require('./routes/users');
const sensorData = require('./routes/sensorData');
const login = require('./routes/login');
const entornosRouter = require('./routes/entornos');
const pushRouter = require('./routes/push');


console.log("Mongo URI:", process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conexión exitosa a MongoDB'))
  .catch((error) => console.error('Error conectando a MongoDB:', error));

// Configurar CORS con múltiples orígenes permitidos
const allowedOrigins = [
  'http://localhost:3000',
  'https://work-space-gamma-umber.vercel.app',
  // Agregar otros orígenes desde variables de entorno si existen
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  // Permitir cualquier subdominio de vercel.app si es necesario
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como mobile apps, Postman, o requests del mismo servidor)
    if (!origin) return callback(null, true);
    
    // Verificar si el origen está en la lista de permitidos
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // En desarrollo, mostrar un warning pero permitir (opcional)
      // En producción, deberías rechazar orígenes no permitidos
      console.warn(`⚠️  Origen no permitido intentando acceder: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Aplicar middleware de seguridad
app.use(securityMiddleware);

// Limitar tamaño del JSON
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/auth', generalRateLimitMiddleware, auth)
app.use('/users', generalRateLimitMiddleware, users);
app.use('/sensor-data', generalRateLimitMiddleware, sensorData);
app.use('/login', rateLimitMiddleware, login);
app.use('/entornos', generalRateLimitMiddleware, entornosRouter);
app.use('/push', generalRateLimitMiddleware, pushRouter);

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor escuchando en puerto ${PORT}`));
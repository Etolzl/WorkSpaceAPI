const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Middleware para verificar JWT y autenticar usuario
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de acceso requerido' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acceso requerido' 
      });
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar el usuario en la base de datos
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Usuario no encontrado' 
      });
    }

    // Agregar información del usuario al request
    req.user = {
      id: user._id,
      email: user.correo,
      rol: user.rol,
      nombre: user.nombre,
      apellido: user.apellido
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado' 
      });
    }

    console.error('Error en autenticación:', error.message);
    return res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

// Middleware para verificar que el usuario es administrador
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Autenticación requerida' 
    });
  }

  if (req.user.rol !== 'admin') {
    return res.status(403).json({ 
      error: 'Acceso denegado. Se requieren permisos de administrador' 
    });
  }

  next();
};

// Middleware opcional para autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continuar sin autenticación
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(); // Continuar sin autenticación
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar el usuario en la base de datos
    const user = await User.findById(decoded.id);
    
    if (user) {
      // Agregar información del usuario al request si existe
      req.user = {
        id: user._id,
        email: user.correo,
        rol: user.rol,
        nombre: user.nombre,
        apellido: user.apellido
      };
    }

    next();
  } catch (error) {
    // En caso de error, continuar sin autenticación
    next();
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth
};

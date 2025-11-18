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

// Middleware para verificar que el usuario es el dueño del recurso o es administrador
// Requiere que el modelo tenga un campo 'usuario' que sea ObjectId
const requireOwnerOrAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Autenticación requerida' 
    });
  }

  // Si es administrador, permitir acceso
  if (req.user.rol === 'admin') {
    return next();
  }

  // Si no es admin, verificar que sea el dueño del recurso
  // Necesitamos el modelo y el ID del recurso
  const resourceId = req.params.id;
  
  if (!resourceId) {
    return res.status(400).json({ 
      error: 'ID del recurso requerido' 
    });
  }

  try {
    // Importar el modelo de Entorno dinámicamente para evitar dependencias circulares
    const Entorno = require('../models/entorno');
    
    const entorno = await Entorno.findById(resourceId);
    
    if (!entorno) {
      return res.status(404).json({ 
        error: 'Entorno no encontrado' 
      });
    }

    // Convertir ambos IDs a string para comparar
    const userId = req.user.id.toString();
    const entornoUsuarioId = entorno.usuario.toString();

    // Verificar que el usuario es el dueño del entorno
    if (userId !== entornoUsuarioId) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Solo puedes editar tus propios entornos' 
      });
    }

    // Si es el dueño, permitir acceso
    next();
  } catch (error) {
    console.error('Error verificando propiedad del entorno:', error.message);
    return res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth,
  requireOwnerOrAdmin
};

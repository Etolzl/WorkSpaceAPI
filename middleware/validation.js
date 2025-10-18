// Middleware de validación y sanitización
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .trim()
    .replace(/[<>]/g, '') // Remover caracteres HTML básicos
    .replace(/javascript:/gi, '') // Remover javascript: URLs
    .replace(/on\w+=/gi, '') // Remover event handlers
    .substring(0, 1000); // Limitar longitud
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{7,15}$/;
  return phoneRegex.test(phone);
};

const validatePassword = (password) => {
  return password && 
         typeof password === 'string' && 
         password.length >= 6 && 
         password.length <= 128 &&
         !password.includes(' ') &&
         !/<script|javascript:|on\w+=/gi.test(password);
};

const validateName = (name) => {
  return name && 
         typeof name === 'string' &&
         /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-']+$/.test(name) &&
         name.length >= 2 && 
         name.length <= 50;
};

// Middleware para validar datos de registro
const validateRegistration = (req, res, next) => {
  try {
    const { nombre, apellido, correo, telefono, fechaCumpleanos, contrasena } = req.body;

    // Sanitizar todas las entradas
    req.body.nombre = sanitizeInput(nombre);
    req.body.apellido = sanitizeInput(apellido);
    req.body.correo = sanitizeInput(correo);
    req.body.telefono = sanitizeInput(telefono);
    req.body.contrasena = sanitizeInput(contrasena);

    // Validaciones
    if (!validateName(req.body.nombre)) {
      return res.status(400).json({ 
        error: 'El nombre es requerido y solo puede contener letras, espacios, guiones y apostrofes' 
      });
    }

    if (!validateName(req.body.apellido)) {
      return res.status(400).json({ 
        error: 'El apellido es requerido y solo puede contener letras, espacios, guiones y apostrofes' 
      });
    }

    if (!validateEmail(req.body.correo)) {
      return res.status(400).json({ 
        error: 'Formato de correo electrónico inválido' 
      });
    }

    if (!validatePhone(req.body.telefono)) {
      return res.status(400).json({ 
        error: 'Formato de teléfono inválido' 
      });
    }

    if (!validatePassword(req.body.contrasena)) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener entre 6 y 128 caracteres y no puede contener espacios ni caracteres especiales' 
      });
    }

    if (!fechaCumpleanos || isNaN(new Date(fechaCumpleanos).getTime())) {
      return res.status(400).json({ 
        error: 'Fecha de cumpleaños inválida' 
      });
    }

    // Validar que la fecha no sea en el futuro
    if (new Date(fechaCumpleanos) > new Date()) {
      return res.status(400).json({ 
        error: 'La fecha de cumpleaños no puede ser en el futuro' 
      });
    }

    // Normalizar email
    req.body.correo = req.body.correo.toLowerCase();

    next();
  } catch (error) {
    res.status(400).json({ error: 'Datos de entrada inválidos' });
  }
};

// Middleware para validar datos de login
const validateLogin = (req, res, next) => {
  try {
    const { telefono, correo, contrasena, recordar } = req.body;

    // Sanitizar entradas
    req.body.telefono = sanitizeInput(telefono);
    req.body.correo = sanitizeInput(correo);
    req.body.contrasena = sanitizeInput(contrasena);

    // Validar contraseña
    if (!validatePassword(req.body.contrasena)) {
      return res.status(400).json({ 
        error: 'La contraseña es requerida y debe tener entre 6 y 128 caracteres' 
      });
    }

    // Validar que se proporcione al menos un identificador
    if (!req.body.telefono && !req.body.correo) {
      return res.status(400).json({ 
        error: 'Debes proporcionar correo o teléfono' 
      });
    }

    // Validar formato de email si se proporciona
    if (req.body.correo && !validateEmail(req.body.correo)) {
      return res.status(400).json({ 
        error: 'Formato de correo electrónico inválido' 
      });
    }

    // Validar formato de teléfono si se proporciona
    if (req.body.telefono && !validatePhone(req.body.telefono)) {
      return res.status(400).json({ 
        error: 'Formato de teléfono inválido' 
      });
    }

    // Validar tipo de recordar
    if (recordar !== undefined && typeof recordar !== 'boolean') {
      req.body.recordar = false;
    }

    // Normalizar email
    if (req.body.correo) {
      req.body.correo = req.body.correo.toLowerCase();
    }

    next();
  } catch (error) {
    res.status(400).json({ error: 'Datos de entrada inválidos' });
  }
};

// Middleware para validar ID de MongoDB
const validateObjectId = (req, res, next) => {
  const mongoose = require('mongoose');
  const id = req.params.id;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ 
      error: 'ID inválido' 
    });
  }
  
  next();
};

// Middleware para validar datos de entorno
const validateEntorno = (req, res, next) => {
  try {
    const { nombre, horaInicio, horaFin, sensores, diasSemana, playlist } = req.body;

    // Sanitizar entrada
    req.body.nombre = sanitizeInput(nombre);

    // Validar nombre
    if (!req.body.nombre || req.body.nombre.length < 2 || req.body.nombre.length > 100) {
      return res.status(400).json({ 
        error: 'El nombre del entorno es requerido y debe tener entre 2 y 100 caracteres' 
      });
    }

    // Validar formato de hora (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaInicio || !timeRegex.test(horaInicio)) {
      return res.status(400).json({ 
        error: 'Hora de inicio inválida. Use formato HH:mm' 
      });
    }

    if (!horaFin || !timeRegex.test(horaFin)) {
      return res.status(400).json({ 
        error: 'Hora de fin inválida. Use formato HH:mm' 
      });
    }

    // Validar que horaFin sea posterior a horaInicio
    const [horaInicioH, horaInicioM] = horaInicio.split(':').map(Number);
    const [horaFinH, horaFinM] = horaFin.split(':').map(Number);
    const minutosInicio = horaInicioH * 60 + horaInicioM;
    const minutosFin = horaFinH * 60 + horaFinM;

    if (minutosFin <= minutosInicio) {
      return res.status(400).json({ 
        error: 'La hora de fin debe ser posterior a la hora de inicio' 
      });
    }

    // Validar días de la semana
    const diasValidos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    if (diasSemana && Array.isArray(diasSemana)) {
      const diasInvalidos = diasSemana.filter(dia => !diasValidos.includes(dia));
      if (diasInvalidos.length > 0) {
        return res.status(400).json({ 
          error: `Días de la semana inválidos: ${diasInvalidos.join(', ')}` 
        });
      }
    }

    // Validar sensores si se proporcionan
    if (sensores && Array.isArray(sensores)) {
      const tiposValidos = ['LIGHT', 'FAN', 'AIR_CONDITIONER', 'TEMPERATURE_SENSOR', 'HUMIDITY_SENSOR', 'SMART_PLUG', 'CURTAIN', 'MOTION_SENSOR', 'AIR_PURIFIER'];
      
      for (let i = 0; i < sensores.length; i++) {
        const sensor = sensores[i];
        
        if (!sensor.nombreSensor || typeof sensor.nombreSensor !== 'string') {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: nombre del sensor es requerido` 
          });
        }

        if (!sensor.tipoSensor || !tiposValidos.includes(sensor.tipoSensor)) {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: tipo de sensor inválido` 
          });
        }

        if (typeof sensor.valorSensor !== 'number' || sensor.valorSensor < 0) {
          return res.status(400).json({ 
            error: `Sensor ${i + 1}: valor del sensor debe ser un número positivo` 
          });
        }
      }
    }

    // Validar playlist si se proporciona
    if (playlist && Array.isArray(playlist)) {
      for (let i = 0; i < playlist.length; i++) {
        const item = playlist[i];
        
        if (!item.tema || typeof item.tema !== 'string') {
          return res.status(400).json({ 
            error: `Playlist item ${i + 1}: tema es requerido` 
          });
        }
      }
    }

    next();
  } catch (error) {
    res.status(400).json({ error: 'Datos de entorno inválidos' });
  }
};

// Middleware para validar estado de entorno
const validateEstado = (req, res, next) => {
  const { estado } = req.body;
  
  if (estado === undefined || estado === null) {
    return res.status(400).json({ 
      error: 'El estado es requerido' 
    });
  }

  if (typeof estado !== 'boolean') {
    return res.status(400).json({ 
      error: 'El estado debe ser un valor booleano (true/false)' 
    });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateEntorno,
  validateEstado,
  validateObjectId,
  sanitizeInput,
  validateEmail,
  validatePhone,
  validatePassword,
  validateName
};

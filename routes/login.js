const express = require('express');
const jwt = require('jsonwebtoken'); // <-- Agrega esto
const bcrypt = require('bcrypt');
const User = require('../models/user');
const router = express.Router();

router.post('/', async (req, res) => {
  let { telefono, correo, contrasena, recordar } = req.body; // <-- Agrega "recordar"
  console.log('Datos recibidos:', req.body);

  // Normalizar correo a minúsculas
  if (correo) correo = correo.toLowerCase();

  // Validar que se proporcione la contraseña
  if (!contrasena) {
    return res.status(400).json({ 
      error: 'La contraseña es requerida' 
    });
  }

  try {
    let user;
    const filter = [];
    if (telefono) filter.push({ telefono });
    if (correo) filter.push({ correo });

    if (filter.length === 0) {
      return res.status(400).json({ error: 'Debes proporcionar correo o teléfono' });
    }

    user = await User.findOne({ $or: filter }).select('+contrasena');

    if (!user) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado con las credenciales proporcionadas' 
      });
    }

    // Validar que el usuario tenga contraseña
    if (!user.contrasena) {
      return res.status(400).json({
        error: 'El usuario no tiene contraseña registrada. Por favor, restablece tu contraseña o regístrate de nuevo.'
      });
    }

    // Verificar contraseña usando el método del modelo
    const isMatch = await user.compararContrasena(contrasena);
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Contraseña incorrecta' 
      });
    }

    // --- Generar el JWT ---
    const payload = {
      id: user._id,
      email: user.correo
    };

    // Si recordar está en true, el token dura 14 días, si no, 1 hora
    const expiresIn = recordar ? '14d' : '1h';
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

    // Mostrar el JWT generado en la consola del API
    console.log("JWT generado:", token);

    // Preparar respuesta sin incluir la contraseña
    const userResponse = {
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      telefono: user.telefono,
      fechaCumpleanos: user.fechaCumpleanos,
      edad: user.obtenerEdad(),
      nombreCompleto: user.obtenerNombreCompleto()
    };

    console.log('Inicio de sesión exitoso para:', userResponse.nombreCompleto);

    res.status(200).json({ 
      message: 'Inicio de sesión exitoso', 
      user: userResponse,
      token, // <-- Devuelve el token
      tokenType: recordar ? 'extendido' : 'temporal'
    });
  } catch (err) {
    console.error('Error en /login:', err);
    res.status(500).json({ 
      error: 'Error interno del servidor durante el inicio de sesión' 
    });
  }
});

module.exports = router;

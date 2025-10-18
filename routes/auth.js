const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

router.get('/me', authenticateToken, async (req, res) => {
  try {
    // El usuario ya está autenticado por el middleware
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" })
    
    // Preparar respuesta del usuario
    const userData = {
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      telefono: user.telefono,
      fechaCumpleanos: user.fechaCumpleanos,
      rol: user.rol,
      edad: user.obtenerEdad(),
      nombreCompleto: user.obtenerNombreCompleto()
    }
    
    res.json({ user: userData })
  } catch (error) {
    console.error('Error en /auth/me:', error.message)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

module.exports = router

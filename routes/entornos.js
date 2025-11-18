const express = require('express')
const router = express.Router()
const Entorno = require('../models/entorno')
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth')
const { validateEntorno, validateEstado, validateObjectId } = require('../middleware/validation')

// Crear un nuevo entorno (requiere autenticación y validación)
router.post('/crear-entornos', authenticateToken, validateEntorno, async (req, res) => {
  try {
    // Agregar información del usuario que crea el entorno
    const entornoData = {
      ...req.body,
      creadoPor: req.user.id,
      fechaCreacion: new Date()
    }
    
    const entorno = new Entorno(entornoData)
    await entorno.save()
    
    console.log(`Entorno "${entorno.nombre}" creado por usuario: ${req.user.email}`)
    res.status(201).json(entorno)
  } catch (error) {
    console.error('Error creando entorno:', error.message)
    res.status(400).json({ error: error.message })
  }
})

// Obtener todos los entornos (requiere autenticación)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const entornos = await Entorno.find()
    console.log(`Usuario ${req.user.email} consultó ${entornos.length} entornos`)
    res.json(entornos)
  } catch (error) {
    console.error('Error obteniendo entornos:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// Cambiar el estado de un entorno (requiere autenticación y validación)
router.patch('/cambiar-estado/:id', authenticateToken, validateObjectId, validateEstado, async (req, res) => {
  try {
    const entorno = await Entorno.findByIdAndUpdate(
      req.params.id,
      { 
        estado: req.body.estado,
        actualizadoPor: req.user.id,
        fechaActualizacion: new Date()
      },
      { new: true }
    )
    
    if (!entorno) {
      return res.status(404).json({ error: 'Entorno no encontrado' })
    }
    
    console.log(`Estado del entorno "${entorno.nombre}" cambiado a ${req.body.estado} por usuario: ${req.user.email}`)
    res.json(entorno)
  } catch (error) {
    console.error('Error cambiando estado del entorno:', error.message)
    res.status(400).json({ error: error.message })
  }
})

// Editar un entorno por ID (requiere autenticación, validación y que el usuario sea el dueño o admin)
router.put('/editar/:id', authenticateToken, requireOwnerOrAdmin, validateObjectId, validateEntorno, async (req, res) => {
  try {
    const entorno = await Entorno.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        actualizadoPor: req.user.id,
        fechaActualizacion: new Date()
      },
      { new: true, runValidators: true }
    )
    
    if (!entorno) {
      return res.status(404).json({ error: 'Entorno no encontrado' })
    }
    
    const userType = req.user.rol === 'admin' ? 'administrador' : 'usuario'
    console.log(`Entorno "${entorno.nombre}" editado por ${userType}: ${req.user.email}`)
    res.json(entorno)
  } catch (error) {
    console.error('Error editando entorno:', error.message)
    res.status(400).json({ error: error.message })
  }
})

// Eliminar un entorno por ID (requiere autenticación, validación y que el usuario sea el dueño o admin)
router.delete('/eliminar/:id', authenticateToken, requireOwnerOrAdmin, validateObjectId, async (req, res) => {
  try {
    const entorno = await Entorno.findByIdAndDelete(req.params.id)
    
    if (!entorno) {
      return res.status(404).json({ error: 'Entorno no encontrado' })
    }
    
    const userType = req.user.rol === 'admin' ? 'administrador' : 'usuario'
    console.log(`Entorno "${entorno.nombre}" eliminado por ${userType}: ${req.user.email}`)
    res.json({ 
      message: 'Entorno eliminado correctamente',
      entornoEliminado: {
        id: entorno._id,
        nombre: entorno.nombre
      }
    })
  } catch (error) {
    console.error('Error eliminando entorno:', error.message)
    res.status(400).json({ error: error.message })
  }
})

module.exports = router
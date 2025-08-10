const express = require('express')
const router = express.Router()
const Entorno = require('../models/entorno')

// Crear un nuevo entorno
router.post('/crear-entornos', async (req, res) => {
  try {
    const entorno = new Entorno(req.body)
    await entorno.save()
    res.status(201).json(entorno)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Obtener todos los entornos
router.get('/', async (req, res) => {
  try {
    const entornos = await Entorno.find()
    res.json(entornos)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Cambiar el estado de un entorno
router.patch('/cambiar-estado/:id', async (req, res) => {
  console.log('PATCH /cambiar-estado/', req.params.id, req.body);
  try {
    const entorno = await Entorno.findByIdAndUpdate(
      req.params.id,
      { estado: req.body.estado },
      { new: true }
    )
    if (!entorno) return res.status(404).json({ error: 'Entorno no encontrado' })
    res.json(entorno)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Editar un entorno por ID
router.put('/editar/:id', async (req, res) => {
  try {
    const entorno = await Entorno.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!entorno) return res.status(404).json({ error: 'Entorno no encontrado' })
    res.json(entorno)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Eliminar un entorno por ID
router.delete('/eliminar/:id', async (req, res) => {
  try {
    const entorno = await Entorno.findByIdAndDelete(req.params.id)
    if (!entorno) return res.status(404).json({ error: 'Entorno no encontrado' })
    res.json({ message: 'Entorno eliminado correctamente' })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

module.exports = router
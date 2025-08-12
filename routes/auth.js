const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const router = express.Router()

router.get('/me', async (req, res) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado" })
  }
  const token = auth.split(" ")[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" })
    
    // Incluir el rol del usuario en la respuesta
    const userData = user.toJSON()
    userData.rol = decoded.rol // Usar el rol del JWT para mayor seguridad
    
    res.json({ user: userData })
  } catch (e) {
    res.status(401).json({ error: "Token inválido" })
  }
})

module.exports = router

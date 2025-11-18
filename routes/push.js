const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const PushSubscription = require('../models/pushSubscription');
const { webpush, vapidKeys } = require('./push-config');
const User = require('../models/user');

// Obtener clave VAPID pública (público, no requiere autenticación)
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Suscribirse a notificaciones push
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Datos de suscripción inválidos' });
    }

    // Verificar si ya existe una suscripción con este endpoint
    let pushSubscription = await PushSubscription.findOne({ endpoint: subscription.endpoint });

    if (pushSubscription) {
      // Actualizar suscripción existente
      pushSubscription.usuario = req.user.id;
      pushSubscription.keys = subscription.keys;
      pushSubscription.userAgent = userAgent || req.headers['user-agent'];
      pushSubscription.lastUsed = new Date();
      await pushSubscription.save();
    } else {
      // Crear nueva suscripción
      pushSubscription = new PushSubscription({
        usuario: req.user.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: userAgent || req.headers['user-agent']
      });
      await pushSubscription.save();
    }

    console.log(`Usuario ${req.user.email} suscrito a notificaciones push`);
    res.json({ 
      message: 'Suscripción exitosa',
      subscription: pushSubscription
    });
  } catch (error) {
    console.error('Error en suscripción push:', error);
    res.status(500).json({ error: 'Error procesando suscripción' });
  }
});

// Desuscribirse de notificaciones push
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint requerido' });
    }

    const subscription = await PushSubscription.findOne({ 
      endpoint: endpoint,
      usuario: req.user.id
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    await PushSubscription.findByIdAndDelete(subscription._id);
    console.log(`Usuario ${req.user.email} desuscrito de notificaciones push`);
    res.json({ message: 'Desuscripción exitosa' });
  } catch (error) {
    console.error('Error en desuscripción push:', error);
    res.status(500).json({ error: 'Error procesando desuscripción' });
  }
});

// Obtener suscripciones del usuario
router.get('/subscriptions', authenticateToken, async (req, res) => {
  try {
    const subscriptions = await PushSubscription.find({ usuario: req.user.id });
    res.json({ subscriptions });
  } catch (error) {
    console.error('Error obteniendo suscripciones:', error);
    res.status(500).json({ error: 'Error obteniendo suscripciones' });
  }
});

// Enviar notificación personal al usuario autenticado
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { title, body, icon, url, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Título y mensaje son requeridos' });
    }

    // Obtener todas las suscripciones del usuario
    const subscriptions = await PushSubscription.find({ usuario: req.user.id });

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No hay suscripciones activas' });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/favicon/favicon-96x96.png',
      url: url || '/dashboard',
      data: data || {}
    });

    const results = [];
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys
          },
          payload
        );
        subscription.lastUsed = new Date();
        await subscription.save();
        results.push({ endpoint: subscription.endpoint, success: true });
      } catch (error) {
        console.error(`Error enviando notificación a ${subscription.endpoint}:`, error);
        // Si la suscripción es inválida, eliminarla
        if (error.statusCode === 410 || error.statusCode === 404) {
          await PushSubscription.findByIdAndDelete(subscription._id);
        }
        results.push({ endpoint: subscription.endpoint, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Notificación enviada a ${successCount}/${subscriptions.length} dispositivos del usuario ${req.user.email}`);
    
    res.json({
      message: `Notificación enviada a ${successCount} dispositivo(s)`,
      results
    });
  } catch (error) {
    console.error('Error enviando notificación:', error);
    res.status(500).json({ error: 'Error enviando notificación' });
  }
});

// Enviar notificación masiva a todos los usuarios (solo administradores)
router.post('/send-to-all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, body, icon, url, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Título y mensaje son requeridos' });
    }

    // Obtener todas las suscripciones activas
    const subscriptions = await PushSubscription.find({});

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No hay suscripciones activas' });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/favicon/favicon-96x96.png',
      url: url || '/dashboard',
      data: data || {}
    });

    let successCount = 0;
    let failCount = 0;

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys
          },
          payload
        );
        subscription.lastUsed = new Date();
        await subscription.save();
        successCount++;
      } catch (error) {
        console.error(`Error enviando notificación a ${subscription.endpoint}:`, error);
        // Si la suscripción es inválida, eliminarla
        if (error.statusCode === 410 || error.statusCode === 404) {
          await PushSubscription.findByIdAndDelete(subscription._id);
        }
        failCount++;
      }
    }

    console.log(`Notificación masiva enviada por ${req.user.email}: ${successCount} exitosas, ${failCount} fallidas`);
    
    res.json({
      message: `Notificación enviada a ${successCount} dispositivo(s)`,
      total: subscriptions.length,
      success: successCount,
      failed: failCount
    });
  } catch (error) {
    console.error('Error enviando notificación masiva:', error);
    res.status(500).json({ error: 'Error enviando notificación masiva' });
  }
});

// Obtener suscripciones de un usuario específico (solo admin)
router.get('/subscriptions/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar que el usuario existe
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const subscriptions = await PushSubscription.find({ usuario: userId });
    res.json({ subscriptions });
  } catch (error) {
    console.error('Error obteniendo suscripciones:', error);
    res.status(500).json({ error: 'Error obteniendo suscripciones' });
  }
});

// Enviar una notificación push a un usuario específico (solo admin)
router.post('/send-to-user/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, body, icon, url, data } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ error: 'Título y mensaje son requeridos' });
    }
    
    // Verificar que el usuario existe
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const subscriptions = await PushSubscription.find({ usuario: userId });
    
    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No hay suscripciones activas para este usuario' });
    }
    
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/favicon/favicon-96x96.png',
      url: url || '/dashboard',
      data: data || {}
    });
    
    const results = [];
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys
          },
          payload
        );
        subscription.lastUsed = new Date();
        await subscription.save();
        results.push({ endpoint: subscription.endpoint, status: 'success' });
      } catch (error) {
        console.error(`Error enviando notificación a ${subscription.endpoint}:`, error);
        // Si la suscripción ya no es válida, eliminarla de la base de datos
        if (error.statusCode === 410 || error.statusCode === 404 || (error.body && error.body.includes('expired'))) {
          console.log(`Suscripción expirada o inválida, eliminando: ${subscription.endpoint}`);
          await PushSubscription.findByIdAndDelete(subscription._id);
        }
        results.push({ endpoint: subscription.endpoint, status: 'failed', error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`Notificación enviada a ${successCount}/${subscriptions.length} suscripciones del usuario ${user.correo} por administrador ${req.user.email}`);
    
    res.json({ 
      message: 'Notificación enviada', 
      results,
      success: successCount,
      total: subscriptions.length
    });
    
  } catch (error) {
    console.error('Error enviando notificación a usuario:', error);
    res.status(500).json({ error: 'Error enviando notificación' });
  }
});

module.exports = router;

const mongoose = require('mongoose');

const PushSubscriptionSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  endpoint: {
    type: String,
    required: true,
    unique: true
  },
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  },
  userAgent: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
});

// Índice para búsquedas rápidas por usuario
PushSubscriptionSchema.index({ usuario: 1 });
PushSubscriptionSchema.index({ endpoint: 1 });

module.exports = mongoose.model('PushSubscription', PushSubscriptionSchema);


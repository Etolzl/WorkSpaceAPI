const webpush = require('web-push');

// Configurar las claves VAPID
const vapidKeys = {
  publicKey: "BGQECJNUtqdg8AaL3qBNSEgH86UagDCZguAGD0ZrAQH2upekDEDbce-7Upjj14qurzuUZ13JV-C2e-VERd9C8DM",
  privateKey: "gfjjZ3A3lRKXcNw4l9o3b-3_vu0tFb2bt-fRIJoYUDQ"
};

// Configurar web-push
webpush.setVapidDetails(
  'mailto:tu-email@ejemplo.com', // Email de contacto (cambiar por tu email)
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

module.exports = {
  webpush,
  vapidKeys
};

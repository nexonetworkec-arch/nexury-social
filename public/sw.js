// Service Worker Maestro - Nexury (Notificaciones + Caché)
/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'nexury-v1';

// 1. Lógica de Instalación y Caché (Carga rápida)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// 2. Lógica de Notificaciones Push
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'Tienes una nueva notificación en Nexury',
      icon: '/logo192.png', 
      badge: '/logo192.png',
      data: {
        url: data.url || '/'
      },
      actions: [
        { action: 'open', title: 'Ver ahora' },
        { action: 'close', title: 'Cerrar' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Nexury', options)
    );
  } catch (error) {
    console.error('Error al procesar notificación push:', error);
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Nexury', {
        body: text,
        icon: '/logo192.png'
      })
    );
  }
});

// 3. Lógica al hacer clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

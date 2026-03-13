// Service Worker para Notificaciones Push - Nexury
/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'Tienes una nueva notificación en Nexury',
      icon: '/logo192.png', // Asegúrate de que este icono exista o usa uno por defecto
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
    
    // Fallback para datos que no son JSON
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Nexury', {
        body: text,
        icon: '/logo192.png'
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una ventana abierta, enfocarla y navegar
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

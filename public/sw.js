// Service Worker — Carflax Hub (Web Push)

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || '💬 Nova mensagem', {
      body: data.body || '',
      icon: data.icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'whatsapp',
      renotify: true,
      data: { section: data.section || 'Marketing' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const section = event.notification.data?.section || 'Marketing';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'carflax-navigate', section });
          return;
        }
      }
      return clients.openWindow('/');
    })
  );
});

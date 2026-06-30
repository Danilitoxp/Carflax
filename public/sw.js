// Service Worker — Carflax Hub (Web Push)

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || '💬 Nova mensagem', {
      body: data.body || '',
      icon: data.icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'carflax-push',
      renotify: true,
      data: { section: data.section || 'Marketing', documento: data.documento }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const section = event.notification.data?.section || 'Marketing';
  const documento = event.notification.data?.documento;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'carflax-navigate', section });
          if (documento) {
            client.postMessage({ type: 'carflax-open-chat', documento });
          }
          return;
        }
      }
      return clients.openWindow('/');
    })
  );
});

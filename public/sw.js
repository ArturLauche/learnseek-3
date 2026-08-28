self.addEventListener("push", (event) => {
  let payload = { title: "Oriel", body: "A notice is waiting in the app.", href: "/notifications" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* ignore malformed payloads */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { href: payload.href },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href ?? "/notifications";
  event.waitUntil(self.clients.openWindow(href));
});

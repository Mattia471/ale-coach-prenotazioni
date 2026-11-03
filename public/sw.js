self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let info={title:'Ale Coach',body:'Hai un aggiornamento sulla tua lezione.',url:'/'};
  try {info={...info,...event.data.json()}}catch{}
  event.waitUntil(self.registration.showNotification(info.title,{body:info.body,icon:'/icon-192.png',badge:'/icon-192.png',data:{url:info.url},tag:'ale-coach-booking'}));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(windows => {
    const win=windows[0];if(win){win.focus();return win.navigate(event.notification.data?.url||'/')}
    return self.clients.openWindow(event.notification.data?.url||'/');
  }));
});

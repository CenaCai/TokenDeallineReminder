/**
 * sw.js — Service Worker
 * 处理缓存、后台定时通知
 */

const CACHE_NAME = 'quota-tracker-v1';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/db.js',
  './js/notifications.js',
  './js/api-providers.js',
  './js/ocr.js',
  './js/render.js',
  './js/app.js',
  './manifest.json',
];

/* ---- Install ---- */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ---- Activate ---- */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ---- Fetch（优先缓存，网络回退） ---- */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

/* ---- Push 通知 ---- */
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json().catch(() => ({ title: '额度追踪', body: e.data.text() }));
  e.waitUntil(
    data.then(d =>
      self.registration.showNotification(d.title || '额度追踪', {
        body: d.body || '',
        icon: './icons/icon-192.png',
        badge: './icons/badge-72.png',
        tag: 'quota-reminder',
        renotify: true,
        data: d.data || {}
      })
    )
  );
});

/* ---- 通知点击 ---- */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) {
        list[0].focus();
        list[0].navigate('./');
      } else {
        clients.openWindow('./');
      }
    })
  );
});

/* ---- Background Sync（周期性检查） ---- */
self.addEventListener('periodicsync', e => {
  if (e.tag === 'quota-check') {
    e.waitUntil(checkQuotasInBackground());
  }
});

async function checkQuotasInBackground() {
  // 通过 postMessage 让页面自行检查（页面在前台时）
  const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (allClients.length > 0) {
    allClients[0].postMessage({ type: 'BACKGROUND_CHECK' });
  } else {
    // 页面不在前台，直接发通知（需要读取 IndexedDB，这里简化处理）
    self.registration.showNotification('额度追踪提醒', {
      body: '请打开应用检查您的产品额度状态',
      icon: './icons/icon-192.png',
      tag: 'quota-reminder'
    });
  }
}

/* ---- Message 监听 ---- */
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

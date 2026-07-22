/* EducaVerso — Service Worker
   Deixa o app funcionar offline: guarda o "esqueleto" na instalação
   e vai guardando o resto (jogo, imagens, áudios) conforme é usado. */
const CACHE = 'educaverso-v1';

// Esqueleto essencial: com isso a tela inicial abre mesmo sem internet.
const ESSENCIAL = [
  './',
  './index.html',
  './jogo.html',
  './manifest.webmanifest',
  './icone-192.png',
  './icone-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ESSENCIAL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // não interfere em recursos externos

  // Navegação (abrir uma página): tenta a rede, cai pro cache se offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Demais arquivos: cache primeiro (rápido), guardando cópia nova da rede.
  e.respondWith(
    caches.match(req).then((cacheado) => {
      const daRede = fetch(req).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return resp;
      }).catch(() => cacheado);
      return cacheado || daRede;
    })
  );
});

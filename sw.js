const CACHE_VERSION = 'seojae-v16';
const CACHE_NAME = `seojae-reader-${CACHE_VERSION}`;

// 앱이 오프라인에서도 완전히 동작하도록 설치 시점에 모두 캐시해 둔다.
// (모두 저장소 내부 파일이라 외부 네트워크 없이도 설치가 끝난다.)
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './fonts/fonts.css',
  './fonts/nanum-myeongjo-korean-400-normal.woff2',
  './fonts/nanum-myeongjo-korean-700-normal.woff2',
  './fonts/nanum-myeongjo-korean-800-normal.woff2',
  './fonts/noto-sans-kr-korean-400-normal.woff2',
  './fonts/noto-sans-kr-korean-500-normal.woff2',
  './fonts/noto-sans-kr-korean-600-normal.woff2',
  './fonts/noto-serif-kr-korean-300-normal.woff2',
  './fonts/noto-serif-kr-korean-400-normal.woff2',
  './fonts/noto-serif-kr-korean-500-normal.woff2',
  './fonts/noto-serif-kr-korean-600-normal.woff2',
  './vendor/mammoth.browser.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// HTML 문서(페이지 이동)는 네트워크를 먼저 시도해 항상 최신 버전을 받아오고,
// 오프라인일 때만 캐시된 사본으로 대체한다. (홈 화면 앱이 옛 버전에 머무는 것을 방지)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // 그 외 정적 자원(폰트·아이콘·mammoth.js)은 캐시 우선으로 빠르게 제공하고,
  // 백그라운드에서 네트워크로 갱신한다.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && (response.ok || response.type === 'opaque')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});

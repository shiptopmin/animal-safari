/* =============================================
   Animal Music Safari — Service Worker v1.0.0
   오프라인 지원을 위한 캐시 우선(Cache-first) 전략
   ============================================= */

const CACHE_NAME = 'animal-safari-v1.0.0';

// 설치 시 미리 캐시할 핵심 자원 목록
// TODO: 프로덕션 빌드 후 dist/assets 경로의 해시된 파일명을 추가하면 완전한 오프라인 지원 가능
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ---------- 설치 (Install) ----------
// 앱이 처음 로드될 때 핵심 자원을 캐시에 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ---------- 활성화 (Activate) ----------
// 구버전 캐시를 정리하고 새 서비스 워커를 즉시 활성화
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------- 네트워크 요청 가로채기 (Fetch) ----------
// 캐시 우선 → 없으면 네트워크 → 성공 응답은 캐시에 저장
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // 동일 출처(same-origin)의 성공 응답만 캐시
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

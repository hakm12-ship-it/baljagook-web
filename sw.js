// 발자국 서비스워커 — 앱 셸 캐시 (설치형 PWA)
//
// 범위를 좁게 유지한다. 예전 버전은 모든 GET을 캐시해서 외부 폰트, CARTO 지도 타일,
// Supabase API 응답까지 담았다. 인증된 응답을 URL만 보고 재사용할 위험이 있고,
// 상한도 만료도 없었다. 지금은 같은 출처의 정상 응답만 캐시한다.
const CACHE = 'baljagook-v2'
const SHELL = self.registration.scope // index.html

self.addEventListener('install', (e) => {
  // 앱 셸을 명시적으로 precache한다. 이게 없으면 오프라인 폴백이
  // caches.match(scope)에서 undefined가 나와 아무 의미가 없다.
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  // 다른 출처(폰트·지도 타일·Supabase)는 손대지 않고 브라우저에 맡긴다
  if (new URL(req.url).origin !== self.location.origin) return

  e.respondWith(
    fetch(req)
      .then((res) => {
        // 정상적인 같은 출처 응답만 저장한다 (opaque·리다이렉트·오류 제외)
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches
            .open(CACHE)
            .then((c) => c.put(req, copy))
            .catch(() => {})
        }
        return res
      })
      .catch(() =>
        caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match(SHELL) : undefined)),
      ),
  )
})

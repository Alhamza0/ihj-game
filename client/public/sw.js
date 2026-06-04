/* ============================ service worker ============================
   PWA: قشرة التطبيق تُكاش لتشتغل أوفلاين (وضع اللعب المحلي يعمل بلا إنترنت).
   لا نلمس طلبات Socket.IO إطلاقاً — تُمرَّر للشبكة دائماً.
   لا نعتمد على أسماء أصول Vite المُجزّأة: نكاش وقت التشغيل (runtime caching).
*/
// ⚠️ ارفع هذا الرقم مع كل إصدار (طابقه مع package.json) كي يكتشف المتصفح التحديث.
const CACHE_VERSION = "ihj-v1.7.0";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./maskable.svg"];

self.addEventListener("install", (e) => {
  // لا نستدعي skipWaiting تلقائياً: ندع النسخة الجديدة "تنتظر" حتى يوافق المستخدم على التحديث.
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL).catch(() => {}))
  );
});

// عند موافقة المستخدم على التحديث: الواجهة ترسل هذه الرسالة فيُفعَّل الـ SW الجديد فوراً.
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // مرّر للشبكة مباشرة: غير GET، Socket.IO/WebSocket، وملف ملخّص التحديث (يجب أن يبقى طازجاً)
  if (req.method !== "GET" || url.pathname.startsWith("/socket.io/") ||
      url.protocol === "ws:" || url.protocol === "wss:" || url.pathname.endsWith("/version.json")) {
    return; // المتصفح يتولّاه عبر الشبكة
  }

  // طلبات التنقّل (فتح الصفحة): شبكة أولاً ثم القشرة المخزّنة
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { cachePut(req, res.clone()); return res; })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // أصول ثابتة (نفس الأصل + الخطوط): stale-while-revalidate
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (sameOrigin || isFont) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => { if (res && res.status === 200) cachePut(req, res.clone()); return res; })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});

function cachePut(req, res) {
  if (!res || (res.status !== 200 && res.type !== "opaque")) return;
  caches.open(CACHE_VERSION).then((c) => c.put(req, res)).catch(() => {});
}

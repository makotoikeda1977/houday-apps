/* Service Worker: 静的アセットをキャッシュしオフライン起動可能にする */
const CACHE='shoguu-sim-v1';
const ASSETS=['./','./index.html','./app.js','./app.css','./manifest.webmanifest','../../common/theme.css','../../common/license.js','../../common/license-hashes.json','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
  // license-hashes.json はネット優先（キー追加を即反映）
  if(e.request.url.indexOf('license-hashes.json')>=0){e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));return}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok&&res.type==='basic'){const c=res.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return res})))});

const rev = "BT-008",
	pwa = [
		"https://fson4.github.io/bt/",
		"app.webmanifest",
		"resource/font/inter.woff2",
		"resource/style.css",
		"resource/script.js",
		"resource/img/icon.svg",
		"resource/img/icon.png"
	]
self.addEventListener("install", e => e.waitUntil(caches.open(rev).then(c => c.addAll(pwa))))
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.map(key => { if (/BT/.test(key) && key !== rev) return caches.delete(key) })))))
self.addEventListener("fetch", e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))))

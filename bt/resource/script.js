"use strict"
let tasks = ["numeral", "ABC", "color"],
	time = { state: 2000, stimulus: 1000 },
	reverse = 1,
	[dual, sound] = [1, 1],
	range = { min: 4, max: 7, x: 2, auto: 1 },
	board, opt, stimuli, input, limit, seq, delay, wl, lang

const audio = new AudioContext(),
	layout = new DocumentFragment(),
	$ = sel => board.querySelector(sel),
	create = (tag, parentNode, className) => {
		const el = document.createElement(tag)
		if (parentNode) parentNode.append(el)
		if (className) el.className = className
		return el
	},
	ocillator = (type, freq) => {
		const osc = audio.createOscillator()
		osc.type = type
		osc.frequency.setValueAtTime(freq, audio.currentTime)
		return osc
	},
	gain = rampEnd => {
		const amp = audio.createGain()
		amp.gain.value = .2
		if (rampEnd) amp.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + rampEnd)
		return amp
	},
	ocillate = (osc, amp, stop) => {
		if (!sound) return
		osc.connect(amp).connect(audio.destination)
		osc.start()
		osc.stop(audio.currentTime + stop)
	},
	playPress = () => {
		const amp = gain(.1)
		amp.gain.exponentialRampToValueAtTime(amp.gain.value, audio.currentTime + .01)
		ocillate(ocillator("sine", 540), amp, .1)
	},
	playBuzzer = () => {
		ocillate(ocillator("sawtooth", 140), gain(), .6)
	},
	playSuccess = () => {
		let i = 0, x
		const aud = () => {
				const osc = ocillator("sine", 1400),
					amp = gain(.2)
				amp.gain.exponentialRampToValueAtTime(amp.gain.value, audio.currentTime + .01)
				osc.frequency.exponentialRampToValueAtTime(2600, audio.currentTime + .2)
				ocillate(osc, amp, .09)
				if (++i > 6) clearInterval(x)
			}
		aud()
		x = setInterval(aud, 98)
	},
	clearSeq = () => {
		clearInterval(seq)
		clearTimeout(delay)
		;[seq, delay] = [!1, !1]
		if (speechSynthesis.speaking) speechSynthesis.cancel()
	},
	prep = () => {
		while (board.firstChild) board.firstChild.remove()
		;[input, limit, result.x] = [[], limit < 51 ? limit : range.min - 1, result.x < range.x ? result.x : 0]
	},
	ctrl = (tag, className, txt, func, parentNode = layout, active = !1) => {
		for (const [i, c] of className.entries()) {
			const el = create(tag, parentNode, c)
			el.textContent = txt[i]
			el.addEventListener("pointerdown", () => { playPress(); el.classList.add("active"); active = !0
				document.addEventListener("pointerup", () => { el.classList.remove("active"); active = !1 }, { once: !0 }) })
			el.addEventListener("pointerup", () => { if (active) { el.classList.remove("active"); active = !1; func[i](el) }})
		}
	},
	main = () => {
		prep()
		if (wl) wl.release().then(() => wl = !1)
		const capFirst = str => str.charAt(0).toUpperCase() + str.slice(1),
			clear = () => {
				[result.x, limit] = [0, range.auto ? range.min - 1 : limit]
				try { $(".result").remove() } catch { /* 0 */ }
				try { help($(".help"), !0) } catch { /* 0 */ }
			},
			level = prssd => {
				if (prssd) {
					limit = range.auto ? range.min : limit === range.max ? range.min - 1 : ++limit
					range.auto = limit < range.min ? !0 : !1
					clear()
				}
				return range.auto ? "Auto" : "Level " + limit
			},
			speaker = prssd => { if (prssd) sound = !sound; return sound ? "🔊" : "🔇" },
			alt = prssd => {
				if (prssd) {
					opt = tasks.find((k, i, a) => { let o = a.indexOf(opt) + 1; if (o === a.length) o = 0; return i === o })
					clear()
				}
				return opt === "numeral" ? "0-9" : capFirst(opt)
			},
			help = (el, cls) => {
				if (!el.firstChild.nodeValue || cls) return (el.textContent = "?")
				el.firstChild.replaceWith(create("ol"))
				for (const txt of ["Start task on the circle", "Note the sequence", "Recall it in" + (reverse ? " reverse" : "") + " order",
					"Abort task on the red X"]) create("li", el.firstChild).textContent = txt
			},
			fscreen = () => {
				if (document.fullscreenElement) document.exitFullscreen()
				else board.parentNode.requestFullscreen()
			}
		ctrl("p", ["level", "alt", "help"], [level(), alt(), "?"], [el => el.textContent = level(!0), el => el.textContent = alt(!0), el => help(el)])
		ctrl("div", ["speaker", "circle"], [speaker(), ""], [el => el.textContent = speaker(!0), task])
		if (document.fullscreenEnabled) ctrl("div", ["screen"], [""], [fscreen])
		board.append(layout)
	},
	result = () => {
		if (reverse) stimuli = stimuli.reverse()
		const ul = create("ul", layout, "result"),
			format = (a, i) => {
				const wrong = a.map((v, i) => v !== stimuli[i]), li = create("li", ul, "match-li-" + i)
				for (const [i, c] of a.entries()) create("span", li, (wrong[i] ? "wrong " : "") + "match " + c + " " + opt)
			}
		setTimeout(() => {
			if (stimuli.every((v, i) => v === input[i])) {
				if (range.auto) ++result.x
				for (const txt of ["- Well Played -", "Level " + limit, "Memory: " + (limit < 5 ? "Good" : limit < 8 ? "Great" : "Superb")])
					create("li", ul, result.x < range.x ? "" : "complete").textContent = txt
				playSuccess()
				if (result.x === range.x) ++limit
			} else {
				for (const [i, v] of ["- No Match -", stimuli, input].entries()) {
					if (typeof v === "string") create("li", ul).textContent = v
					else format(v, i)
				}
				playBuzzer()
			}
			main()
		}, 150)
	},
	speak = (txt = " ") => {
		const msg = new SpeechSynthesisUtterance(txt)
		msg.lang = lang
		speechSynthesis.speak(msg)
	},
	build = () => {
		const a = Array.from({ length: range[opt] }, (v, i) => "no-" + (opt === "color" ? i + 1 : i)),
			numb = str => str ? Number(str.substr(-1)) : !1, s = []
		let r = a[Math.floor(Math.random() * a.length)]
		while (s.push(r) < limit) {
			while (r === s[s.length - 1] || r === s[s.length - 2] || numb(r) === numb(s[s.length - 1]) + 1 || numb(r) === numb(s[s.length - 1]) - 1 ||
				(s.length === limit - 1 && r === s[0])) r = a[Math.floor(Math.random() * a.length)]
		}
		stimuli = s
	},
	dupPat = (a, cal = limit < 21 ? 1 : 2) => {
		return a.map((v, i) => { if (i < a.length - cal) return a[i] + a[i + 1] + (cal === 2 ? a[i + 2] : "") }).sort().find((v, i, p) => {
			if (i < a.length - 1) return v === p[i + 1] })
	},
	panel = () => {
		const btn = but => {
				if (input.length === limit) return
				if (input.push(but.classList[1]) === limit) result()
			},
			pnl = create("div", layout, "panel " + opt), rng = opt === "color" ? range[opt] : 12
		for (let i = 0, n = 0; i < rng;) {
			if (++i === 10 || i === 12) { create("div", pnl, "box"); continue }
			if (n === 9 && rng === 12) n = -1
			ctrl("div", ["box no-" + (++n) + " " + opt], [""], [el => btn(el)], pnl)
		}
		board.append(layout)
	},
	run = (el, s = stimuli[run.n]) => {
		if (run.n++ === limit) { clearSeq(); el.remove(); panel(); return }
		el.classList.add(s, opt)
		if (sound && dual && opt !== "color") speak(getComputedStyle(el, "::after").content.toLowerCase())
		setTimeout(() => el.classList.remove(s, opt), time.stimulus)
	},
	task = () => {
		prep()
		const el = create("div", layout, "stimulus")
		ctrl("div", ["esc"], [""], [() => { clearSeq(); if (range.auto) limit = range.min - 1; result.x = 0; main() }])
		wake()
		speak()
		build()
		while (dupPat(stimuli)) build()
		board.append(layout)
		if (seq || delay) clearSeq()
		delay = setTimeout(() => { run.n = 0; run(el); seq = setInterval(() => run(el), time.state) }, 1500)
	},
	wake = async () => { try { wl = await navigator.wakeLock.request("screen") } catch { /* 0 */ }}
addEventListener("DOMContentLoaded", () => {
	[board, opt, limit, range["numeral"], range["ABC"], range["color"]] = [document.body, tasks[0], range.auto ? range.min - 1 : range.min, 10, 10, 9]
	const fontLoad = async (fam, url, des, fd = "auto") => { const f = new FontFace(fam, "url(" + url + ")", des); f.display = fd; await f.load(); document.fonts.add(f) }
	fontLoad("inter", "resource/font/inter.woff2", { weight: "400 700" }, "swap")
	main()
	document.addEventListener("touchstart", e => e.preventDefault(), { passive: !1 })
	document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") audio.suspend(); else setTimeout(() => audio.resume(), 300) })
	addEventListener("pageshow", () => { const p = performance, n = p.getEntriesByType("navigation")[0] || p.navigation; if (n && /back_f|2/.test(n.type)) setTimeout(() => audio.resume(), 300) })
	speechSynthesis.addEventListener("voiceschanged", () => lang = speechSynthesis.getVoices().find(v => v.lang.substr(0, 2) === navigator.language.substr(0, 2)) ? navigator.language : "en")
	if (location.protocol === "https:") navigator.serviceWorker.register("service-worker.js", { scope: "https://fson4.github.io/bt/" })
}, { once: !0 })

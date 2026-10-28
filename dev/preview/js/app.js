/*
 * 키오스크 핵심: 화면 이동, 하단 메뉴, 메인 지도, 여수 찾기(관광지 상세), 소식, 모달·알림, 자동 복귀, 관리자.
 */
(function () {
  "use strict";
  var C = window.KIOSK_CONFIG, D = window.KIOSK_DATA, B = window.KioskBridge, L = window.I18N;

  /* ───────── 공통 도구 ───────── */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var ICON = {
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    mic: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19v3"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><rect x="9" y="2" width="6" height="13" rx="3"></rect></svg>',
    search: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></svg>',
    sparkles: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path><path d="M20 2v4"></path><path d="M22 4h-4"></path><circle cx="4" cy="20" r="2"></circle></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>'
  };
  var MAP = function (q) { return "https://map.naver.com/p/search/" + encodeURIComponent(q); };
  var WEB = function (q) { return "https://search.naver.com/search.naver?query=" + encodeURIComponent(q); };
  function place(no) { return D.places.filter(function (p) { return p.no === +no; })[0]; }
  function won(n) { return L.won(n); }

  var kiosk = $("#kiosk"), content = $("#content"), hotspots = $("#hotspots");

  /* ───────── 화면 크기 (구형 WebView 대비 px 로도 지정) ─────────
     메인 그림 크기 비율 (가로 x 세로). 그림을 바꾸면 여기와 css/kiosk.css 의 --art-ratio 를 맞춰 주세요. */
  var ART_W = 2161, ART_H = 3841;
  function fit() {
    var kw = Math.min(window.innerWidth, window.innerHeight * ART_W / ART_H);
    document.documentElement.style.setProperty("--kw", kw + "px");
  }
  window.addEventListener("resize", fit); fit();

  /* 특정 영역 안에서만 스크롤 (scrollIntoView 는 화면 전체를 밀 수 있어 쓰지 않음) */
  function scrollWithin(box, el) {
    if (!box || !el) return;
    var b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    box.scrollTop += (r.top - b.top) - (box.clientHeight - r.height) / 2;
  }

  /* ───────── 타이머 (화면이 바뀌면 자동 정리) ───────── */
  var screenTimers = [];
  function every(ms, fn) { var t = setInterval(fn, ms); screenTimers.push(t); return t; }
  function after(ms, fn) { var t = setTimeout(fn, ms); screenTimers.push(t); return t; }
  function clearScreenTimers() { screenTimers.forEach(function (t) { clearInterval(t); clearTimeout(t); }); screenTimers = []; }

  /* ───────── 화면 이동 ───────── */
  var screens = {}, current = "home", params = {}, history = [];
  var MENU_OF = { home: "", places: "places", transit: "transit", parking: "transit", taxi: "transit", bus: "transit", photo: "course", course: "course", food: "food", stay: "food", finder: "ask", ask: "ask", news: "ask" };

  function go(name, p, opts) {
    opts = opts || {};
    if (!screens[name] && name !== "home") return;
    closeModal(true); stopListen();
    var prev = current;
    if (screens[prev] && screens[prev].leave) { try { screens[prev].leave(); } catch (e) { console.error(e); } }
    clearScreenTimers(); B.stopSpeaking();
    if (!opts.back && prev !== name) history.push({ name: prev, params: params });
    if (name === "home") history = [];
    if (history.length > 20) history.shift();
    current = name; params = p || {};
    if (name === "home") {
      content.hidden = true; content.innerHTML = ""; hotspots.hidden = false;
    } else {
      hotspots.hidden = true; content.hidden = false; content.innerHTML = "";
      content.style.animation = "none"; void content.offsetWidth; content.style.animation = "";
      try { screens[name].render(content, params); } catch (e) { console.error(e); content.innerHTML = '<div class="sample-screen"><p class="sample-message">' + T("화면을 여는 중 문제가 생겼어요.") + "</p></div>"; }
    }
    var menu = MENU_OF[name];
    $$(".k-ui [data-menu]").forEach(function (b) {
      var on = !!menu && b.getAttribute("data-menu") === menu;
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    window.dispatchEvent(new CustomEvent("kiosk:screen", { detail: { from: prev, to: name } }));
  }
  function back() {
    var h = history.pop();
    if (!h) return go("home", {}, { back: true });
    go(h.name, h.params, { back: true });
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-go]");
    if (t && kiosk.contains(t)) {
      e.preventDefault();
      var name = t.getAttribute("data-go");
      if (name === "places" && current === "places") return go("home");
      go(name, t.dataset.no ? { no: +t.dataset.no } : {});
    }
  });
  /* ───────── 그림 속 버튼 (투명 터치 영역) ───────── */
  function GREETING() { return T("안녕하세요! 여수 여행을 도와드릴게요. 지도에서 궁금한 관광지를 선택해 주세요. 버튼을 누르거나 말로 질문해도 좋아요!"); }
  function pct(r) { return "left:" + r[0] + "%;top:" + r[1] + "%;width:" + (r[2] - r[0]).toFixed(2) + "%;height:" + (r[3] - r[1]).toFixed(2) + "%"; }
  function renderUi() {
    $("#uiHot").innerHTML = (D.uiHotspots || []).map(function (h) {
      return '<button id="' + h.id + '" data-ui="' + h.act + '"' + (h.menu ? ' data-menu="' + h.menu + '"' : "") + ' aria-label="' + esc(h.label) + '" style="' + pct(h.r) + '"></button>';
    }).join("");
  }
  function setVoice(on, silent) {
    B.setVoice(on);
    kiosk.classList.toggle("k-muted", !on);
    if (!silent) { if (on) { toast(T("음성 안내를 켰어요")); B.speak(T("음성 안내를 켰어요.")); } else toast(T("음성 안내를 껐어요")); }
  }
  $("#uiHot").addEventListener("click", function (e) {
    var b = e.target.closest("[data-ui]"); if (!b) return;
    var a = b.getAttribute("data-ui");
    b.classList.remove("k-tap"); void b.offsetWidth; b.classList.add("k-tap");
    if (a.indexOf("go:") === 0) { var g = a.slice(3); if (g === "places" && current === "places") return go("home"); return go(g); }
    if (a === "home") return go("home");
    if (a === "ask") return go("ask");
    if (a === "talk") return go("ask", { listen: true });
    if (a === "type") return go("ask", { type: true });
    if (a === "greet") { if (!B.voiceOn()) return toast(T("음성 안내가 꺼져 있어요. ‘음성 안내 켜짐’을 눌러 주세요")); return B.speak(GREETING()); }
    if (a === "voiceOn") return setVoice(true);
    if (a === "mute") { B.stopSpeaking(); return setVoice(false); }
    if (a === "replay") { if (!B.voiceOn()) return toast(T("음성 안내가 꺼져 있어요. ‘음성 안내 켜짐’을 눌러 주세요")); return B.speak(B.lastSpoken() || GREETING()); }
    if (a === "lang") return langModal();
  });
  var LANG_HELLO = { ko: "한국어로 안내해요", en: "Now guiding in English", ja: "日本語でご案内します", zh: "现在用中文为您导览" };
  function langModal() {
    var body = openModal("언어 선택 · Language · 言語 · 语言", '<h2 class="k-center">언어 · Language · 言語 · 语言</h2><div class="k-lang">' +
      [["ko", "한국어", "Korean"], ["en", "English", "영어"], ["ja", "日本語", "일본어 · Japanese"], ["zh", "中文", "중국어 · Chinese"]].map(function (l) {
        return '<button data-l="' + l[0] + '"' + (l[0] === L.lang ? ' class="on" aria-pressed="true"' : "") + "><b>" + l[1] + "</b><small>" + l[2] + "</small></button>";
      }).join("") + '</div><p class="k-note k-center">' + T("화면 안내와 음성 안내가 고른 언어로 바뀌어요. 아무도 쓰지 않으면 잠시 뒤 한국어로 돌아와요.") + "</p>");
    $(".k-lang", body).addEventListener("click", function (e) {
      var b = e.target.closest("[data-l]"); if (!b) return;
      setLang(b.getAttribute("data-l"));
    });
  }
  function setLang(lang) {
    closeModal(true);
    L.set(lang);
    B.setLang && B.setLang(L.speech[lang]);
    toast(LANG_HELLO[lang] || ""); B.speak(GREETING());
  }
  L.on(function () {
    renderUi(); renderHotspots(); renderArtLabels(); L.translateDom($("#listening"));
    kiosk.setAttribute("aria-label", T("여수 AI 스마트 여행안내"));
    if (current !== "home") { var keepHist = history.slice(); go(current, params, { back: true }); history = keepHist; }
  });

  /* ───────── 외국어일 때 그림 속 한글 버튼 위에 번역 글자 얹기 ───────── */
  var ART_LABELS = [
    { r: [26.4, 61.15, 57.0, 64.3], bg: "#abf0fa", cls: "k-al-title", t: function () { return T("AI 여행 가이드"); } },
    { r: [68.3, 61.6, 90.4, 63.25], bg: "#a0f0fa", cls: "k-al-pill", t: function () { return T("무엇이든 물어보세요"); } },
    { r: [39.0, 66.15, 90.7, 72.4], bg: "#f5f8fb", cls: "k-al-bubble", t: function () { return "<b>" + esc(T("안녕하세요! 여수 여행을 도와드릴게요.")) + "</b>" + esc(T("지도에서 궁금한 관광지를 선택해 주세요.")) + "<br>" + esc(T("버튼을 누르거나 말로 질문해도 좋아요!")); }, html: true },
    { r: [45.2, 73.8, 57.6, 75.1], bg: "linear-gradient(180deg,#0190fc,#0271fd 50%,#0280fd)", cls: "k-al-white", t: function () { return T("음성 안내 켜짐"); } },
    { r: [66.6, 73.7, 73.1, 75.1], bg: "#f5f8fb", cls: "k-al-small", t: function () { return T("음소거"); } },
    { r: [82.3, 73.7, 91.2, 75.1], bg: "#f5f8fb", cls: "k-al-small", t: function () { return T("다시 듣기"); } },
    { r: [25.0, 77.5, 47.8, 80.0], bg: "linear-gradient(180deg,#05a8fc,#0268f8 42%,#0262f6 62%,#017efd)", cls: "k-al-white k-al-big", t: function () { return T("눌러서 말하기"); } },
    { r: [70.8, 77.6, 89.2, 79.85], bg: "#f5f8fb", cls: "k-al-mid", t: function () { return T("글자로 질문") + " ›"; } },
    { r: [14.3, 95.85, 26.0, 97.65], bg: "#fbfbfc", cls: "k-al-small", t: function () { return T("처음 화면"); } }
  ];
  [["관광지 찾기", "여수 명소 한눈에", 1.85, 25.0], ["교통 · 주차", "버스 · 택시 · 주차장", 25.9, 49.1], ["맛집 · 카페", "여수의 맛과 쉼", 49.9, 73.1], ["추천 코스", "내게 맞는 여행", 73.9, 97.0]].forEach(function (x) {
    ART_LABELS.push({ r: [x[2] + 1.3, 88.55, x[3] - 1.3, 93.3], bg: "#eff8fc", cls: "k-al-tile", html: true, t: function () { return "<b>" + esc(T(x[0])) + "</b><small>" + esc(T(x[1])) + "</small>"; } });
  });
  function fitText(el) {
    var fs = parseFloat(getComputedStyle(el).fontSize), n = 0;
    while (n++ < 14 && fs > 6 && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) { fs *= 0.92; el.style.fontSize = fs + "px"; }
  }
  function renderArtLabels() {
    var box = $("#artLabels"); if (!box) return;
    kiosk.classList.toggle("k-foreign", L.lang !== "ko");
    if (L.lang === "ko") { box.innerHTML = ""; box.hidden = true; return; }
    box.hidden = false;
    var LR = D.listRows, h = ART_LABELS.map(function (a) {
      var t = a.t();
      return '<div class="k-al ' + a.cls + '" style="' + pct(a.r) + ";--bg:" + a.bg + '"><span>' + (a.html ? t : esc(t)) + "</span></div>";
    }).join("");
    D.places.forEach(function (p, i) {
      var top = LR.top + i * LR.height;
      h += '<div class="k-al k-al-row" style="' + pct([8.9, top + 0.42, LR.right - 0.7, top + LR.height - 0.42]) + ';--bg:#002677"><span>' + esc(p.short || p.name) + "</span></div>";
    });
    box.innerHTML = h;
    requestAnimationFrame(function () { $$(".k-al > span", box).forEach(fitText); });
  }
  window.addEventListener("resize", function () { if (L.lang !== "ko") renderArtLabels(); });

  /* ───────── 모달 ───────── */
  var modalOnClose = null;
  function openModal(label, html, opts) {
    opts = opts || {};
    if (modalOnClose) { var f = modalOnClose; modalOnClose = null; try { f(); } catch (e) {} }
    $("#modalLabel").textContent = label || "";
    // 매번 새 요소로 바꿔서 이전 모달의 클릭 처리기가 남지 않게 함
    var old = $("#modalBody"), fresh = old.cloneNode(false); old.parentNode.replaceChild(fresh, old);
    fresh.innerHTML = html; fresh.scrollTop = 0;
    $("#modal").hidden = false;
    modalOnClose = opts.onClose || null;
    paintQR($("#modalBody"));
    return $("#modalBody");
  }
  function closeModal(silent) {
    if ($("#modal").hidden) return;
    $("#modal").hidden = true; $("#modalBody").innerHTML = "";
    if (modalOnClose) { var f = modalOnClose; modalOnClose = null; try { f(silent); } catch (e) {} }
  }
  $("#modalClose").addEventListener("click", function () { closeModal(); });
  $("#modal").addEventListener("click", function (e) { if (e.target.id === "modal") closeModal(); });

  function qrBlock(url, title, sub, center) {
    return '<div class="k-qr-row' + (center ? " center" : "") + '"><div class="k-qr"><canvas data-qr="' + esc(url) + '"></canvas></div><div><b>' + esc(title || T("휴대폰으로 QR을 찍어주세요")) + "</b><span>" + esc(sub || T("카메라 앱으로 찍으면 바로 열려요")) + "</span></div></div>";
  }
  function paintQR(root) {
    $$("canvas[data-qr]", root).forEach(function (c) { try { window.makeQR(c.getAttribute("data-qr"), c, 480); } catch (e) { console.error(e); } });
  }

  /* ───────── 알림 ───────── */
  var toastT;
  function toast(msg, ms) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, ms || 2800);
  }

  /* ───────── 음성 입력 공통 (말로 찾을께 / 뭐든지 묻기) ───────── */
  var listening = false, listenBtn = null;
  function listen(opts) {
    if (listening) { stopListen(); return; }
    listening = true; listenBtn = opts.button || null; B.stopSpeaking();
    if (listenBtn) { listenBtn.classList.add("listening"); listenBtn.setAttribute("aria-pressed", "true"); }
    $("#listeningText").textContent = T("듣고 있어요… 말씀해 주세요");
    $("#listening").hidden = false;
    B.listen({
      onPartial: function (t) { $("#listeningText").textContent = t; activity(); opts.onPartial && opts.onPartial(t); },
      onResult: function (t) { opts.onResult && opts.onResult(t); },
      onError: function (m) { toast(m, 3400); opts.onError && opts.onError(m); },
      onEnd: function () { endListenUi(); }
    });
  }
  function endListenUi() {
    listening = false; $("#listening").hidden = true;
    if (listenBtn) { listenBtn.classList.remove("listening"); listenBtn.setAttribute("aria-pressed", "false"); listenBtn = null; }
  }
  function stopListen() { if (listening) { B.stopListening(); endListenUi(); } }
  $("#listeningStop").addEventListener("click", stopListen);

  /* ───────── 자동 메인 복귀 ───────── */
  var idleT;
  function activity() {
    clearTimeout(idleT);
    idleT = setTimeout(function () {
      if (current === "photo" && window.Photozone && Photozone.busy()) { activity(); return; }
      stopListen(); closeModal(true); if (current !== "home") go("home");
      if (!B.voiceOn()) setVoice(true, true); // 다음 관광객을 위해 음성 안내를 다시 켬
      if (L.lang !== "ko") { L.set("ko"); B.setLang && B.setLang(L.speech.ko); } // 다음 관광객을 위해 한국어로
    }, (C.idleSeconds || 90) * 1000);
  }
  ["pointerdown", "touchstart", "keydown"].forEach(function (ev) { document.addEventListener(ev, activity, { passive: true }); });
  activity();
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); });
  document.addEventListener("dragstart", function (e) { e.preventDefault(); });

  /* ───────── 메인 지도 (원본 위치 그대로) ───────── */
  function renderHotspots() {
    var L = D.listRows, h = "";
    D.places.forEach(function (p, i) {
      h += '<button class="k-row" data-place="' + p.no + '" aria-label="' + esc(T("{0}. {1} 소개", p.no, p.name)) + '" style="left:' + L.left + "%;width:" + (L.right - L.left).toFixed(2) + "%;top:" + (L.top + i * L.height).toFixed(3) + "%;height:" + L.height + '%"></button>';
    });
    D.places.forEach(function (p) {
      (p.hit || []).forEach(function (r) {
        h += '<button class="k-pin" data-place="' + p.no + '" title="' + p.no + ". " + esc(p.name) + '" aria-label="' + esc(T("지도 {0}번 {1} 소개", p.no, p.name)) + '" style="' + pct(r) + '"></button>';
      });
    });
    hotspots.innerHTML = h;
  }
  hotspots.addEventListener("click", function (e) {
    var b = e.target.closest("[data-place]"); if (!b) return;
    var no = +b.getAttribute("data-place");
    $$('[data-place="' + no + '"]', hotspots).forEach(function (m) { m.classList.remove("k-pulse"); void m.offsetWidth; m.classList.add("k-pulse"); });
    setTimeout(function () { go("places", { no: no }); }, 160);
  });

  /* 지도 그림에서 해당 장소 주변을 잘라 보여주기 (인터넷 사진이 없을 때) */
  var art = $(".kiosk-artwork");
  function drawMapCrop(canvas, p) {
    function draw() {
      var m = p.center, W = art.naturalWidth, H = art.naturalHeight;
      var cw = W * 0.42, ch = cw * 9 / 16, cx = W * m[0] / 100, cy = H * m[1] / 100;
      var sx = Math.max(W * 0.27, Math.min(W * 0.975 - cw, cx - cw / 2)), sy = Math.max(H * 0.162, Math.min(H * 0.592 - ch, cy - ch / 2));
      canvas.width = 960; canvas.height = 540;
      var x = canvas.getContext("2d");
      x.imageSmoothingQuality = "high";
      x.drawImage(art, sx, sy, cw, ch, 0, 0, 960, 540);
      var px = (cx - sx) / cw * 960, py = (cy - sy) / ch * 540;
      x.strokeStyle = "#ffef8a"; x.lineWidth = 8;
      x.beginPath(); x.arc(px, py, 34, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = "rgba(255,239,138,.45)"; x.lineWidth = 18;
      x.beginPath(); x.arc(px, py, 50, 0, Math.PI * 2); x.stroke();
    }
    if (art.complete && art.naturalWidth) draw(); else art.addEventListener("load", draw, { once: true });
  }

  /* ───────── 여수 찾기 (관광지 16곳) ───────── */
  screens.places = {
    render: function (el, p) {
      var sel = p.no || 1;
      el.innerHTML = '<section class="places-screen"><nav class="places-rail" aria-label="' + T("관광지 목록") + '">' +
        D.places.map(function (pl) {
          return '<button data-no="' + pl.no + '" aria-pressed="' + (pl.no === sel) + '"><span class="' + pl.color + '">' + pl.no + "</span>" + esc(L.lang === "ko" ? pl.name : pl.short || pl.name) + "</button>";
        }).join("") + '</nav><div class="place-detail" id="placeDetail"></div></section>';
      $(".places-rail", el).addEventListener("click", function (e) {
        var b = e.target.closest("[data-no]"); if (!b) return;
        showPlace(+b.getAttribute("data-no"));
      });
      showPlace(sel);
    }
  };
  var slideT = null, vid = null;
  function stopVideo() { if (vid) { try { vid.destroy(); } catch (e) {} vid = null; } }
  function showPlace(no) {
    var p = place(no); if (!p) return;
    params = { no: no };
    stopVideo();
    $$(".places-rail button").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-no") === no)); });
    var rb = $('.places-rail button[data-no="' + no + '"]'); if (rb) scrollWithin($(".places-rail"), rb);
    var det = $("#placeDetail"); if (!det) return;
    det.scrollTop = 0;
    var useVideo = C.video && C.video.enabled !== false && window.PlaceVideo;
    det.innerHTML =
      '<div class="place-media' + (useVideo ? " k-has-video" : "") + '"><canvas class="k-media-fallback"></canvas><b class="k-media-no k-no-' + p.color + '">' + p.no + '</b><span>' + esc(T("지도에서 본 위치 · {0}", p.area)) + "</span>" +
      (useVideo ? '<div class="k-media-ctl"><button data-media="sound" hidden>' + T("🔊 소리 켜기") + '</button><button data-media="photo">' + T("🖼 사진 보기") + "</button></div>" : "") + "</div>" +
      '<div class="place-caption">' + esc(p.name) + "<br><small>" + esc(p.area) + " · " + p.tags.slice(0, 4).map(function (t) { return "#" + esc(t); }).join(" ") + "</small></div>" +
      "<p>" + esc(p.desc) + "</p>" +
      '<p class="k-wiki">' + (Wiki.enabled() ? T("인터넷에서 사진과 소개를 불러오는 중…") : "") + "</p>" +
      '<div class="place-pager"><button data-act="prev">' + T("‹ 이전") + '</button><button data-act="qr" class="k-primary">' + T("길안내 QR") + '</button><button data-act="taxi">' + T("택시로 가기") + '</button><button data-act="photo">' + T("포토존 배경") + '</button><button data-act="next">' + T("다음 ›") + "</button></div>";
    drawMapCrop($(".k-media-fallback", det), p);
    var media = $(".place-media", det), cap = $(".place-media > span", det), photoCredit = cap.textContent;
    $(".place-pager", det).addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      var a = b.getAttribute("data-act");
      if (a === "prev") showPlace(no === 1 ? D.places.length : no - 1);
      else if (a === "next") showPlace(no === D.places.length ? 1 : no + 1);
      else if (a === "qr") placeQR(p);
      else if (a === "taxi") go("taxi", { tab: 1, dest: p.no });
      else if (a === "photo") go("photo", { bg: "place:" + p.no });
    });

    /* 소개 영상 */
    var videoCaption = "";
    function startVideo() {
      stopVideo(); media.classList.add("k-video-mode"); cap.textContent = T("소개 영상을 불러오는 중…");
      var ctlPhoto = $('[data-media="photo"]', media), ctlSound = $('[data-media="sound"]', media);
      if (ctlPhoto) ctlPhoto.textContent = T("🖼 사진 보기");
      vid = PlaceVideo.mount(media, p, {
        onState: function (t) { videoCaption = "▶ " + t; if (media.classList.contains("k-video-mode")) cap.textContent = videoCaption; },
        onPlaying: function () { if (ctlSound && vid && vid.isMuted()) ctlSound.hidden = false; },
        onFail: function (why) { vid = null; media.classList.remove("k-video-mode"); cap.textContent = why; if (ctlSound) ctlSound.hidden = true; if (ctlPhoto) ctlPhoto.textContent = T("▶ 영상 다시 보기"); }
      });
    }
    function showPhotos() {
      stopVideo(); media.classList.remove("k-video-mode");
      var ctlSound = $('[data-media="sound"]', media); if (ctlSound) ctlSound.hidden = true;
      var cur = $("img.on", media); cap.textContent = cur ? (cur.getAttribute("data-credit") || photoCredit) : photoCredit;
      $('[data-media="photo"]', media).textContent = T("▶ 영상 보기");
    }
    if (useVideo) {
      $(".k-media-ctl", media).addEventListener("click", function (e) {
        var b = e.target.closest("[data-media]"); if (!b) return; e.stopPropagation();
        if (b.getAttribute("data-media") === "sound") { if (vid) { vid.unmute(); b.hidden = true; toast(T("소리를 켰어요")); } return; }
        if (media.classList.contains("k-video-mode")) showPhotos(); else startVideo();
      });
      startVideo();
    }

    clearInterval(slideT);
    Wiki.place(p).then(function (info) {
      if (params.no !== no || current !== "places") return;
      var wk = $(".k-wiki", det);
      if (!info) { if (wk) wk.textContent = ""; return; }
      if (wk) wk.innerHTML = info.extract ? "<b>" + T("위키백과") + "</b> · " + esc(info.extract) : "";
      if (info.images.length) startSlides(det, info.images, p);
    });
  }
  function startSlides(det, images, p) {
    var media = $(".place-media", det), cap = $(".place-media > span", det), idx = 0, imgs = [];
    images.forEach(function (im, i) {
      var img = new Image(); img.alt = p.name; img.decoding = "async";
      img.onload = function () {
        if (!media.isConnected) return;
        img.setAttribute("data-credit", im.credit);
        if (!imgs.length) { img.classList.add("on"); if (!media.classList.contains("k-video-mode")) cap.textContent = im.credit; }
        imgs.push({ el: img, credit: im.credit });
      };
      img.src = im.src; media.insertBefore(img, cap);
    });
    clearInterval(slideT);
    slideT = setInterval(function () {
      if (!media.isConnected) { clearInterval(slideT); return; }
      if (imgs.length < 2) return;
      imgs[idx].el.classList.remove("on"); idx = (idx + 1) % imgs.length;
      imgs[idx].el.classList.add("on"); if (!media.classList.contains("k-video-mode")) cap.textContent = imgs[idx].credit;
    }, 4500);
  }
  function placeQR(p) {
    openModal(T("길안내"), "<h2>" + p.no + ". " + esc(p.name) + '</h2><p class="k-sub">' + esc(p.area) + "</p>" +
      qrBlock(MAP(p.map), T("휴대폰 지도로 길안내"), T("QR을 찍으면 네이버 지도에서 '{0}' 위치가 열려요. 길찾기를 누르면 출발할 수 있어요.", L.lang === "ko" ? p.map : p.name)) +
      '<div class="k-actions"><button data-go="taxi">' + T("🚕 택시로 가기") + '</button><button data-go="bus">' + T("🚌 가는 버스") + '</button><button data-go="parking">' + T("🅿️ 주변 주차장") + '</button><button data-go="food">' + T("🍽️ 주변 맛집") + '</button><button data-go="stay">' + T("🛏️ 주변 숙소") + "</button></div>");
    $$(".k-actions [data-go]", $("#modalBody")).forEach(function (b) {
      var g = b.getAttribute("data-go"); b.removeAttribute("data-go"); b.setAttribute("data-target", g);
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        go(g, g === "taxi" ? { tab: 1, dest: p.no } : g === "parking" ? { near: p.no } : (g === "food" || g === "stay") ? { q: p.name } : { tab: 1, place: p.no });
      });
    });
  }
  window.addEventListener("kiosk:screen", function (e) { if (e.detail.from === "places") { clearInterval(slideT); stopVideo(); } });

  /* ───────── 소식 상세 ───────── */
  screens.news = {
    render: function (el, p) {
      var n = D.news.filter(function (x) { return x.id === p.id; })[0] || D.news[0];
      var kp = L.ko(n, "place") + L.ko(n, "title");
      var rel = D.places.filter(function (pl) { return kp.indexOf(L.ko(pl, "name").replace(/^여수/, "").slice(0, 3)) >= 0; })[0] || (/박람회|빅오|BIG-O|스카이타워/.test(kp) ? D.places[3] : /진남관/.test(kp) ? D.places[8] : /오동도/.test(kp) ? D.places[7] : null);
      el.innerHTML = '<article class="map-news-detail"><header><span>' + esc(T("{0} · 여수 소식", n.label)) + '</span><button aria-label="' + T("닫기") + '" data-close>' + ICON.close + "</button></header>" +
        "<img src=\"assets/bg-nightsea.jpg\" alt=\"\">" +
        "<div><h2>" + esc(n.title) + "</h2><small>" + esc(n.date) + " · " + esc(n.place) + "</small><p>" + esc(n.body) + "</p>" +
        '<button data-qr-news>' + T("휴대폰으로 소식 보기 (QR)") + "</button>" + (rel ? '<button class="k-ghost" data-place-go="' + rel.no + '">' + esc(T("{0} 안내 보기", rel.name)) + "</button>" : "") +
        '<button class="k-ghost" data-more>' + T("다른 소식 보기") + "</button></div></article>";
      $("[data-close]", el).addEventListener("click", back);
      $("[data-qr-news]", el).addEventListener("click", function () { openModal(T("여수 소식"), "<h2>" + esc(n.title) + "</h2>" + qrBlock(WEB("여수 " + L.ko(n, "place") + " 행사"), T("휴대폰으로 이어서 보기"), T("QR을 찍으면 관련 소식을 검색해 보여드려요."))); });
      var pg = $("[data-place-go]", el); if (pg) pg.addEventListener("click", function () { go("places", { no: +pg.getAttribute("data-place-go") }); });
      $("[data-more]", el).addEventListener("click", function () { go("finder", { query: T("행사") }); });
    }
  };

  /* ───────── 관리자 ───────── */
  var taps = 0, tapT;
  $("#adminHit").addEventListener("click", function () {
    taps++; clearTimeout(tapT); tapT = setTimeout(function () { taps = 0; }, 2500);
    if (taps >= 5) { taps = 0; adminPin(); }
  });
  function adminPin() {
    var pin = "";
    var body = openModal("관리자", '<h2 class="k-center">관리자 PIN</h2><div class="k-pin" id="pinView"></div><div class="k-keypad">' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9, "지움", 0, "확인"].map(function (k) { return '<button data-k="' + k + '"' + (isNaN(k) ? ' class="k-fn"' : "") + ">" + k + "</button>"; }).join("") + "</div>");
    $(".k-keypad", body).addEventListener("click", function (e) {
      var b = e.target.closest("[data-k]"); if (!b) return; var k = b.getAttribute("data-k");
      if (k === "지움") pin = ""; else if (k === "확인") { if (pin === String(C.adminPin)) return adminPanel(); toast("PIN이 맞지 않아요"); pin = ""; } else if (pin.length < 8) pin += k;
      $("#pinView").textContent = pin.replace(/./g, "●");
    });
  }
  function adminPanel() {
    var info = B.info();
    var seg = window.Photozone ? Photozone.aiStatus() : "-";
    openModal("관리자", "<h2>키오스크 관리</h2>" +
      '<dl class="k-meta"><dt>실행 환경</dt><dd>' + esc(info.platform) + (info.version ? " · 앱 " + esc(info.version) : "") + (info.model ? " · " + esc(info.model) : "") + "</dd>" +
      "<dt>화면</dt><dd>" + window.innerWidth + "×" + window.innerHeight + " (배율 " + (window.devicePixelRatio || 1) + ")</dd>" +
      "<dt>인터넷</dt><dd>" + (navigator.onLine ? "연결됨" : "끊김") + "</dd>" +
      "<dt>위키 자료</dt><dd>" + (C.useWikiContent ? "사용" : "끔") + "</dd>" +
      "<dt>음성인식</dt><dd>" + (B.isNative ? (info.speech ? "사용 가능" : "엔진 없음") : ((window.SpeechRecognition || window.webkitSpeechRecognition) ? "브라우저 지원" : "미지원")) + "</dd>" +
      "<dt>AI 합성</dt><dd>" + esc(seg) + "</dd>" +
      "<dt>안내 자료</dt><dd>" + (D.stats ? "버스 노선 " + D.stats.routes + " · 정류장 " + D.stats.stops + " · 맛집 " + D.stats.food + " · 숙소 " + D.stats.stay + " · 주차장 " + D.stats.parking + " · 택시 " + D.stats.taxi + " · 소식 " + D.stats.news + " · 명소 " + D.stats.spots : "-") + "</dd>" +
      "<dt>QR 업로드</dt><dd>" + esc(C.photo.upload && C.photo.upload.url || "없음") + "</dd>" +
      "<dt>뭐든지 묻기</dt><dd>" + (C.ai.endpoint ? "AI 서버 연결" : "내장 답변 + 위키백과") + "</dd></dl>" +
      '<div class="k-actions"><button data-a="update" class="k-primary">🔄 업데이트</button><button data-a="video" class="k-yellow">🎬 관광지 영상 바꾸기</button><button data-a="reload" class="k-primary">화면 새로고침</button><button data-a="cache">저장된 자료 지우기</button><button data-a="exit" class="k-danger">키오스크 종료</button></div>');
    $(".k-actions", $("#modalBody")).addEventListener("click", function (e) {
      var a = e.target.closest("[data-a]"); if (!a) return; a = a.getAttribute("data-a");
      if (a === "update") return adminUpdate();
      if (a === "video") return adminVideo(1);
      if (a === "reload") B.reload();
      if (a === "cache") { try { Object.keys(localStorage).forEach(function (k) { if (/^wiki:|^kiosk:/.test(k)) localStorage.removeItem(k); }); } catch (e2) {} toast("저장된 자료를 지웠어요"); }
      if (a === "exit") B.exitKiosk();
    });
  }

  /* 관리자: 원격 업데이트 (자동 확인 상태 + 지금 업데이트) */
  var STATE_TEXT = { idle: "대기", checking: "확인 중", downloading: "받는 중", installing: "설치 중", ready: "적용 대기",
    applied: "적용됨", latest: "최신", blocked: "앱 업데이트 필요", permission: "설치 권한 필요", error: "오류", off: "꺼짐", reset: "되돌림" };
  function adminUpdate() {
    var U = window.KioskUpdate;
    if (!U || !U.available) {
      openModal("업데이트", '<h2>🔄 업데이트</h2><p class="k-sub">원격 업데이트는 안드로이드 앱 안에서만 동작해요. 브라우저에서는 새로고침하면 최신 화면이에요.</p>');
      return;
    }
    function time(ms) { if (!ms) return "아직 없음"; var d = new Date(ms); return d.toLocaleDateString() + " " + d.toLocaleTimeString(); }
    function render(st) {
      var body = $("#modalBody"); if (!body || !$("#updBox", body)) return;
      $("#updBox", body).innerHTML =
        '<dl class="k-meta">' +
        "<dt>상태</dt><dd><b>" + esc(STATE_TEXT[st.state] || st.state || "-") + "</b> · " + esc(st.message || "") + "</dd>" +
        "<dt>채널</dt><dd>" + esc(st.channel || "-") + "</dd>" +
        "<dt>이 기기</dt><dd>앱 " + esc(st.appVersion || "-") + " (코드 " + esc(st.appVersionCode) + ") · 화면 " + esc(st.webVersion) + (st.webSource === "update" ? " (업데이트로 받음)" : " (앱 기본)") + "</dd>" +
        "<dt>배포된 최신</dt><dd>" + (st.remoteWeb ? "화면 " + esc(st.remoteWeb) + " · 앱 " + esc(st.remoteApp || "-") + (st.publishedAt ? " · " + esc(st.publishedAt.replace("T", " ").slice(0, 16)) : "") : "아직 확인 전") + "</dd>" +
        "<dt>자동 확인</dt><dd>" + esc(st.autoMinutes) + "분마다 · " + (st.applyHour < 0 ? "받는 즉시 적용" : esc(st.applyHour) + "시에 적용") + "</dd>" +
        "<dt>마지막 확인</dt><dd>" + esc(time(st.lastCheck)) + "</dd>" +
        "<dt>앱 설치 방식</dt><dd>" + (st.deviceOwner ? "자동 설치 (Device Owner)" : "설치 확인창 1번") + "</dd></dl>";
    }
    openModal("업데이트", "<h2>🔄 업데이트</h2>" +
      '<p class="k-sub">새 버전이 배포되면 자동으로 받아요. 바로 확인하려면 \'지금 업데이트\'를 누르세요.</p>' +
      '<div id="updBox"></div>' +
      '<div class="k-actions"><button data-u="check" class="k-primary">지금 업데이트</button><button data-u="reset">앱 기본 화면으로 되돌리기</button></div>');
    var off = U.on(render);
    render(U.status());
    var body = $("#modalBody");
    $(".k-actions", body).addEventListener("click", function (e) {
      var b = e.target.closest("[data-u]"); if (!b) return;
      if (b.getAttribute("data-u") === "check") { U.check(); toast("새 버전을 확인할게요"); }
      else { U.reset(); toast("앱 기본 화면으로 되돌려요"); }
    });
    // 창이 닫히면 상태 구독 해제
    var mo = new MutationObserver(function () { if ($("#modal").hidden || !$("#updBox")) { off(); mo.disconnect(); } });
    mo.observe($("#modal"), { attributes: true, childList: true, subtree: true });
  }

  /* 관리자: 관광지별 유튜브 영상 지정 */
  function adminVideo(no) {
    var p = place(no), ov = PlaceVideo.getOverride(no);
    var body = openModal("관광지 영상 바꾸기", "<h2>🎬 관광지 영상 바꾸기</h2>" +
      '<p class="k-sub">관광지를 고르고 유튜브 영상 주소를 붙여넣으세요. 이 기기에 저장되고, 지정한 영상이 가장 먼저 재생돼요.</p>' +
      '<div class="k-chips">' + D.places.map(function (x) { return '<button data-no="' + x.no + '"' + (x.no === no ? ' class="on"' : "") + ">" + x.no + ". " + esc(x.name) + (PlaceVideo.getOverride(x.no) ? " ●" : "") + "</button>"; }).join("") + "</div>" +
      "<h3>" + p.no + ". " + esc(p.name) + "</h3>" +
      '<dl class="k-meta"><dt>지정 영상</dt><dd>' + (ov ? esc(ov) : "없음 (기본 후보 영상 사용)") + "</dd><dt>기본 후보</dt><dd>" + esc((p.videos || []).join(", ") || "없음") + "</dd></dl>" +
      '<form class="k-search" id="vForm"><input id="vUrl" placeholder="https://www.youtube.com/watch?v=… 또는 youtu.be/…" value="' + esc(ov ? "https://youtu.be/" + ov : "") + '"><button type="submit">저장</button></form>' +
      '<div class="k-actions"><button data-v="clear">기본값으로 되돌리기</button><button data-v="test" class="k-primary">이 관광지 화면에서 확인</button></div>' +
      '<p class="k-note">여수시 공식 채널이 아니어도, 관리자가 지정한 영상은 그대로 재생돼요. 퍼가기가 막힌 영상은 재생되지 않아요.</p>');
    $(".k-chips", body).addEventListener("click", function (e) { var b = e.target.closest("[data-no]"); if (b) adminVideo(+b.getAttribute("data-no")); });
    $("#vForm", body).addEventListener("submit", function (e) {
      e.preventDefault(); var id = PlaceVideo.parseId($("#vUrl", body).value);
      if (!id) return toast("유튜브 주소를 확인해 주세요");
      PlaceVideo.setOverride(no, id); toast(p.name + " 영상을 저장했어요"); adminVideo(no);
    });
    body.addEventListener("click", function (e) {
      var b = e.target.closest("[data-v]"); if (!b) return;
      if (b.getAttribute("data-v") === "clear") { PlaceVideo.setOverride(no, null); toast("기본 영상으로 되돌렸어요"); adminVideo(no); }
      else { closeModal(); go("places", { no: no }); }
    });
  }

  /* ───────── 안드로이드 뒤로가기 키 ───────── */
  window.KioskBack = function () {
    if (!$("#listening").hidden) return stopListen();
    if (!$("#modal").hidden) return closeModal();
    if (current !== "home") return back();
  };

  /* ───────── 공개 ───────── */
  window.Kiosk = {
    $: $, $$: $$, esc: esc, scrollWithin: scrollWithin, ICON: ICON, MAP: MAP, WEB: WEB, place: place, won: won,
    go: go, back: back, current: function () { return current; }, params: function () { return params; },
    screens: screens, every: every, after: after,
    modal: openModal, closeModal: closeModal, qrBlock: qrBlock, paintQR: paintQR, toast: toast, setLang: setLang,
    listen: listen, stopListen: stopListen, activity: activity
  };

  L.set("ko", { force: false });
  L.watch(kiosk);
  renderUi();
  renderHotspots();
  go("home");
})();

/*
 * AI 포토존: 동의 → 카메라 촬영 → 여수 배경 선택 → AI 인물 합성 → 저장 · QR · 출력
 * - AI 인물 분리: MediaPipe 셀피 분리 모델(인터넷에서 불러옴, js/config.js 에서 주소 변경 가능)
 * - 모델을 못 불러오면 '부드러운 테두리 합성'으로 자동 대체되어 항상 결과가 나옵니다.
 * - 배경: 원본 포스터의 야경 3종 + 관광지 16곳(인터넷 연결 시 위키미디어 공용 사진)
 */
(function () {
  "use strict";
  var K = window.Kiosk, C = window.KIOSK_CONFIG, D = window.KIOSK_DATA, B = window.KioskBridge;
  var $ = K.$, $$ = K.$$, esc = K.esc;
  var OW = 1000, OH = 1200; // 결과물 5:6

  var SILHOUETTE = '<svg class="photo-silhouette" viewBox="0 0 100 120" fill="currentColor" aria-hidden="true"><circle cx="50" cy="42" r="19"/><path d="M12 120c2-26 18-40 38-40s36 14 38 40z"/></svg>';
  var ICO = {
    cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
  };

  /* 배경 목록 */
  var L = window.I18N;
  var BGS = [
    { id: "art:bridge", ko: "돌산대교 야경", area: "야경", src: "assets/bg-bridge.jpg" },
    { id: "art:nightsea", ko: "여수 밤바다", area: "야경", src: "assets/bg-nightsea.jpg" },
    { id: "art:star", ko: "별빛 바다", area: "야경", src: "assets/bg-starlight.jpg" }
  ].concat(D.places.map(function (p) { return { id: "place:" + p.no, area: L.ko(p, "area"), place: p }; }));
  // 이름은 지금 언어로 (관광지 이름은 언어를 바꾸면 함께 바뀜)
  BGS.forEach(function (b) { Object.defineProperty(b, "name", { get: function () { return b.place ? b.place.name : T(b.ko); } }); });
  /* 사진 출처 문구 번역 (작가 이름은 그대로) */
  function credit(c) {
    c = String(c || "");
    var whole = T(c); if (whole !== c) return whole;
    return c.replace(/^배경: /, T("배경: {0}", "")).replace(/^사진: /, T("사진: {0}", "")).replace("(위키미디어 공용)", T("(위키미디어 공용)")).replace(/위키백과 「(.+)」 문서/, function (m, t) { return T("위키백과 「{0}」 문서", t); });
  }
  function bgById(id) { return BGS.filter(function (b) { return b.id === id; })[0]; }

  var st = null, stream = null, demoAnim = null, busy = false, segmenter = null, segState = "미로딩";
  function fresh(bg) { return { photo: null, bg: bg || "art:bridge", result: null, mode: "", consent: false, uploadUrl: null }; }

  /* ───────── 화면 ───────── */
  K.screens.photo = {
    render: function (el, prm) {
      st = fresh(prm.bg && bgById(prm.bg) ? prm.bg : null);
      el.innerHTML = '<section class="kiosk-photo">' +
        '<div class="live-title"><div><h1>AI 포토존 <span>· 여수에서 인생샷!</span></h1><p>사진을 찍고 여수 배경을 고르면 AI가 자연스럽게 합성해 드려요</p></div><button class="live-icon" data-act="help" aria-label="사용 방법">' + ICO.help + "</button></div>" +
        '<div class="live-steps"><span data-step="1"><b>1</b> 사진 촬영</span><span data-step="2"><b>2</b> 배경 선택</span><span data-step="3"><b>3</b> AI 합성</span><span data-step="4"><b>4</b> 저장·QR</span></div>' +
        '<div class="live-columns">' +
        '<aside><section class="live-photo"><h2>내 사진 <small>촬영 후 확인</small></h2><div id="pzPhoto"></div>' +
        '<button class="live-camera" data-act="camera">' + ICO.cam + "카메라로 촬영</button>" +
        '<button class="live-album" data-act="retake" disabled>' + ICO.redo + "다시 찍기</button></section>" +
        '<label class="live-consent"><input type="checkbox" id="pzConsent"><span>사진 촬영과 합성에 동의해요 <b>(필수)</b></span></label>' +
        '<details class="live-privacy"><summary>개인정보 안내</summary><p>촬영한 사진은 이 기기 안에서만 합성되고, 화면을 떠나거나 메인으로 돌아가면 바로 지워져요. ‘QR로 받기’를 누를 때만 사진이 임시 저장 서버에 올라가며, 내려받기 주소는 일정 시간 뒤 만료됩니다.</p></details></aside>' +
        '<div class="live-right"><section class="live-result"><h2>AI 합성 결과 <small id="pzBgName"></small></h2><div id="pzResult"></div>' +
        '<div class="live-actions"><button class="live-generate" data-act="generate" disabled>' + ICO.spark + "AI 합성하기</button>" +
        '<button class="live-save" data-act="save" disabled>' + ICO.save + "기기에 저장하기</button>" +
        '<button class="live-save" data-act="qr" disabled>' + ICO.qr + "QR로 휴대폰에 받기</button>" +
        (C.photo.printEnabled ? '<button class="live-save" data-act="print" disabled>' + ICO.print + "사진 출력하기</button>" : "") + "</div>" +
        '<div class="live-meta"><span id="pzMode">' + esc(T("AI 준비: {0}", T(segState))) + '</span><button data-act="reset">' + ICO.redo + "처음부터</button></div></section></div></div>" +
        '<section class="live-backgrounds"><h2>여수 배경 선택 <small>' + T("{0}가지", BGS.length) + "</small></h2>" +
        '<div class="photo-theme-filters"><input id="pzSearch" placeholder="배경 검색 (예: 오동도, 야경)" maxlength="30"><select id="pzArea"><option value="">' + T("전체 지역") + "</option>" + ["야경", "만성리 일대", "여수신항", "여수항"].map(function (a) { return '<option value="' + a + '">' + esc(T(a)) + "</option>"; }).join("") + "</select></div>" +
        '<div class="live-bg-grid" id="pzGrid"></div>' +
        '<details class="theme-note"><summary>배경 사진 안내</summary><p>야경 배경은 키오스크 그림에서 가져왔어요. 관광지 배경은 인터넷이 연결되면 위키미디어 공용(자유 이용 사진)에서 불러오고, 없으면 야경 그림으로 대신해요.</p></details></section>' +
        "</section>";
      var root = $(".kiosk-photo", el);
      root.addEventListener("click", onClick);
      $("#pzConsent").addEventListener("change", function () { st.consent = this.checked; update(); });
      $("#pzSearch").addEventListener("input", drawGrid);
      $("#pzArea").addEventListener("change", drawGrid);
      $("#pzGrid").addEventListener("click", function (e) {
        var b = e.target.closest("[data-bg]"); if (!b || busy) return;
        st.bg = b.getAttribute("data-bg"); st.result = null; st.uploadUrl = null; drawGrid(); update();
        if (st.photo) { K.toast(T("배경을 골랐어요. ‘AI 합성하기’를 눌러주세요")); reveal(".live-title"); }
      });
      drawGrid(); update();
      preloadSegmenter();
    },
    leave: function () { closeCamera(); busy = false; st = null; } // 사진은 화면을 떠나면 지움
  };

  function drawGrid() {
    var q = ($("#pzSearch") || {}).value || "", area = ($("#pzArea") || {}).value || "";
    var list = BGS.filter(function (b) { return (!area || b.area === area) && (!q || (b.name + " " + (b.ko || L.ko(b.place, "name")) + b.area + T(b.area)).toLowerCase().indexOf(q.trim().toLowerCase()) >= 0); });
    $("#pzGrid").innerHTML = list.length ? list.map(function (b) {
      var sel = b.id === st.bg;
      return '<button data-bg="' + b.id + '" class="' + (sel ? "selected" : "") + '"' + (busy ? " disabled" : "") + ">" + (sel ? "<span>" + ICO.check + "</span>" : "") +
        "<strong>" + (b.place ? b.place.no + ". " : "") + esc(b.name) + "</strong></button>";
    }).join("") : '<div class="photo-theme-empty">찾는 배경이 없어요.</div>';
  }

  function update() {
    if (!st) return;
    var step = !st.photo ? 1 : !st.result ? (st.bg ? 3 : 2) : 4;
    $$(".live-steps span").forEach(function (s) { var n = +s.getAttribute("data-step"); s.className = n === step ? "on" : n < step ? "done" : ""; });
    var bg = bgById(st.bg); $("#pzBgName").textContent = bg ? T("배경: {0}", bg.name) : "";
    // 내 사진
    var ph = $("#pzPhoto");
    if (st.photo) { if (ph.firstChild !== st.photo) { ph.innerHTML = ""; ph.appendChild(st.photo); } }
    else ph.innerHTML = '<div class="live-empty">' + SILHOUETTE + "<p>" + (st.consent ? "‘카메라로 촬영’을 눌러<br>사진을 찍어주세요" : "아래 동의에 체크한 뒤<br>사진을 찍어주세요") + "</p></div>";
    // 결과
    var rs = $("#pzResult");
    if (busy) { /* 진행 화면 유지 */ }
    else if (st.result) { if (rs.firstChild !== st.result) { rs.innerHTML = ""; rs.appendChild(st.result); } }
    else rs.innerHTML = '<div class="live-empty">' + SILHOUETTE + "<p>" + (st.photo ? "배경을 고르고<br>‘AI 합성하기’를 눌러주세요" : "사진을 찍으면<br>여기에 합성 결과가 나와요") + "</p></div>";
    $("[data-act=camera]").disabled = busy || !st.consent || !!st.photo;
    $("[data-act=retake]").disabled = busy || !st.consent || !st.photo;
    $("[data-act=generate]").disabled = busy || !st.photo || !st.bg || !st.consent;
    $$("[data-act=save],[data-act=qr],[data-act=print]").forEach(function (b) { b.disabled = busy || !st.result; });
    var m = $("#pzMode"); if (m) m.textContent = st.mode ? st.mode : T("AI 준비: {0}", T(segState));
  }

  function onClick(e) {
    var b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
    var a = b.getAttribute("data-act");
    if (a === "help") return help();
    if (a === "camera" || a === "retake") return openCamera();
    if (a === "generate") return generate();
    if (a === "save") return K.toast(T(B.saveImage(resultUrl(), stamp()) || "저장했어요"), 3200);
    if (a === "print") return K.toast(T(B.printImage(resultUrl()) || "출력 중이에요"), 3200);
    if (a === "qr") return qr();
    if (a === "reset") { closeCamera(); var keep = st.consent; st = fresh(st.bg); st.consent = keep; drawGrid(); update(); }
    if (a === "shoot") return shoot();
    if (a === "close-cam") return closeCamera();
  }

  function help() {
    K.modal("AI 포토존 사용 방법", "<h2>이렇게 이용하세요</h2>" +
      '<dl class="k-meta"><dt>① 동의</dt><dd>‘사진 촬영과 합성에 동의해요’에 체크해요.</dd><dt>② 촬영</dt><dd>' + T("‘카메라로 촬영’ → 화면의 점선 안에 얼굴을 맞추고 ‘촬영’을 누르면 {0}초 뒤 찍혀요.", C.photo.countdown || 3) + "</dd>" +
      "<dt>③ 배경</dt><dd>아래 목록에서 여수 배경을 골라요.</dd><dt>④ 합성</dt><dd>‘AI 합성하기’를 누르면 AI가 사람만 오려 배경과 합쳐요.</dd><dt>⑤ 받기</dt><dd>기기에 저장하거나, QR을 찍어 휴대폰으로 받거나, 출력해요.</dd></dl>" +
      '<p class="k-note">사진은 화면을 떠나면 바로 지워져요.</p>');
  }

  /* ───────── 카메라 ───────── */
  function openCamera() {
    if (!st.consent) return K.toast("먼저 동의에 체크해 주세요");
    busy = true; update();
    var wrap = document.createElement("div"); wrap.className = "k-camwrap"; wrap.id = "pzCam";
    var sheet = document.createElement("div"); sheet.className = "camera-sheet"; sheet.id = "pzSheet"; wrap.appendChild(sheet);
    sheet.innerHTML = '<div class="camera-top"><span>📷 화면의 점선 안에 얼굴을 맞춰주세요</span><button class="live-icon" data-act="close-cam" aria-label="닫기">' + ICO.close + "</button></div>" +
      '<div class="camera-view"><video autoplay playsinline muted></video><canvas class="k-demo-cam" hidden></canvas><div class="k-guide"></div><div class="countdown"></div><div class="k-flash"></div></div>' +
      '<div class="k-actions"><button class="k-yellow" data-act="shoot">' + T("촬영 ({0}초 후)", C.photo.countdown || 3) + '</button><button data-act="close-cam">취소</button></div>' +
      "<small>카메라 영상은 저장되지 않아요. 촬영한 사진 1장만 이 기기 안에서 합성에 쓰여요.</small>";
    $("#content").appendChild(wrap); // 스크롤 영역 밖(패널 전체)을 덮도록
    wrap.addEventListener("click", onClick);
    var video = $("video", sheet);
    var start = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      : Promise.reject(new Error("no camera api"));
    start.then(function (s) {
      if (!sheet.isConnected) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s; video.srcObject = s; return video.play().catch(function () {});
    }).catch(function () {
      if (!sheet.isConnected) return;
      video.hidden = true; demoCamera($("canvas.k-demo-cam", sheet));
      $(".camera-top span", sheet).textContent = "카메라를 찾지 못해 연습용 화면으로 촬영해요";
    });
  }
  function demoCamera(cv) {
    cv.hidden = false; cv.width = 960; cv.height = 1152; var t0 = performance.now();
    (function loop(t) {
      var x = cv.getContext("2d"), a = (t - t0) / 1000, g = x.createLinearGradient(0, 0, 0, cv.height);
      g.addColorStop(0, "#d6e6f5"); g.addColorStop(1, "#a9c3dc"); x.fillStyle = g; x.fillRect(0, 0, cv.width, cv.height);
      var cx = 480 + Math.sin(a * 1.2) * 30;
      x.fillStyle = "#2b4a6b"; x.beginPath(); x.ellipse(cx, 1180, 330, 360, 0, Math.PI, 0); x.fill();
      x.fillStyle = "#f2c9a5"; x.beginPath(); x.arc(cx, 520, 150, 0, 7); x.fill();
      x.fillStyle = "#3a2a20"; x.beginPath(); x.arc(cx, 470, 158, Math.PI * 1.05, Math.PI * 1.95); x.fill();
      x.fillStyle = "#1b2b4d"; x.beginPath(); x.arc(cx - 52, 520, 13, 0, 7); x.arc(cx + 52, 520, 13, 0, 7); x.fill();
      x.strokeStyle = "#a33"; x.lineWidth = 9; x.beginPath(); x.arc(cx, 560, 48, .25, Math.PI - .25); x.stroke();
      demoAnim = requestAnimationFrame(loop);
    })(t0);
  }
  function closeCamera() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    if (demoAnim) cancelAnimationFrame(demoAnim); demoAnim = null;
    var s = $("#pzCam"); if (s) s.remove();
    if (busy && st && !st.generating) { busy = false; update(); }
  }
  function reveal(sel) { var el = $(sel), sc = $(".kiosk-photo"); if (el && sc) sc.scrollTo({ top: Math.max(0, el.offsetTop - 10), behavior: "smooth" }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function shoot() {
    var sheet = $("#pzSheet"); if (!sheet || sheet.dataset.shooting) return;
    sheet.dataset.shooting = "1";
    $$("[data-act=shoot],[data-act=close-cam]", sheet).forEach(function (b) { b.disabled = true; });
    var cd = $(".countdown", sheet), n = C.photo.countdown || 3;
    (function tick(i) {
      if (!sheet.isConnected) return;
      if (i > 0) {
        cd.textContent = i; cd.classList.remove("pop"); void cd.offsetWidth; cd.classList.add("pop"); K.activity();
        return sleep(900).then(function () { tick(i - 1); });
      }
      cd.textContent = "";
      var fl = $(".k-flash", sheet); fl.classList.add("go");
      st.photo = capture(sheet); st.result = null; st.uploadUrl = null; st.mode = "";
      setTimeout(function () { closeCamera(); busy = false; update(); reveal(".live-backgrounds"); B.speak(T("사진을 찍었어요. 배경을 고르고 AI 합성하기를 눌러주세요.")); }, 350);
    })(n);
  }
  function capture(sheet) {
    var v = $("video", sheet), demo = $("canvas.k-demo-cam", sheet);
    var src = stream && !v.hidden && v.videoWidth ? v : demo;
    var sw = src.videoWidth || src.width, sh = src.videoHeight || src.height;
    var c = document.createElement("canvas"); c.width = OW; c.height = OH;
    var x = c.getContext("2d"), s = Math.max(OW / sw, OH / sh), dw = sw * s, dh = sh * s;
    x.translate(OW, 0); x.scale(-1, 1); // 거울처럼 (화면에서 본 그대로)
    x.drawImage(src, (OW - dw) / 2, (OH - dh) / 2, dw, dh);
    return c;
  }

  /* ───────── AI 인물 분리 ───────── */
  var segLoading = null;
  function preloadSegmenter() {
    if (segmenter || segLoading || navigator.onLine === false) return segLoading || Promise.resolve(segmenter);
    segState = "불러오는 중"; update();
    var dynImport;
    try { dynImport = new Function("u", "return import(u)"); } catch (e) { segState = "지원 안 됨(기본 합성)"; return Promise.resolve(null); }
    segLoading = Promise.race([
      dynImport(C.photo.segmenterModule).then(function (mod) {
        return mod.FilesetResolver.forVisionTasks(C.photo.segmenterWasm).then(function (fs) {
          function make(delegate) {
            return mod.ImageSegmenter.createFromOptions(fs, { baseOptions: { modelAssetPath: C.photo.segmenterModel, delegate: delegate }, runningMode: "IMAGE", outputCategoryMask: false, outputConfidenceMasks: true });
          }
          return make("GPU").catch(function () { return make("CPU"); });
        });
      }),
      sleep(25000).then(function () { throw new Error("timeout"); })
    ]).then(function (s) { segmenter = s; segState = "준비됨"; update(); return s; })
      .catch(function (e) { console.warn("segmenter", e); segLoading = null; segState = "연결 안 됨(기본 합성)"; update(); return null; });
    return segLoading;
  }
  function personMask(canvas) {
    var out = null;
    function grab(res) {
      var m = res && res.confidenceMasks && res.confidenceMasks[0]; if (!m) return;
      out = { w: m.width, h: m.height, data: m.getAsFloat32Array().slice() };
    }
    var ret = segmenter.segment(canvas, grab);
    if (!out && ret) { grab(ret); if (ret.close) ret.close(); }
    if (!out) throw new Error("no mask");
    // 마스크 → 알파 캔버스 (경계 부드럽게)
    var mc = document.createElement("canvas"); mc.width = out.w; mc.height = out.h;
    var mx = mc.getContext("2d"), id = mx.createImageData(out.w, out.h);
    for (var i = 0; i < out.data.length; i++) {
      var a = Math.max(0, Math.min(1, (out.data[i] - 0.35) / 0.35));
      id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = Math.round(a * 255);
    }
    mx.putImageData(id, 0, 0);
    var full = document.createElement("canvas"); full.width = OW; full.height = OH;
    var fx = full.getContext("2d"); fx.filter = "blur(3px)"; fx.drawImage(mc, 0, 0, OW, OH); fx.filter = "none";
    return full;
  }

  /* ───────── 배경 불러오기 ───────── */
  function loadImg(src, cors) {
    return new Promise(function (res, rej) {
      var im = new Image(); if (cors) im.crossOrigin = "anonymous";
      im.onload = function () { res(im); }; im.onerror = rej; im.src = src;
      setTimeout(function () { rej(new Error("timeout")); }, 12000);
    });
  }
  function loadBackground(bg) {
    if (bg.src) return loadImg(bg.src).then(function (im) { return { img: im, credit: "배경: 키오스크 야경 그림" }; });
    return Wiki.place(bg.place).then(function (info) {
      var list = info && info.images || [];
      function tryAt(i) {
        if (i >= list.length) throw new Error("none");
        return loadImg(list[i].src, true).then(function (im) {
          var t = document.createElement("canvas"); t.width = t.height = 2; t.getContext("2d").drawImage(im, 0, 0, 2, 2); t.toDataURL(); // CORS 확인
          return { img: im, credit: list[i].credit };
        }).catch(function () { return tryAt(i + 1); });
      }
      return tryAt(0);
    }).catch(function () {
      return loadImg(["assets/bg-nightsea.jpg", "assets/bg-bridge.jpg", "assets/bg-starlight.jpg"][bg.place.no % 3]).then(function (im) { return { img: im, credit: "배경: 키오스크 야경 그림 (사진을 불러오지 못해 대체)", fallback: true }; });
    });
  }
  function cover(x, im, w, h, focusY) {
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;
    x.drawImage(im, (w - dw) / 2, (h - dh) * (focusY == null ? .5 : focusY), dw, dh);
  }

  /* ───────── 합성 ───────── */
  function generate() {
    if (busy || !st.photo) return;
    busy = true; st.generating = true; st.result = null; st.uploadUrl = null; drawGrid(); update();
    var rs = $("#pzResult"), bg = bgById(st.bg), mine = st;
    function prog(t, s) { if (mine === st) rs.innerHTML = '<div class="live-progress"><div class="k-spinner"></div><b>' + esc(t) + "</b><p>" + esc(s || "") + "</p><small>잠시만 기다려 주세요</small></div>"; }
    prog("배경을 준비하고 있어요", bg.name);
    var bgP = loadBackground(bg);
    var segP = (segmenter ? Promise.resolve(segmenter) : preloadSegmenter());
    Promise.all([bgP, segP]).then(function (r) {
      if (mine !== st) throw "abort";
      prog(segmenter ? "AI가 사람을 오려내고 있어요" : "사진을 배경과 합치고 있어요", segmenter ? "MediaPipe 인물 분리" : "AI 연결이 안 돼 기본 합성으로 만들어요");
      return sleep(60).then(function () { return compose(r[0]); });
    }).then(function (out) {
      if (mine !== st) return;
      st.result = out.canvas; st.mode = out.mode; busy = false; st.generating = false;
      drawGrid(); update(); reveal(".live-result"); B.speak(T("사진이 완성됐어요! 저장하거나 QR로 받아 가세요."));
    }).catch(function (e) {
      if (e === "abort") return;
      console.error(e); busy = false; if (st) { st.generating = false; drawGrid(); update(); }
      K.toast("합성 중 문제가 생겼어요. 다시 눌러주세요");
    });
  }
  function compose(bgr) {
    var out = document.createElement("canvas"); out.width = OW; out.height = OH;
    var x = out.getContext("2d"), mode;
    cover(x, bgr.img, OW, OH, .45);
    // 배경을 살짝 흐리게 → 인물이 또렷해 보이게
    var blur = document.createElement("canvas"); blur.width = OW; blur.height = OH;
    var bx = blur.getContext("2d"); bx.filter = "blur(2px) saturate(1.08)"; bx.drawImage(out, 0, 0); x.drawImage(blur, 0, 0);
    var person = document.createElement("canvas"); person.width = OW; person.height = OH;
    var px = person.getContext("2d");
    var mask = null;
    if (segmenter) { try { mask = personMask(st.photo); } catch (e) { console.warn("mask failed", e); } }
    if (mask) {
      px.drawImage(st.photo, 0, 0);
      px.globalCompositeOperation = "destination-in"; px.drawImage(mask, 0, 0); px.globalCompositeOperation = "source-over";
      // 바닥 그림자
      x.save(); x.globalAlpha = .35; x.filter = "blur(18px)"; x.drawImage(mask, 0, 14); x.restore();
      x.save(); x.globalCompositeOperation = "source-over";
      x.drawImage(person, 0, 0);
      // 배경 색감을 인물에 살짝 입히기
      x.globalCompositeOperation = "soft-light"; x.globalAlpha = .22; cover(x, bgr.img, OW, OH, .45);
      x.restore();
      mode = "AI 인물 분리 합성";
    } else {
      // 기본 합성: 사진 가장자리를 타원형으로 부드럽게
      px.save(); px.translate(OW * .1, OH * .16); px.scale(.8, .8); px.drawImage(st.photo, 0, 0); px.restore();
      // 세로로 긴 타원 마스크 (가장자리 부드럽게)
      var mk = document.createElement("canvas"); mk.width = OW; mk.height = OH;
      var mkx = mk.getContext("2d"), cy = OH * .56;
      mkx.translate(OW / 2, cy); mkx.scale(1, 1.32);
      var g = mkx.createRadialGradient(0, 0, OW * .22, 0, 0, OW * .36);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      mkx.fillStyle = g; mkx.fillRect(-OW, -OH, OW * 2, OH * 2);
      px.globalCompositeOperation = "destination-in"; px.drawImage(mk, 0, 0);
      x.drawImage(person, 0, 0);
      mode = "기본 합성 (AI 연결 안 됨)";
    }
    drawFrame(x, bgr);
    return { canvas: out, mode: T(mode) + " · " + credit(bgr.credit) };
  }
  function drawFrame(x, bgr) {
    var art = $(".kiosk-artwork");
    // 위: 키오스크 포스터의 제목 부분을 그대로 띠로 사용
    var th = 236;
    try {
      var band = document.createElement("canvas"); band.width = OW; band.height = th;
      var bx = band.getContext("2d");
      bx.drawImage(art, 0, 0, art.naturalWidth, art.naturalHeight * 0.132, 0, 0, OW, th);
      var fade = bx.createLinearGradient(0, th - 70, 0, th); fade.addColorStop(0, "rgba(0,0,0,1)"); fade.addColorStop(1, "rgba(0,0,0,0)");
      bx.globalCompositeOperation = "destination-in"; bx.fillStyle = fade; bx.fillRect(0, 0, OW, th);
      x.drawImage(band, 0, 0);
    } catch (e) { console.warn(e); }
    // 아래: 장소 이름 띠
    var bh = 150, by = OH - bh;
    var g = x.createLinearGradient(0, by - 60, 0, OH); g.addColorStop(0, "rgba(6,27,57,0)"); g.addColorStop(.4, "rgba(6,27,57,.78)"); g.addColorStop(1, "rgba(6,27,57,.95)");
    x.fillStyle = g; x.fillRect(0, by - 60, OW, bh + 60);
    var bg = bgById(st.bg), d = new Date();
    x.textAlign = "left"; x.textBaseline = "alphabetic";
    x.fillStyle = "#5fe3ff"; x.font = "900 54px 'Noto Sans KR', Arial, sans-serif";
    x.fillText((bg.place ? bg.place.no + ". " : "") + bg.name, 44, OH - 70);
    x.fillStyle = "#ffffff"; x.font = "700 26px 'Noto Sans KR', Arial, sans-serif";
    x.fillText(T("여수 AI 포토존") + " · " + d.getFullYear() + "." + (d.getMonth() + 1) + "." + d.getDate(), 46, OH - 30);
    x.textAlign = "right"; x.font = "600 16px Arial, sans-serif"; x.fillStyle = "rgba(255,255,255,.7)";
    x.fillText(credit(String(bgr.credit).replace(/^배경: |^사진: /, "")).slice(0, 70), OW - 30, OH - 30);
    // 테두리
    x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 10; x.strokeRect(5, 5, OW - 10, OH - 10);
  }

  /* ───────── 저장 · QR · 출력 ───────── */
  function resultUrl() { return st.result.toDataURL("image/jpeg", .92); }
  function stamp() { var d = new Date(), p = function (n) { return ("0" + n).slice(-2); }; return "yeosu_" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()); }
  function qr() {
    var cfg = C.photo.upload;
    if (!cfg || !cfg.url) return K.toast("QR 받기 서버가 설정되지 않았어요. 저장하기나 출력을 이용해 주세요", 3600);
    if (st.uploadUrl) return showQR(st.uploadUrl);
    var body = K.modal("QR로 휴대폰에 받기", "<h2>" + T("사진을 휴대폰으로 보낼까요?") + "</h2><p>" + T("QR을 만들려면 사진을 <b>임시 저장 서버</b>에 올려야 해요. 내려받기 주소는 일정 시간이 지나면 만료되고, 주소를 아는 사람만 볼 수 있어요.") + "</p>" +
      '<div class="k-actions"><button data-a="no">취소</button><button class="k-primary" data-a="yes">동의하고 QR 만들기</button></div>');
    body.addEventListener("click", function (e) {
      var a = e.target.closest("[data-a]"); if (!a) return;
      if (a.getAttribute("data-a") === "no") return K.closeModal();
      body.innerHTML = '<div class="k-dispatch"><div class="k-spinner"></div><h2>사진을 올리고 있어요</h2><p class="k-sub">잠시만 기다려 주세요</p></div>';
      var mine = st;
      B.uploadImage(st.result.toDataURL("image/jpeg", .88), cfg).then(function (url) {
        if (mine !== st) return; st.uploadUrl = url; showQR(url);
      }).catch(function (err) {
        console.warn("upload", err);
        if (!body.isConnected) return;
        body.innerHTML = "<h2>QR을 만들지 못했어요</h2><p>인터넷 연결이나 업로드 서버를 확인해 주세요. 대신 기기에 저장하거나 출력할 수 있어요.</p>" +
          '<div class="k-actions"><button data-a2="save">기기에 저장하기</button>' + (C.photo.printEnabled ? '<button data-a2="print">사진 출력하기</button>' : "") + '<button class="k-primary" data-a2="retry">다시 시도</button></div>';
        body.addEventListener("click", function (e2) {
          var b = e2.target.closest("[data-a2]"); if (!b) return; b = b.getAttribute("data-a2");
          if (b === "save") K.toast(B.saveImage(resultUrl(), stamp()));
          if (b === "print") K.toast(B.printImage(resultUrl()));
          if (b === "retry") qr();
        });
      });
    });
  }
  function showQR(url) {
    K.modal("QR로 휴대폰에 받기", '<h2 class="k-center">휴대폰 카메라로 찍어주세요</h2>' + K.qrBlock(url, "사진 내려받기", "QR을 찍으면 합성 사진이 열려요. 길게 눌러 저장하세요. 주소는 일정 시간 뒤 만료돼요.", true) +
      '<div class="k-actions"><button data-a="print">사진 출력하기</button><button class="k-primary" data-a="ok">확인</button></div>');
    $("#modalBody").addEventListener("click", function (e) {
      var a = e.target.closest("[data-a]"); if (!a) return;
      if (a.getAttribute("data-a") === "print") K.toast(B.printImage(resultUrl())); else K.closeModal();
    });
    B.speak(T("휴대폰 카메라로 QR을 찍어주세요."));
  }

  window.Photozone = {
    busy: function () { return busy; },
    aiStatus: function () { return segState; }
  };
})();

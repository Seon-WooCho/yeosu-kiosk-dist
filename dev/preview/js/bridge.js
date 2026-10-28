/*
 * 웹 ↔ 안드로이드 앱 연결부.
 * 앱 안에서는 window.AndroidKiosk(자바)를, 일반 브라우저에서는 웹 표준 기능을 씁니다.
 */
(function () {
  "use strict";
  var N = window.AndroidKiosk || null;
  var voiceCb = null, uploads = {}, seq = 0, voiceOn = true, last = "", lang = "ko-KR";
  function tr(s) { return window.T ? window.T(s) : s; }

  function onVoice(type, text) {
    var c = voiceCb; if (!c) return;
    if (type === "partial") { c.onPartial && c.onPartial(text); return; }
    voiceCb = null;
    if (type === "result") c.onResult && c.onResult(text);
    else if (type === "error") c.onError && c.onError(tr(text));
    c.onEnd && c.onEnd();
  }

  var webRec = null;
  function webListen(c) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { voiceCb = null; c.onError && c.onError("이 기기에서는 음성인식을 쓸 수 없어요. 글자로 입력해 주세요."); c.onEnd && c.onEnd(); return; }
    var done = false;
    webRec = new SR(); webRec.lang = lang; webRec.interimResults = true; webRec.maxAlternatives = 1;
    webRec.onresult = function (ev) {
      var r = ev.results[ev.results.length - 1];
      if (r.isFinal) { done = true; onVoice("result", r[0].transcript); } else onVoice("partial", r[0].transcript);
    };
    webRec.onerror = function (ev) {
      if (done) return; done = true;
      onVoice("error", ({ "no-speech": "말소리가 들리지 않았어요. 다시 눌러 말씀해 주세요.", "not-allowed": "마이크 사용이 허용되지 않았어요.", "network": "음성인식에 인터넷 연결이 필요해요." })[ev.error] || "음성인식 중 문제가 생겼어요.");
    };
    webRec.onend = function () { webRec = null; if (!done) { done = true; onVoice("end", ""); } };
    try { webRec.start(); } catch (e) { done = true; onVoice("error", "음성인식을 시작하지 못했어요."); }
  }

  function b64(dataUrl) { return String(dataUrl).replace(/^data:[^,]+,/, ""); }
  function dataUrlToBlob(u) {
    var p = u.split(","), mime = (p[0].match(/:(.*?);/) || [])[1] || "image/jpeg", bin = atob(p[1]), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: mime });
  }
  function parseUpload(type, text) {
    var j = JSON.parse(text);
    if (type === "tmpfiles") {
      var u = j && j.data && j.data.url; if (!u) throw new Error("no url");
      return u.replace("://tmpfiles.org/", "://tmpfiles.org/dl/").replace(/^http:/, "https:");
    }
    if (!j.url) throw new Error("no url");
    return j.url;
  }

  window.KioskBridge = {
    isNative: !!N,
    _voice: onVoice,
    _upload: function (id, ok, payload) {
      var c = uploads[id]; delete uploads[id]; if (!c) return;
      if (!ok) return c.reject(new Error(payload || "upload failed"));
      try { c.resolve(parseUpload(c.type, payload)); } catch (e) { c.reject(e); }
    },

    listen: function (c) {
      voiceCb = c;
      if (N && N.startListening) { try { N.startListening(); } catch (e) { onVoice("error", "음성인식을 시작하지 못했어요."); } }
      else webListen(c);
    },
    stopListening: function () {
      if (N && N.stopListening) N.stopListening();
      else if (webRec) { try { webRec.abort(); } catch (e) {} }
      if (voiceCb) onVoice("end", "");
    },

    // 음성 안내 켜기/끄기 (화면의 '음성 안내 켜짐 / 음소거')
    setVoice: function (on) { voiceOn = !!on; if (!voiceOn) this.stopSpeaking(); },
    // 언어 바꾸기 (음성 안내 · 음성인식)
    setLang: function (tag) { lang = tag || "ko-KR"; last = ""; this.stopSpeaking(); if (N && N.setLanguage) { try { N.setLanguage(lang); } catch (e) {} } },
    lang: function () { return lang; },
    voiceOn: function () { return voiceOn; },
    lastSpoken: function () { return last; },

    speak: function (text) {
      if (text) last = text;
      if (!voiceOn) return;
      if (N && N.speak) { N.speak(text); return; }
      if (!window.speechSynthesis) return;
      try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = 1.05; speechSynthesis.speak(u); } catch (e) {}
    },
    stopSpeaking: function () {
      if (N && N.stopSpeaking) N.stopSpeaking();
      else if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) {} }
    },

    saveImage: function (dataUrl, name) {
      if (N && N.saveImage) return N.saveImage(b64(dataUrl), name || "");
      var a = document.createElement("a"); a.href = dataUrl; a.download = (name || "yeosu-photo") + ".jpg";
      document.body.appendChild(a); a.click(); a.remove();
      return "사진을 내려받았어요.";
    },

    printImage: function (dataUrl) {
      if (N && N.printImage) { N.printImage(b64(dataUrl)); return "프린터로 보내는 중이에요."; }
      var f = document.createElement("iframe"); f.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
      document.body.appendChild(f);
      var d = f.contentWindow.document;
      d.open(); d.write('<html><head><style>@page{margin:8mm}body{margin:0}img{width:100%}</style></head><body><img src="' + dataUrl + '"></body></html>'); d.close();
      setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { f.remove(); }, 2000); }, 400);
      return "인쇄 창을 열었어요.";
    },

    /* 사진 업로드 → 다운로드 주소(Promise). 앱에서는 네이티브로 올려 브라우저 제약을 피합니다. */
    uploadImage: function (dataUrl, cfg) {
      return new Promise(function (resolve, reject) {
        var name = "yeosu_photo_" + Date.now() + ".jpg";
        if (N && N.uploadImage) {
          var id = "u" + (++seq); uploads[id] = { resolve: resolve, reject: reject, type: cfg.type };
          N.uploadImage(id, b64(dataUrl), cfg.url, name);
          setTimeout(function () { if (uploads[id]) { delete uploads[id]; reject(new Error("timeout")); } }, 30000);
          return;
        }
        var fd = new FormData(); fd.append("file", dataUrlToBlob(dataUrl), name);
        var ctl = window.AbortController ? new AbortController() : null;
        var t = setTimeout(function () { ctl && ctl.abort(); }, 30000);
        fetch(cfg.url, { method: "POST", body: fd, signal: ctl && ctl.signal })
          .then(function (r) { return r.text(); })
          .then(function (txt) { clearTimeout(t); resolve(parseUpload(cfg.type, txt)); })
          .catch(function (e) { clearTimeout(t); reject(e); });
      });
    },

    exitKiosk: function () { if (N && N.exitKiosk) N.exitKiosk(); else window.Kiosk && Kiosk.toast("브라우저에서는 종료 기능이 없어요."); },
    reload: function () { if (N && N.reload) N.reload(); else location.reload(); },
    info: function () {
      if (N && N.getInfo) { try { return JSON.parse(N.getInfo()); } catch (e) {} }
      return { platform: "browser" };
    }
  };

  /* 원격 업데이트 상태 (앱 안에서만 동작. 자바 Updater 가 _status 로 알려줌) */
  var upd = {}, updFns = [];
  window.KioskUpdate = {
    available: !!(N && N.updateStatus),
    status: function () {
      if (N && N.updateStatus) { try { upd = JSON.parse(N.updateStatus()); } catch (e) {} }
      return upd;
    },
    check: function () { if (N && N.checkUpdate) N.checkUpdate(); },
    reset: function () { if (N && N.resetWebUpdate) N.resetWebUpdate(); },
    on: function (fn) { updFns.push(fn); return function () { updFns = updFns.filter(function (f) { return f !== fn; }); }; },
    _status: function (json) {
      try { upd = JSON.parse(json); } catch (e) { return; }
      updFns.forEach(function (f) { try { f(upd); } catch (e) {} });
    }
  };
})();

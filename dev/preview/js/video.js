/*
 * 관광지 소개 영상 (유튜브)
 * ─────────────────────────────────────────────
 * 재생 순서
 *  1) 관리자 화면에서 지정한 영상 (기기에 저장)
 *  2) js/data-yeosu.js 의 관광지별 후보 영상 → 공식 채널 영상인지 확인 후 재생
 *  3) 여수 홍보 공통 영상
 *  4) 그래도 없으면 여수시 공식 유튜브 채널(힐링여수야)의 업로드 영상 목록
 * 영상이 삭제되었거나 퍼가기가 막힌 경우 자동으로 다음 영상으로 넘어갑니다.
 * 인터넷이 없으면 사진(지도/위키미디어)으로 대신 보여줍니다.
 */
(function () {
  "use strict";
  var C = window.KIOSK_CONFIG, D = window.KIOSK_DATA;
  var V = C.video || {};
  var CHECK_TTL = 7 * 24 * 3600 * 1000;

  /* 유튜브 주소 → 영상 ID */
  function parseId(s) {
    s = String(s || "").trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    var m = /(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/.exec(s);
    return m ? m[1] : null;
  }

  /* 관리자 지정 영상 (기기에 저장) */
  function getOverride(no) { try { return localStorage.getItem("kiosk:video:" + no) || null; } catch (e) { return null; } }
  function setOverride(no, id) { try { if (id) localStorage.setItem("kiosk:video:" + no, id); else localStorage.removeItem("kiosk:video:" + no); } catch (e) {} }

  /* 공식 채널 영상인지 확인 (noembed.com 사용, 결과는 7일간 기억) */
  var checking = {};
  function check(id) {
    var confirmed = (D.videoConfirmed || {})[id];
    if (confirmed) return Promise.resolve({ ok: true, title: confirmed.title, author: confirmed.author });
    try {
      var c = JSON.parse(localStorage.getItem("kiosk:vchk:" + id));
      if (c && Date.now() - c.t < CHECK_TTL) return Promise.resolve(c.r);
    } catch (e) {}
    if (checking[id]) return checking[id];
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { ctl && ctl.abort(); }, 6000);
    checking[id] = fetch("https://noembed.com/embed?url=" + encodeURIComponent("https://www.youtube.com/watch?v=" + id), { signal: ctl && ctl.signal })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        clearTimeout(timer);
        var r;
        if (!j || j.error) r = { ok: false, reason: "없는 영상" };
        else {
          var allowed = (V.allowedChannels || []).some(function (a) { return String(j.author_name || "").indexOf(a) >= 0; });
          r = { ok: allowed, title: j.title, author: j.author_name, reason: allowed ? "" : "공식 채널 아님" };
        }
        try { localStorage.setItem("kiosk:vchk:" + id, JSON.stringify({ t: Date.now(), r: r })); } catch (e) {}
        return r;
      })
      .catch(function () { clearTimeout(timer); return { ok: !!V.playUnverified, unknown: true, reason: "확인 불가" }; });
    return checking[id];
  }

  /* 유튜브 플레이어 API 불러오기 */
  var apiP = null;
  function loadApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (apiP) return apiP;
    apiP = new Promise(function (resolve, reject) {
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (prev) try { prev(); } catch (e) {} resolve(window.YT); };
      var s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api"; s.async = true;
      s.onerror = function () { apiP = null; reject(new Error("api")); };
      document.head.appendChild(s);
      setTimeout(function () { if (!(window.YT && window.YT.Player)) { apiP = null; reject(new Error("timeout")); } }, 12000);
    });
    return apiP;
  }

  function candidates(place) {
    var list = [], ov = getOverride(place.no);
    if (ov) list.push({ id: ov, admin: true });
    (place.videos || []).forEach(function (id) { list.push({ id: id }); });
    (D.promoVideos || []).forEach(function (id) { list.push({ id: id, promo: true }); });
    var seen = {};
    return list.filter(function (c) { if (seen[c.id]) return false; seen[c.id] = 1; return true; });
  }

  /*
   * mount(box, place, ui) — box 안에 영상을 띄움.
   * ui: { onState(text), onPlaying(), onFail(reason) }
   * 반환: { destroy(), unmute(), mute(), isMuted() }
   */
  function mount(box, place, ui) {
    ui = ui || {};
    var alive = true, player = null, list = candidates(place), idx = -1, keepT = null, muted = V.startMuted !== false, triedChannel = false, playing = false;
    var holder = document.createElement("div"); holder.className = "k-yt"; box.appendChild(holder);
    var mountEl = document.createElement("div"); holder.appendChild(mountEl);

    function state(t) { if (alive && ui.onState) ui.onState(t); }
    function fail(reason) { if (!alive) return; holder.remove(); if (ui.onFail) ui.onFail(reason); }

    function vars(extra) {
      var v = { autoplay: 1, mute: muted ? 1 : 0, playsinline: 1, rel: 0, modestbranding: 1, fs: 0, controls: 1, iv_load_policy: 3, disablekb: 1, cc_load_policy: 0, hl: "ko", origin: location.origin };
      // 외국어 화면이면 그 언어 자막(있을 때)과 플레이어 글자
      var lg = window.I18N ? I18N.lang : "ko";
      if (lg !== "ko") { v.hl = lg === "zh" ? "zh-CN" : lg; v.cc_lang_pref = v.hl; v.cc_load_policy = 1; }
      for (var k in extra) v[k] = extra[k];
      return v;
    }
    function create(opts) {
      if (player) { try { player.destroy(); } catch (e) {} player = null; mountEl = document.createElement("div"); holder.innerHTML = ""; holder.appendChild(mountEl); }
      player = new YT.Player(mountEl, {
        width: "100%", height: "100%", host: "https://www.youtube-nocookie.com",
        videoId: opts.videoId, playerVars: vars(opts.vars || {}),
        events: {
          onReady: function (e) { if (!alive) return; try { if (muted) e.target.mute(); e.target.playVideo(); } catch (x) {} },
          onStateChange: function (e) {
            if (!alive) return;
            if (e.data === 1) { // 재생 중
              if (!playing) { playing = true; ui.onPlaying && ui.onPlaying(); }
              holder.classList.add("on");
            }
            if (e.data === 0 && !opts.vars) { try { e.target.seekTo(0); e.target.playVideo(); } catch (x) {} } // 반복 재생
          },
          onError: function () { if (alive) next(); }
        }
      });
    }
    function playChannel() {
      if (triedChannel || !V.channelUploads) return fail(T("재생할 수 있는 영상이 없어요"));
      triedChannel = true;
      state(T("{0} 영상", V.channelName ? T(V.channelName) : T("여수시 공식 채널")));
      create({ videoId: undefined, vars: { listType: "playlist", list: V.channelUploads, loop: 1 } });
    }
    function next() {
      if (!alive) return;
      idx++;
      if (idx >= list.length) return playChannel();
      var c = list[idx];
      var go = function (info) {
        if (!alive) return;
        if (!c.admin && !info.ok) { return next(); }
        var who = c.admin ? T("관리자 지정 영상") : (info.author || "") + (c.promo ? " · " + T("여수 홍보 영상") : "");
        state((info.title ? info.title + " · " : "") + who);
        create({ videoId: c.id });
      };
      if (c.admin) go({ ok: true }); else check(c.id).then(go);
    }

    loadApi().then(function () { if (alive) next(); }).catch(function () { fail(T("인터넷 연결이 없어 사진으로 보여드려요")); });

    // 재생 중에는 자동 메인 복귀가 되지 않도록
    keepT = setInterval(function () {
      if (!alive) return clearInterval(keepT);
      try { if (player && player.getPlayerState && player.getPlayerState() === 1) window.Kiosk.activity(); } catch (e) {}
    }, 15000);

    return {
      destroy: function () { alive = false; clearInterval(keepT); try { player && player.destroy(); } catch (e) {} holder.remove(); },
      unmute: function () { muted = false; try { player.unMute(); player.setVolume(80); player.playVideo(); } catch (e) {} },
      mute: function () { muted = true; try { player.mute(); } catch (e) {} },
      isMuted: function () { return muted; },
      isPlaying: function () { return playing; }
    };
  }

  window.PlaceVideo = { mount: mount, parseId: parseId, getOverride: getOverride, setOverride: setOverride, check: check, candidates: candidates };
})();

/*
 * 화면 v3 — 시안 '인터페이스대지 8' (2026-10-28)
 *  - 메인: 축제·행사 영상 위아래 2칸 동시 재생 (설정 '동시 재생' Y, 2026-11-13 요청). 끝나면 그 칸만 다음 영상, 눌러도 반응 없음
 *  - 가이드 카드 왼쪽 버튼: 메인 '여행지도' → 10경 지도 / 지도·상세 '축제홍보' → 메인
 *  - 10경 지도: 왼쪽 목록 또는 지도 이름표 → 상세 (영상 먼저 · 아래 조작 바에서 지도 ↔ 영상 전환, 되돌리기 = 지도로)
 *  - 화면이 바뀌면 하던 음성 안내는 멈춤
 *  - 하단 AI 여행 가이드: 눌러서 말하기 / 글자로 질문 → 시트 '질문사전'으로 답변 + 음성 안내
 *  - 맨 아래: 처음 화면, 4개국어, 여수시 로고 5번 → 관리자(PIN)
 *  - 아무도 안 쓰면 '설정'의 시간(기본 90초) 뒤 처음 화면 + 한국어
 */
(function () {
  "use strict";
  var C = window.KIOSK_CONFIG || {}, B = window.KioskBridge, K = window.KioskData;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ── 화면 맞춤: 1080×1920 무대를 화면에 맞게 ── */
  function fit() {
    var s = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
    $("#stage").style.transform = "scale(" + s + ")";
  }
  window.addEventListener("resize", fit); fit();

  /* ── 언어 ── */
  var LANG_TAG = { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN" };
  var UI = {
    leftMap: ["여행지도", "Travel map", "旅行マップ", "旅游地图"],
    leftFest: ["축제홍보", "Festivals", "お祭り", "节庆活动"],
    "view.map": ["지도", "Map", "地図", "地图"],
    "view.video": ["영상", "Video", "映像", "视频"],
    "btn.ask": ["", "Ask me anything", "何でも聞いてください", "请随便提问"],
    watch: ["▶ 영상 보기", "▶ Watch video", "▶ 映像を見る", "▶ 观看视频"],
    soundOn: ["🔊 소리 켜기", "🔊 Sound on", "🔊 音を出す", "🔊 打开声音"],
    soundOff: ["🔇 소리 끄기", "🔇 Sound off", "🔇 消音", "🔇 关闭声音"],
    prev: ["◀ 이전", "◀ Prev", "◀ 前へ", "◀ 上一个"],
    next: ["다음 ▶", "Next ▶", "次へ ▶", "下一个 ▶"],
    toMap: ["🗺 지도로", "🗺 Map", "🗺 地図へ", "🗺 返回地图"],
    address: ["주소", "Address", "住所", "地址"],
    tel: ["전화", "Phone", "電話", "电话"],
    hours: ["운영시간", "Hours", "営業時間", "开放时间"],
    fee: ["요금", "Fee", "料金", "费用"],
    transit: ["가는 법", "Getting there", "アクセス", "交通"],
    listening: ["듣고 있어요… 말씀해 주세요", "Listening… please speak", "聞いています…どうぞ", "正在聆听…请说话"],
    stop: ["그만 듣기", "Stop", "停止", "停止"],
    ask: ["질문하기", "Ask", "質問する", "提问"],
    typeTitle: ["글자로 질문", "Type a question", "文字で質問", "文字提问"],
    typePh: ["예: 오동도 가는 법", "e.g. How to get to Odongdo", "例: 梧桐島への行き方", "例如: 梧桐岛怎么去"],
    examples: [["오동도 가는 법", "야경 명소 추천해 줘", "아이랑 갈 만한 곳", "요즘 무슨 축제 해요?", "여수 뭐가 맛있어요?", "하루 코스 짜 줘"],
      ["How to get to Odongdo", "Night view spots", "Places for kids", "Any festivals now?", "What food is famous?", "One-day itinerary"],
      ["梧桐島への行き方", "夜景のおすすめ", "子連れで行ける所", "今どんなお祭り?", "麗水のグルメは?", "1日コース"],
      ["梧桐岛怎么去", "推荐夜景", "适合带孩子的地方", "最近有什么节庆?", "有什么美食?", "一日游行程"]],
    noInfo: ["{이름}의 이 정보는 아직 준비 중이에요. 관광통역안내 1330으로 문의해 주세요.", "This information for {이름} isn't ready yet. Please call the tourist hotline 1330.", "{이름}のこの情報は準備中です。観光案内1330にお問い合わせください。", "{이름}的该信息正在准备中，请拨打旅游咨询电话1330。"],
    noFestival: ["지금 안내 중인 축제가 없어요.", "No festivals are listed right now.", "現在ご案内中のお祭りはありません。", "目前没有正在介绍的节庆。"],
    whichPlace: ["어느 관광지가 궁금하세요? 지도에서 골라 주세요.", "Which place would you like to know about? Choose one on the map.", "どの観光地について知りたいですか？地図から選んでください。", "您想了解哪个景点？请在地图上选择。"],
    "msg.notUnderstood": ["잘 못 들었어요. 이렇게 물어보세요.", "Sorry, I didn't catch that. Try asking like this.", "よく聞き取れませんでした。このように聞いてみてください。", "没听清楚，请这样问。"],
    noData: ["안내 자료를 불러오지 못했어요.", "Couldn't load the guide data.", "案内データを読み込めませんでした。", "无法加载导览数据。"],
    noMedia: ["표시할 영상이 없어요.", "No videos to show.", "表示する映像がありません。", "没有可显示的视频。"],
    noVideo: ["영상 준비 중", "Video coming soon", "映像準備中", "视频准备中"],
    "guide.hello": ["안녕하세요! 여수 여행을 도와드릴게요.", "Hello! I'll help you explore Yeosu.", "こんにちは!麗水旅行をお手伝いします。", "您好！我来帮您畅游丽水。"],
    "guide.hint1": ["지도에서 궁금한 관광지를 선택해 주세요.", "Choose a place on the map to learn more.", "地図で気になる観光地を選んでください。", "请在地图上选择想了解的景点。"],
    "guide.hint2": ["버튼을 누르거나 말로 질문해도 좋아요!", "Tap a button or just ask out loud!", "ボタンを押しても、話しかけてもOKです!", "可以点按钮，也可以直接说话提问！"]
  };
  var LI = { ko: 0, en: 1, ja: 2, zh: 3 };
  var lang = "ko";
  /* 문구: 시트 '화면문구'가 우선, 없으면 위 기본값 */
  function ui(id) {
    var s = K.text && K.text(id, lang);
    if (s) return s;
    var v = UI[id];
    return v ? (v[LI[lang]] || v[0]) : "";
  }
  function tr(obj) { return obj ? (obj[lang] || obj.ko || "") : ""; }

  function applyLang() {
    $("#stage").classList.toggle("foreign", lang !== "ko");
    $$("[data-t]").forEach(function (el) { el.textContent = lang === "ko" && el.classList.contains("lbl") ? "" : ui(el.getAttribute("data-t")); });
    $$(".hot.lang").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-lang") === lang); });
    document.documentElement.lang = lang;
    renderSound(); renderChrome(); renderPins(); captions(); if (detailNo) openDetail(detailNo, true);
    greet(false);
  }
  function setLang(l) {
    if (!LANG_TAG[l] || l === lang) return;
    lang = l; B.setLang(LANG_TAG[l]); applyLang();
  }

  /* ── 말풍선 ── */
  function bubble(title, lines) {
    var el = $("#bubble");
    el.innerHTML = (title ? "<b>" + esc(title) + "</b>" : "") + (lines || []).map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("");
    el.classList.toggle("long", (title + (lines || []).join("")).length > 70);
  }
  function greet(talk) {
    bubble(ui("guide.hello"), [ui("guide.hint1"), ui("guide.hint2")]);
    if (talk) speak(ui("guide.hello") + " " + ui("guide.hint1"));
  }
  function say(text) {
    var parts = String(text).split(/(?<=[.!?。！？])\s+/);
    bubble(parts.length > 1 ? parts[0] : "", parts.length > 1 ? [parts.slice(1).join(" ")] : [text]);
    speak(text);
  }
  /* 음성 안내가 우선: 10경 상세에서는 안내하는 동안 영상 소리를 끄고, 안내가 끝나면 켬
     (중간에 화면이 바뀌거나 다른 안내로 바뀌면 그대로 둠) */
  function speak(text) {
    if (current !== "detail") return B.speak(text);
    var no = detailNo;
    videoSound(false);
    B.speak(text, function (how) {
      if (how !== "stop" && current === "detail" && detailNo === no && !dUserMute) videoSound(true);
    });
  }

  var toastT;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  /* ── 소리 (영상) ── */
  var muted = !(C.video && C.video.startMuted === false);
  // 메인 위·아래 칸 소리는 칸마다 따로 (처음엔 둘 다 끔)
  var slotMuted = [muted, muted];
  // 가이드 카드 왼쪽 버튼: 메인 '여행지도', 지도·상세 '축제홍보' (시안대로 그림을 바꿔 끼움)
  function renderChrome() {
    var home = current === "home";
    var src = "assets/v3/guide-" + (home ? "main" : "sub") + ".jpg";
    if ($("#guideImg").getAttribute("src") !== src) $("#guideImg").setAttribute("src", src);
    $("#leftLbl").textContent = lang === "ko" ? "" : ui(home ? "leftMap" : "leftFest");
    $("#leftBtn").setAttribute("aria-label", ui(home ? "leftMap" : "leftFest"));
  }
  function renderSound() {
    $$(".slot .snd").forEach(function (b) { var i = +b.getAttribute("data-snd"); b.textContent = slotMuted[i] ? ui("soundOn") : ui("soundOff"); });
    $("#dSound").textContent = dMuted ? ui("soundOn") : ui("soundOff");
    $("#dSound").hidden = view !== "video" || !detailPlayer;
  }
  /* 메인 칸 소리 켜기/끄기: 그 칸 영상만 (10경 영상 소리는 videoSound) */
  function toggleSlotSound(i) {
    slotMuted[i] = !slotMuted[i]; renderSound();
    var p = together() ? homePlayers[i] : (i === slot ? homePlayer : null);
    try { if (p && p.mute) slotMuted[i] ? p.mute() : (p.unMute(), p.setVolume(100)); } catch (e) {}
  }

  /* ── 유튜브 ── */
  var ytP = null;
  function yt() {
    if (ytP) return ytP;
    ytP = new Promise(function (resolve, reject) {
      if (window.YT && YT.Player) return resolve(YT);
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (prev) try { prev(); } catch (e) {} resolve(YT); };
      var s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; s.onerror = function () { ytP = null; reject(new Error("youtube")); };
      document.head.appendChild(s);
    });
    return ytP;
  }
  function makePlayer(host, id, onEnd, onFail, opt) {
    opt = opt || {};
    // 소리 끔 여부: 값 또는 함수(준비가 끝난 순간의 상태를 씀)
    var isQuiet = function () { return typeof opt.muted === "function" ? opt.muted() : opt.muted != null ? opt.muted : muted; };
    var quiet = isQuiet();
    host.innerHTML = "<div></div>";
    var player = null, dead = false;
    yt().then(function (Y) {
      if (dead) return;
      player = new Y.Player(host.firstChild, {
        videoId: id, width: "100%", height: "100%",
        playerVars: { autoplay: 1, mute: quiet ? 1 : 0, start: opt.start || 0, controls: 0, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, origin: location.origin },
        events: {
          onReady: function (e) { try { isQuiet() ? e.target.mute() : e.target.unMute(); e.target.playVideo(); } catch (x) {} },
          onStateChange: function (e) { if (e.data === 0) onEnd && onEnd(); },
          onError: function (e) { onFail && onFail(e && e.data); }
        }
      });
      handle.p = player;
    }).catch(function () { onFail && onFail(); });
    var handle = {
      p: null,
      mute: function () { this.p && this.p.mute(); }, unMute: function () { this.p && this.p.unMute(); }, setVolume: function (v) { this.p && this.p.setVolume(v); },
      playing: function () { try { return this.p && this.p.getPlayerState() === 1; } catch (e) { return false; } },
      destroy: function () { dead = true; try { player && player.destroy(); } catch (e) {} host.innerHTML = ""; }
    };
    return handle;
  }
  function ytReason(code) {
    if (code === 101 || code === 150) return "유튜브에서 다른 사이트 재생을 막아 둔 영상이에요 (" + code + ")";
    if (code === 100) return "삭제됐거나 비공개 영상이에요 (100)";
    if (code === 2) return "영상 주소가 잘못됐어요 (2)";
    if (code == null) return "유튜브에 연결하지 못했어요 (인터넷 확인)";
    return "재생 오류 (" + code + ")";
  }
  function mediaSrc(m) { return m ? (m.src || m.url) : ""; }

  /* ── 축제·행사: 위아래 2칸 교차 재생 ── */
  var step = 0, slot = 0, homePlayer = null, imgTimer = null, pairNow = [];
  var homePlayers = [null, null], slotTimers = [null, null], slotIdx = [0, 1];
  function together() { var st = K.data && K.data.settings; return !st || st.playTogether !== false; }
  function stopSlot(i) {
    clearTimeout(slotTimers[i]); slotTimers[i] = null;
    if (homePlayers[i]) { homePlayers[i].destroy(); homePlayers[i] = null; }
  }
  function stopHome() {
    clearTimeout(imgTimer); imgTimer = null;
    if (homePlayer) { homePlayer.destroy(); homePlayer = null; }
    stopSlot(0); stopSlot(1);
  }
  function captions() {
    $$(".slot").forEach(function (el, i) { $(".slot-cap", el).textContent = pairNow[i] ? tr(pairNow[i].title) : ""; el.classList.toggle("has-poster", !!(pairNow[i] && pairNow[i].poster && pairNow[i].poster.kind !== "url")); });
  }
  function poster(el, item) {
    var media = $(".slot-media", el);
    var src = item && (item.poster ? mediaSrc(item.poster) : item.type === "image" ? mediaSrc(item.media) : "");
    media.innerHTML = src ? '<img src="' + esc(src) + '" alt="">' : "";
  }
  /* 동시 재생: 위아래 칸이 각자 재생, 끝나면 그 칸만 다음 영상 (2개 이하면 자기 영상 반복) */
  function renderTogether(list) {
    var n = list.length, per = Math.min(2, n);
    pairNow = [];
    for (var i = 0; i < per; i++) { slotIdx[i] = slotIdx[i] % n; pairNow.push(list[slotIdx[i]]); }
    $$(".slot").forEach(function (el, i) { el.hidden = !pairNow[i]; el.classList.add("playing"); poster(el, pairNow[i]); });
    captions();
    if (current !== "home") return;
    pairNow.forEach(function (item, i) { playSlot(i, item); });
  }
  function playSlot(i, item) {
    stopSlot(i);
    var el = $$(".slot")[i], media = $(".slot-media", el);
    var next = function () { nextSlot(i); };
    if (item.type === "image" || !item.media || item.media.kind !== "youtube") {
      media.innerHTML = item.media ? '<img src="' + esc(mediaSrc(item.media)) + '" alt="">' : "";
      slotTimers[i] = setTimeout(next, (item.imageSeconds || 10) * 1000);
      return;
    }
    homePlayers[i] = makePlayer(media, item.media.id, next, function (code) {
      // 재생 못 함: 화면에 이유를 보여 주고 30초 뒤 다시 시도 (101·150 = 유튜브에서 다른 사이트 재생을 막아 둔 영상)
      media.innerHTML = '<div class="ytfail">' + esc(tr(item.title)) + "<br><small>" + esc(ytReason(code)) + "</small></div>";
      slotTimers[i] = setTimeout(next, 30000);
    },
      { muted: function () { return slotMuted[i]; }, start: item.media.start });
  }
  function nextSlot(i) {
    if (current !== "home") return;
    var list = K.activeMainMedia(), n = list.length; if (!n) return;
    if (n > 2) {   // 다른 칸에 나오지 않는 다음 영상
      var other = slotIdx[1 - i], k = Math.max(slotIdx[0], slotIdx[1]) + 1;
      while (k % n === other % n) k++;
      slotIdx[i] = k % n;
    }
    pairNow[i] = list[slotIdx[i] % n];
    poster($$(".slot")[i], pairNow[i]); captions();
    playSlot(i, pairNow[i]);
  }
  function renderHome() {
    stopHome();
    var list = K.data ? K.activeMainMedia() : [];
    $("#homeEmpty").hidden = !!list.length;
    $("#homeEmpty").textContent = K.data ? ui("noMedia") : ui("noData");
    if (list.length && together()) return renderTogether(list);
    pairNow = list.length ? K.pairAt(step) : [];
    $$(".slot").forEach(function (el, i) {
      el.hidden = !pairNow[i]; el.classList.toggle("playing", i === slot && !!pairNow[i]);
      poster(el, pairNow[i]);
    });
    captions();
    if (!pairNow.length || current !== "home") return;
    if (!pairNow[slot]) slot = 0;
    playItem($$(".slot")[slot], pairNow[slot]);
  }
  function playItem(el, item) {
    var media = $(".slot-media", el);
    if (item.type === "image" || !item.media || item.media.kind !== "youtube") {
      media.innerHTML = item.media ? '<img src="' + esc(mediaSrc(item.media)) + '" alt="">' : "";
      imgTimer = setTimeout(advance, (item.imageSeconds || 10) * 1000);
      return;
    }
    homePlayer = makePlayer(media, item.media.id, advance, function () { imgTimer = setTimeout(advance, 3000); }, { start: item.media.start, muted: function () { return slotMuted[slot]; } });
  }
  function advance() {
    var nextPair = !(slot === 0 && pairNow.length > 1);
    if (nextPair) { slot = 0; step++; } else slot = 1;
    renderHome();
    if (nextPair && pairNow.length > 2 && current === "home") {   // 다음 2개는 옆에서 밀려 들어옴
      var el = $("#slots"); el.classList.remove("enter-r"); void el.offsetWidth; el.classList.add("enter-r");
    }
  }
  // 메인 영상은 누름 반응 없이 자동으로 계속 이어서 재생 (고객사 요청 2026-10-28)

  /* ── 여수 10경 지도 ── */
  // 시안 지도 그림 속 이름표 위치 (1080×1920 기준 left, top, width, height, 번호 동그라미 쪽 r/l)
  var PIN = { 1: [914, 754, 120, 42, "l"], 2: [424, 1157, 160, 42, "l"], 3: [904, 1194, 112, 42, "r"], 4: [786, 1345, 172, 42, "l"],
    5: [697, 697, 210, 42, "r"], 6: [757, 775, 116, 42, "r"], 7: [640, 841, 153, 42, "r"], 8: [615, 543, 178, 44, "r"],
    9: [692, 921, 203, 42, "r"], 10: [548, 358, 205, 44, "r"] };
  var BOX = { 2: [360, 1205, 358, 232] };                 // 거문도·백도 작은 지도 칸도 누르면 2번
  var ROW_Y = [670, 743, 817, 890, 964, 1037, 1111, 1184, 1258, 1331];   // 왼쪽 목록 줄 가운데
  function sights() { return (K.data && K.data.tenSights) || []; }
  function box(r) { return "left:" + r[0] + "px;top:" + r[1] + "px;width:" + r[2] + "px;height:" + r[3] + "px"; }
  function renderPins() {
    var has = {}; sights().forEach(function (p) { has[p.no] = p; });
    $("#list").innerHTML = ROW_Y.map(function (y, i) {
      var p = has[i + 1]; if (!p) return "";
      return '<button class="row' + (detailNo === p.no ? " on" : "") + '" data-no="' + p.no + '" style="top:' + (y - 35) + 'px"><span class="nm">' + esc(tr(p.name)) + "</span></button>";
    }).join("");
    $("#pins").innerHTML = Object.keys(PIN).map(function (no) {
      var p = has[no], r = PIN[no]; if (!p) return "";
      return '<button class="pin ' + r[4] + '" data-no="' + no + '" style="' + box(r) + '"><span class="nm">' + esc(tr(p.name)) + "</span></button>" +
        (BOX[no] ? '<button class="pin box" data-no="' + no + '" style="' + box(BOX[no]) + '" aria-label="' + esc(tr(p.name)) + '"></button>' : "");
    }).join("");
  }
  [$("#pins"), $("#list")].forEach(function (el) {
    el.addEventListener("click", function (e) { var b = e.target.closest("[data-no]"); if (b) openDetail(+b.getAttribute("data-no")); });
  });
  // 확대 지도: 시트의 '확대지도 이미지'가 있으면 그것, 없으면 시안 그림(assets/v3/zoom/번호.jpg)
  function zoomSrc(p) { return (p.mapImage && mediaSrc(p.mapImage)) || "assets/v3/zoom/" + p.no + ".jpg"; }

  var detailNo = 0, detailPlayer = null, view = "map";
  var dMuted = true, dUserMute = false;   // 10경 영상 소리: 안내 중엔 끔 / 사람이 '소리 끄기'를 눌렀으면 계속 끔
  function videoSound(on) {
    dMuted = !on;
    try { if (detailPlayer) on ? (detailPlayer.unMute(), detailPlayer.setVolume(100)) : detailPlayer.mute(); } catch (e) {}
    renderSound();
  }
  function closeDetailMedia() { if (detailPlayer) { detailPlayer.destroy(); detailPlayer = null; } $("#dMedia").innerHTML = ""; }
  function curSight() { return sights().filter(function (x) { return x.no === detailNo; })[0]; }
  function setView(v) {
    var p = curSight(); if (!p) return;
    view = v;
    $$(".zt").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-view") === v); });
    $("#dMedia").hidden = v !== "video";
    if (v !== "video") closeDetailMedia();
    else if (!detailPlayer && !$("#dMedia").firstChild) {
      var host = $("#dMedia");
      if (p.video && p.video.kind === "youtube") detailPlayer = makePlayer(host, p.video.id, function () { setView("map"); }, function (code) { host.innerHTML = '<div class="ph">' + esc(ui("noVideo")) + "<br><small>" + esc(ytReason(code)) + "</small></div>"; }, { start: p.video.start, muted: function () { return dMuted; } });
      else host.innerHTML = '<div class="ph">' + esc(tr(p.name)) + " · " + esc(ui("noVideo")) + "</div>";
    }
    renderSound();
  }
  function openDetail(no, keepMedia, silent) {
    var list = sights(), p = list.filter(function (x) { return x.no === no; })[0];
    if (!p) return;
    var same = detailNo === no && current === "detail";
    show("detail");
    detailNo = no;
    $$("#list .row").forEach(function (r) { r.classList.toggle("on", +r.getAttribute("data-no") === no); });
    $("#dNo").textContent = p.no;
    $("#dName").textContent = tr(p.name);
    var rows = [["address", tr(p.address)], ["tel", p.tel], ["hours", tr(p.hours)], ["fee", tr(p.fee)], ["transit", tr(p.transit)]]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return "<dt>" + esc(ui(r[0])) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("");
    // 사진은 쓰지 않음 (고객 요청 보류 2026-11-13)
    $("#dBody").innerHTML = "<p>" + esc(tr(p.intro)) + "</p>" + (rows ? "<dl>" + rows + "</dl>" : "");
    $("#dBody").scrollTop = 0;
    if (keepMedia || same) { renderSound(); return; }
    closeDetailMedia();
    dMuted = true; dUserMute = false;      // 안내가 먼저, 영상 소리는 안내가 끝난 뒤
    $("#zoomImg").src = zoomSrc(p);
    // 처음 보기: 설정 '10경 상세 처음 보기' (기본 영상). 영상이 없으면 지도
    var first = (K.data && K.data.settings && K.data.settings.detailFirst) || "video";
    setView(first === "video" && p.video && p.video.kind === "youtube" ? "video" : "map");
    if (!silent) say(tr(p.name) + ". " + tr(p.intro));
  }
  $("#zbox").addEventListener("click", function (e) { var b = e.target.closest("[data-view]"); if (b) setView(b.getAttribute("data-view")); });
  // 되돌리기: 음성 안내·영상 모두 멈추고 처음 지도 화면으로 (메인에서 '여행지도'로 들어온 화면)
  $("#dBack").addEventListener("click", function () {
    B.stopSpeaking(); B.stopListening(); $("#listening").hidden = true;
    go("map"); bubble(ui("guide.hello"), [ui("guide.hint1")]);
  });
  $("#dSound").addEventListener("click", function () { dUserMute = !dMuted; videoSound(dMuted); });
  $("#slots").addEventListener("click", function (e) { var b = e.target.closest("[data-snd]"); if (b) toggleSlotSound(+b.getAttribute("data-snd")); });
  function openMap() { go("map"); bubble(ui("guide.hello"), [ui("guide.hint1")]); B.speak(ui("guide.hint1")); }

  /* ── 화면 전환 ── */
  var current = "home";
  function show(which) {
    // 화면이 바뀌면 하던 음성 안내는 멈춤 (새 화면의 안내는 이 뒤에 시작)
    if (which !== current || which === "detail") B.stopSpeaking();
    current = which;
    $("#homePanel").hidden = which !== "home";
    $("#subPanel").hidden = which === "home";
    $("#mapLayer").hidden = which !== "map";
    $("#detailLayer").hidden = which !== "detail";
    $("#subBg").setAttribute("src", "assets/v3/sub-" + (which === "detail" ? "detail" : "map") + ".jpg");
    renderChrome();
    if (which !== "home") stopHome();
    if (which !== "detail") { closeDetailMedia(); detailNo = 0; view = "map"; $$("#list .row").forEach(function (r) { r.classList.remove("on"); }); }
  }
  function go(which) {
    show(which);
    if (which === "home") renderHome();
  }

  /* ── 질문 ── */
  // "관광지도 보여줘" 같은 말 → 서브 화면(10경 지도)
  var MAP_WORDS = ["관광지도", "지도", "10경", "십경", "map", "scenic", "地図", "10景", "地图", "十景"];
  function handleAnswer(q) {
    var d = K.data, nq = KioskQA.norm(q);
    if (d && !KioskQA.findPlace(d, q) && MAP_WORDS.some(function (w) { return nq.indexOf(KioskQA.norm(w)) >= 0; })) return openMap();
    var cur = current === "detail" ? curSight() : null;
    var r = KioskQA.ask(q, lang, ui, { place: cur ? { kind: "ten", p: cur } : null });
    var scr = r.screen || "";
    // 언어 바꾸기: "영어로 해 줘" → 연결 화면 '언어:en'
    var lm = scr.match(/^언어\s*:\s*(ko|en|ja|zh)$/);
    if (lm) { setLang(lm[1]); greet(true); return; }
    // 다시 말해 줘 → 마지막 안내 다시
    if (/다시\s*듣기/.test(scr)) { var l = B.lastSpoken(); if (l) speak(l); else greet(true); return; }
    var ten = r.place && r.place.kind === "ten";
    if (ten && /상세|지도/.test(scr)) openDetail(r.place.p.no, false, true);
    else if (r.choosePlace || /지도/.test(scr)) go("map");
    else if (/처음/.test(scr)) go("home");
    if (r.text) say(r.text);
    if (r.examples) setTimeout(typeBox, 600);
  }
  function listen() {
    B.stopSpeaking();
    var box = $("#listening"); box.hidden = false;
    $("#listenText").textContent = ui("listening");
    B.listen({
      onPartial: function (t) { $("#listenText").textContent = t; },
      onResult: function (t) { box.hidden = true; bubble("", ["“" + t + "”"]); handleAnswer(t); },
      onError: function (m) { box.hidden = true; toast(m); },
      onEnd: function () { box.hidden = true; }
    });
  }
  $("#listenStop").addEventListener("click", function () { B.stopListening(); $("#listening").hidden = true; });

  function modal(html) { $("#modalBody").innerHTML = html; $("#modal").hidden = false; return $("#modalBody"); }
  function closeModal() { $("#modal").hidden = true; $("#modalBody").innerHTML = ""; }
  $("#modalX").addEventListener("click", closeModal);
  function typeBox() {
    var ex = UI.examples[LI[lang]];
    var body = modal("<h2>" + esc(ui("typeTitle")) + '</h2><form id="qForm"><input id="qIn" autocomplete="off" placeholder="' + esc(ui("typePh")) + '"></form>' +
      '<div class="mrow">' + ex.map(function (x) { return '<button class="chip" data-q="' + esc(x) + '">' + esc(x) + "</button>"; }).join("") + "</div>" +
      '<div class="mrow"><button class="primary" id="qGo">' + esc(ui("ask")) + "</button></div>");
    var send = function (q) { q = String(q || "").trim(); if (!q) return; closeModal(); bubble("", ["“" + q + "”"]); handleAnswer(q); };
    $("#qForm", body).addEventListener("submit", function (e) { e.preventDefault(); send($("#qIn", body).value); });
    $("#qGo", body).addEventListener("click", function () { send($("#qIn", body).value); });
    body.addEventListener("click", function (e) { var c = e.target.closest("[data-q]"); if (c) send(c.getAttribute("data-q")); });
    setTimeout(function () { try { $("#qIn", body).focus(); } catch (e) {} }, 100);
  }

  function renderVoice() {
    var on = B.voiceOn();
    $('[data-act="voiceOn"]').classList.toggle("on", on);
    $('[data-act="mute"]').classList.toggle("on", !on);
  }

  /* ── 하단 버튼 ── */
  var adminTaps = 0, adminT = null;
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var a = b.getAttribute("data-act");
    if (a === "talk") listen();
    else if (a === "type") typeBox();
    else if (a === "voiceOn") { B.setVoice(true); renderVoice(); toast(ui("btn.voiceOn") || "음성 안내 켜짐"); }
    else if (a === "mute") { B.setVoice(false); renderVoice(); toast(ui("btn.mute") || "음소거"); if (current === "detail" && !dUserMute) videoSound(true); }
    else if (a === "replay") { var l = B.lastSpoken(); if (l) { if (!B.voiceOn()) { B.setVoice(true); renderVoice(); } speak(l); } }
    else if (a === "greet") { if (current === "home") openMap(); else greet(true); }
    else if (a === "left") { if (current === "home") openMap(); else { B.stopSpeaking(); go("home"); greet(false); } }
    else if (a === "home") resetAll();
    else if (a === "admin") {
      adminTaps++; clearTimeout(adminT); adminT = setTimeout(function () { adminTaps = 0; }, 2500);
      if (adminTaps >= 5) { adminTaps = 0; adminPin(); }
    }
  });
  $$(".hot.lang").forEach(function (b) { b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); }); });

  /* ── 관리자 ── */
  function adminPin() {
    var pin = "";
    var body = modal('<h2>관리자 PIN</h2><div class="pinview" id="pv"></div><div class="pinpad">' +
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "지움", "0", "확인"].map(function (k) { return '<button data-k="' + k + '">' + k + "</button>"; }).join("") + "</div>");
    body.addEventListener("click", function (e) {
      var b = e.target.closest("[data-k]"); if (!b) return; var k = b.getAttribute("data-k");
      if (k === "지움") pin = "";
      else if (k === "확인") { if (pin === String(C.adminPin || "0000")) return adminPanel(); toast("PIN이 맞지 않아요"); pin = ""; }
      else if (pin.length < 8) pin += k;
      $("#pv").textContent = pin.replace(/./g, "●");
    });
  }
  function adminPanel() {
    var d = K.data, U = window.KioskUpdate;
    var st = U && U.available ? U.status() : null;
    var body = modal("<h2>키오스크 관리</h2><dl class=\"meta\">" +
      "<dt>안내 자료</dt><dd>" + (d ? "메인영상 " + d.mainMedia.length + " · 10경 " + d.tenSights.length + " · 관광지 " + d.places.length + " · 질문 " + d.intents.length + "<br><span class=\"note\">시트에서 만든 시각 " + esc(String(d.generatedAt || "").replace("T", " ").slice(0, 16)) + " (UTC) · 불러온 곳 " + esc(K.source) + (d.warnings && d.warnings.length ? " · 확인 필요 " + d.warnings.length + "건" : "") + "</span>" : "불러오지 못함") + "</dd>" +
      "<dt>업데이트</dt><dd>" + (st ? esc(st.message || "") + "<br><span class=\"note\">앱 " + esc(st.appVersion) + " · 화면 " + esc(st.webVersion) + (st.webSource === "update" ? " (업데이트)" : " (앱 기본)") + " · " + esc(st.channel) + "</span>" : "앱 안에서만 동작") + "</dd>" +
      "<dt>기기 ID</dt><dd>" + esc(window.KioskReport ? KioskReport.id() : "-") + "<br><span class=\"note\">시트 '기기상태' 기록: " + (window.KioskReport && KioskReport.url() ? "켜짐" : "꺼짐 (설정 탭 '기기상태 기록 주소' 비어 있음)") + "</span></dd>" +
      "<dt>구분</dt><dd>" + (function () {
        var R = window.KioskReport; if (!R) return "-";
        var t = R.type() || "(시트에 없음)", m = R.kioskMode && R.kioskMode();
        return esc(t) + (m === true ? " · 키오스크로 동작 (꺼지면 자동 재실행)" : m === false ? " · 테스트로 동작 (자동 재실행 안 함)" : " · 이 앱 버전은 감시 기능 없음");
      })() + "</dd>" +
      "<dt>자동 설치</dt><dd>" + (function () {
        var N = window.AndroidKiosk, a = null;
        try { a = N && N.updateAbility ? JSON.parse(N.updateAbility()) : null; } catch (e) {}
        if (!a) return '<span class="note">이 앱 버전은 확인 불가 (새 APK를 한 번 설치하면 보여요)</span>';
        return "안드로이드 " + esc(a.release) + " · " + (a.silentUpdate ? "확인창 없이 설치 ✓" : "설치 확인창 필요 (안드로이드 12 미만)") +
          "<br>" + (a.installAllowed ? "앱 설치 허용 ✓" : '<button class="primary" data-a="perm-install">앱 설치 허용 켜기</button>') +
          " · " + (a.overlay ? "업데이트 뒤 자동 다시 켜기 ✓" : '<button class="primary" data-a="perm-overlay">다른 앱 위에 표시 켜기</button>');
      })() + "</dd>" +
      "<dt>목소리</dt><dd id=\"voiceBox\"></dd>" +
      "<dt>화면</dt><dd>" + window.innerWidth + "×" + window.innerHeight + "</dd>" +
      "<dt>인터넷</dt><dd>" + (navigator.onLine ? "연결됨" : "끊김") + "</dd></dl>" +
      '<div class="mrow"><button class="primary" data-a="update">🔄 지금 업데이트</button><button data-a="reset">앱 기본 화면으로</button><button data-a="reload">화면 새로고침</button><button data-a="legacy">이전 데모 화면</button><button class="danger" data-a="exit">키오스크 종료</button></div>' +
      (d && d.warnings && d.warnings.length ? "<h2 style=\"margin-top:26px;font-size:26px\">시트 확인 필요</h2><p class=\"note\">" + d.warnings.slice(0, 12).map(esc).join("<br>") + "</p>" : ""));
    renderVoices(body);
    body.addEventListener("click", function (e) {
      var vb = e.target.closest("[data-voice]");
      if (vb) { B.setVoiceName(vb.getAttribute("data-voice")); setTimeout(function () { B.speak(ui("guide.hello") + " " + ui("guide.hint1")); renderVoices(body); }, 300); return; }
      var b = e.target.closest("[data-a]"); if (!b) return; var a = b.getAttribute("data-a");
      if (a === "update") { if (U && U.available) { U.check(); toast("새 버전을 확인할게요"); } else location.reload(); }
      if (a === "reset" && U && U.available) U.reset();
      if (a === "reload") B.reload();
      if (a === "perm-overlay" && window.AndroidKiosk) AndroidKiosk.openOverlaySetting();
      if (a === "perm-install" && window.AndroidKiosk) AndroidKiosk.openInstallSetting();
      if (a === "legacy") location.href = "legacy.html";
      if (a === "exit") B.exitKiosk();
    });
    if (U && U.on) {
      var off = U.on(function (s) { if (!$("#modal").hidden) toast(s.message || s.state); else off(); });
    }
  }

  /* 관리자: 이 기기에서 고를 수 있는 목소리 (누르면 들려주고 이 기기에 저장) */
  function renderVoices(body) {
    var el = $("#voiceBox", body); if (!el) return;
    var vs = (B.listVoices && B.listVoices()) || [];
    if (!vs.length) { el.innerHTML = '<span class="note">고를 수 있는 목소리 목록이 없어요 (앱을 새 버전으로 설치하면 보여요)</span>'; return; }
    var cur = vs.filter(function (v) { return v.on; })[0];
    el.innerHTML = '<span class="note">지금: ' + esc(cur ? cur.name : "기본") + ' · 눌러서 들어 보고 고르세요 (이 기기에만 저장)</span><div class="mrow">' +
      '<button data-voice="">자동 (추천)</button>' +
      vs.slice(0, 16).map(function (v) { return '<button data-voice="' + esc(v.name) + '"' + (v.on ? ' class="primary"' : "") + ">" + esc(v.name.replace(/^ko-kr-x-/, "").replace(/-(local|network)$/, function (m) { return m === "-local" ? " · 기기" : " · 인터넷"; })) + "</button>"; }).join("") + "</div>";
  }

  /* ── 무조작 시 처음 화면 + 한국어 ── */
  var idleT = null;
  function idleSeconds() { return (K.data && K.data.settings && K.data.settings.idleSeconds) || C.idleSeconds || 90; }
  function resetAll() {
    closeModal(); B.stopListening(); $("#listening").hidden = true;
    if (lang !== "ko") { lang = "ko"; B.setLang(LANG_TAG.ko); applyLang(); }
    step = 0; slot = 0; slotIdx = [0, 1]; slotMuted = [muted, muted]; renderSound(); B.stopSpeaking(); go("home"); greet(false);
  }
  function poke() {
    clearTimeout(idleT);
    idleT = setTimeout(function () {
      if (current === "detail" && detailPlayer && detailPlayer.playing()) return poke(); // 10경 영상 보는 중이면 기다림
      if (current !== "home" || lang !== "ko" || !$("#modal").hidden) resetAll(); else poke();
    }, idleSeconds() * 1000);
  }
  ["pointerdown", "keydown"].forEach(function (ev) { document.addEventListener(ev, poke, true); });

  /* 안드로이드 뒤로가기 */
  window.KioskBack = function () {
    if (!$("#listening").hidden) { B.stopListening(); $("#listening").hidden = true; return; }
    if (!$("#modal").hidden) return closeModal();
    if (current === "detail") return go("map");
    if (current !== "home") return go("home");
  };

  /* ── 시작 ── */
  applyLang(); renderVoice();
  K.ready.then(function (d) {
    var dl = d && d.settings && d.settings.defaultLang;
    if (dl && dl !== "ko" && LANG_TAG[dl]) { lang = dl; B.setLang(LANG_TAG[dl]); }
    var st = (d && d.settings) || {};
    if (B.setVoiceStyle) B.setVoiceStyle(st.voicePitch || 1.12, st.voiceRate || 1.0);   // 시트 '설정' 음성 높낮이·빠르기
    applyLang(); go("home"); poke();
  });
})();

/*
 * 말로 찾을께 (기기 자료 검색) · 뭐든지 묻기 (음성 AI 대화) — 한국어 · English · 日本語 · 中文
 */
(function () {
  "use strict";
  var K = window.Kiosk, C = window.KIOSK_CONFIG, D = window.KIOSK_DATA, B = window.KioskBridge, L = window.I18N;
  var $ = K.$, esc = K.esc, I = K.ICON;
  function ko(rec, f) { return L.ko(rec, f) || ""; }

  /* ───────── 검색 색인 (언어가 바뀌면 다시 만듦) ───────── */
  var INDEX = [];
  function pn(no) { var p = no ? K.place(no) : null; return p ? p.name : ""; }
  function pnKo(no) { var p = no ? K.place(no) : null; return p ? ko(p, "name") : ""; }
  function buildIndex() {
    INDEX = [];
    function add(e) { INDEX.push(e); }
    D.places.forEach(function (p) {
      var kn = ko(p, "name");
      add({ kind: T("관광지") + " · " + p.area, type: "place", icon: "📍", title: p.no + ". " + p.name, desc: p.desc,
        keys: [p.name, p.short || "", kn, kn.replace(/^여수/, ""), p.area, ko(p, "area")].concat(p.tags, ko(p, "tags") || []), go: ["places", { no: p.no }] });
    });
    D.news.forEach(function (n) {
      add({ kind: T("소식") + " · " + n.label, type: "news", icon: "📰", title: n.title, desc: n.place, keys: [n.title, n.label, n.place, ko(n, "title"), "행사", "소식", "축제", "공연", T("행사"), T("소식"), T("축제"), T("공연")], go: ["news", { id: n.id }] });
    });
    D.spots.forEach(function (sp) {
      add({ kind: T("명소") + " · " + sp.cat, type: "spot", icon: "🧭", title: sp.name, desc: sp.desc + " (" + sp.addr + ")", keys: [sp.name, ko(sp, "name"), sp.cat, ko(sp, "cat"), sp.addr, pn(sp.near), pnKo(sp.near)],
        go: sp.near ? ["places", { no: sp.near }] : ["taxi", { tab: 1 }], spot: sp });
    });
    D.parking.forEach(function (p) {
      add({ kind: T("주차장"), type: "parking", icon: "🅿️", title: p.name, desc: (p.near ? T("{0} 인근", pn(p.near)) + " · " : "") + p.fee, keys: [p.name, ko(p, "name"), "주차", "주차장", T("주차장"), pn(p.near), pnKo(p.near)], go: ["parking", { near: p.near, chosen: p.id }] });
    });
    D.busStops.forEach(function (s) {
      add({ kind: T("버스 정류장") + " · " + (s.areaLabel || s.area), type: "stop", icon: "🚏", title: s.label || s.name, desc: T("{0}개 노선", s.routes.length) + " · " + s.routes.slice(0, 8).join(", ") + (s.routes.length > 8 ? " …" : ""),
        keys: [s.name, s.label || "", "버스", "정류장", T("버스"), T("정류장"), s.area].concat(s.near.map(pn), s.near.map(pnKo)), go: ["bus", { tab: 0, chosen: s.id }] });
    });
    D.busRoutes.forEach(function (r) {
      add({ kind: T("버스 노선") + " · " + (r.kindLabel || r.kind), type: "route", no: r.no, icon: "🚍", title: T("{0}번", r.no) + " " + (r.fromLabel || r.from) + " → " + (r.toLabel || r.to),
        desc: r.tourLabel || (r.atStops.length ? r.atStops.slice(0, 4).map(L.stop).join(" · ") : T("{0}버스", r.kindLabel || r.kind)),
        keys: [r.no + "번", r.no + " 번", T("{0}번", r.no), r.from, r.to, r.fromLabel || "", r.toLabel || "", "노선", T("노선")].concat(r.stops || [], r.places.map(pn), r.places.map(pnKo)), go: ["bus", { tab: 1, chosen: r.id }] });
    });
    D.food.forEach(function (f) {
      add({ kind: T("맛집·카페") + " · " + L.term(f.type), type: "food", icon: f.type === "카페" ? "☕" : "🍽️", title: f.name, desc: (f.menu ? f.menu + " · " : "") + f.addr,
        keys: [f.name, ko(f, "name"), f.type, L.term(f.type), f.area, f.addr, "맛집", "먹거리", T("맛집"), pn(f.near), pnKo(f.near)].concat(f.menu ? f.menu.split(/[·,]/) : [], ko(f, "menu") ? ko(f, "menu").split(/[·,]/) : [], f.type === "카페" ? ["카페", "커피", "디저트", T("카페"), T("커피")] : ["식당", "음식", T("음식")]), go: ["food", { chosen: f.id }] });
    });
    D.stay.forEach(function (s) {
      add({ kind: T("숙소") + " · " + L.term(s.type), type: "stay", icon: s.type === "캠핑" ? "⛺" : "🛏️", title: s.name, desc: s.area, keys: [s.name, ko(s, "name"), s.type, L.term(s.type), s.area, "숙소", "숙박", T("숙소"), pn(s.near), pnKo(s.near)], go: ["stay", { chosen: s.id }] });
    });
    D.taxiStands.forEach(function (t) { add({ kind: T("택시 승강장"), type: "taxistand", icon: "🚕", title: t.name, desc: t.where, keys: [t.name, ko(t, "name"), "택시", "승강장", T("택시"), pn(t.near)], go: ["taxi", { tab: 0 }] }); });
    [["course", "추천 코스", "🗺️", "대표 코스 · 야경 · 가족 · 역사 · 해돋이 코스", ["코스", "추천", "일정", "여행 코스", "하루", "course", "itinerary", "plan", "コース", "おすすめ", "路线", "行程", "推荐"]],
     ["transit", "교통·주차", "🚏", "버스 · 택시 · 주차장 한눈에", ["교통", "이동", "가는 방법", "어떻게 가", "transport", "how to get", "交通", "行き方", "怎么去"]],
     ["photo", "AI 포토존", "📸", "사진을 찍고 여수 명소 배경과 합성해요", ["사진", "포토", "포토존", "촬영", "셀카", "AI", "photo", "picture", "selfie", "写真", "フォト", "拍照", "照片"]],
     ["taxi", "택시 부르기", "🚕", "택시 호출 · 목적지 보여주기 · 요금 안내", ["택시", "콜", "호출", "taxi", "cab", "タクシー", "出租", "打车"]],
     ["bus", "버스 안내", "🚌", "주변 정류장 · 노선 찾기 · 이용 안내", ["버스", "노선", "정류장", "교통", "bus", "バス", "公交", "巴士"]],
     ["parking", "주차장 안내", "🅿️", "주차장 위치 · 빈자리", ["주차", "주차장", "파킹", "parking", "駐車", "停车"]],
     ["food", "맛집·카페", "🍽️", "여수 대표 음식과 카페", ["맛집", "음식", "식당", "카페", "먹", "food", "restaurant", "cafe", "グルメ", "カフェ", "美食", "咖啡", "餐厅"]],
     ["stay", "숙소 예약", "🛏️", "호텔 · 펜션 예약 체험", ["숙소", "호텔", "펜션", "예약", "hotel", "stay", "ホテル", "宿", "酒店", "住宿"]],
     ["ask", "뭐든지 묻기", "✨", "음성으로 무엇이든 물어보기", ["질문", "물어", "AI", "대화", "ask", "question", "質問", "提问"]]
    ].forEach(function (m) { add({ kind: T("메뉴"), type: "menu", icon: m[2], title: T(m[1]), desc: T(m[3]), keys: m[4].concat([T(m[1])]), go: [m[0], {}] }); });
  }
  buildIndex();
  L.on(buildIndex);

  // 받침 유무에 따라 조사 고르기 (예: 오동도 → 는, 이순신광장 → 은)
  function josa(word, withB, withoutB) {
    var c = String(word).replace(/[^가-힣]+$/, "").slice(-1).charCodeAt(0);
    if (!(c >= 0xac00 && c <= 0xd7a3)) return withoutB;
    return (c - 0xac00) % 28 ? withB : withoutB;
  }
  function norm(s) { return String(s || "").toLowerCase().replace(/[\s.,!?·~"'“”‘’？！。、，]/g, ""); }
  var TAIL = /(으로|에서|에게|까지|부터|이랑|하고|어디야|어디|찾아줘|찾아|알려줘|알려|보여줘|보여|가고싶어|가는길|가는|있어|있나요|좀|은|는|이|가|을|를|에|로|도|요)$/;
  var STOP_EN = /^(the|a|an|to|of|in|on|at|for|is|are|where|what|which|how|can|i|me|my|we|show|find|tell|about|please|go|get|there|near|nearby|do|does|some|any|with|and)$/;
  function tokens(q) {
    return String(q).split(/\s+/).map(function (t) { t = norm(t); for (var i = 0; i < 3; i++) t = t.replace(TAIL, ""); return t; })
      .filter(function (t) { return t.length >= 2 && !STOP_EN.test(t); });
  }
  function search(q) {
    var nq = norm(q); if (!nq) return [];
    var toks = tokens(q), en = L.lang === "en";
    return INDEX.map(function (e) {
      var s = 0, hay = norm(e.title + " " + e.desc + " " + e.keys.join(" "));
      e.keys.forEach(function (k) { var nk = norm(k); if (nk.length >= 2 && nq.indexOf(nk) >= 0) s += nk.length >= 3 ? 4 : 3; });
      toks.forEach(function (t) { if (hay.indexOf(t) >= 0) s += 2; });
      if (norm(e.title).indexOf(nq) >= 0) s += 5;
      toks.forEach(function (t) { if (t.length >= 3 && norm(e.title).indexOf(t) >= 0) s += 3; });
      if (toks.length > 1 && toks.every(function (t) { return hay.indexOf(t) >= 0; })) s += 5; // 모든 낱말이 맞으면 우선
      if (/parking|stop|taxistand/.test(e.type) && !/주차|정류|버스|택시|승강|park|bus|stop|taxi|駐車|バス|タクシー|停车|公交|出租|车站/i.test(q)) s -= 2; // 교통 시설은 그 낱말이 있을 때만 앞으로
      if (e.type === "menu") s -= 1;
      if (en && e.type === "route" && !/bus|route|no\.|\d/i.test(q)) s -= 2;
      return { e: e, s: s };
    }).filter(function (x) { return x.s > 1; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 30).map(function (x) { return x.e; });
  }
  window.KioskSearch = search;

  /* ───────── 말로 찾을께 ───────── */
  var EX_FIND = { ko: ["오동도", "만성리 해변", "주차장", "행사", "사진"], en: ["Odongdo", "Beach", "Parking", "Event", "Photo"], ja: ["梧桐島", "ビーチ", "駐車場", "イベント", "写真"], zh: ["梧桐岛", "海滩", "停车场", "活动", "拍照"] };
  K.screens.finder = {
    render: function (el, prm) {
      el.innerHTML = '<section class="voice-finder"><div class="voice-heading">' + I.mic + "<div><h2>" + T("말로 찾을께!") + "</h2><p>" + T("기기에 등록된 관광지·소식·안내 찾기") + "</p></div></div>" +
        '<div class="voice-input-area"><button class="finder-mic" aria-label="' + T("음성 입력 시작") + '" aria-pressed="false">' + I.mic + "<span>" + T("눌러서 말하기") + "</span></button>" +
        '<p role="status">' + T("마이크를 누르고 찾을 자료를 말씀해 주세요.") + "</p>" +
        '<form><input aria-label="' + T("기기 자료 검색") + '" placeholder="' + T("또는 글자로 입력하세요") + '" maxlength="160" value=""><button type="submit" aria-label="' + T("자료 검색") + '">' + I.search + T("찾기") + "</button></form>" +
        '<div class="finder-examples">' + (EX_FIND[L.lang] || EX_FIND.ko).map(function (x) { return "<button>" + esc(x) + "</button>"; }).join("") + "</div></div>" +
        '<div class="finder-results" aria-live="polite"><p>' + T("“오동도 찾아줘”, “행사 보여줘”처럼 말씀해 보세요.") + "</p></div>" +
        '<small class="finder-note">' + T("등록된 자료만 검색합니다. 음성 입력은 음성인식 서비스를 사용하며, 네트워크·마이크 권한이 필요합니다.") + "</small></section>";
      var input = $("input", el), status = $(".voice-input-area > p", el), res = $(".finder-results", el), last = [];
      function run(q) {
        q = String(q || "").trim(); if (!q) return;
        input.value = q; last = search(q);
        status.textContent = T("“{0}” 검색 결과 {1}건", q, last.length);
        res.innerHTML = last.length ? last.map(function (e, i) {
          return '<button data-i="' + i + '"><i>' + e.icon + "</i><span><small>" + esc(e.kind) + "</small><strong>" + esc(e.title) + "</strong><em>" + esc(e.desc) + "</em></span>" + I.chev + "</button>";
        }).join("") : '<p class="k-empty">' + esc(T("“{0}”에 맞는 자료를 찾지 못했어요.", q)) + "<br>" + T("다른 말로 다시 말씀해 주시거나, <b>뭐든지 묻기</b>에서 물어보세요.") + "</p>";
        res.scrollTop = 0;
        if (last.length) B.speak(T("{0}건을 찾았어요.", last.length)); else B.speak(T("자료를 찾지 못했어요."));
      }
      $("form", el).addEventListener("submit", function (e) { e.preventDefault(); input.blur(); run(input.value); });
      $(".finder-examples", el).addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) run(b.textContent); });
      res.addEventListener("click", function (e) { var b = e.target.closest("[data-i]"); if (!b) return; var g = last[+b.getAttribute("data-i")].go; K.go(g[0], g[1]); });
      $(".finder-mic", el).addEventListener("click", function () {
        status.textContent = T("듣고 있어요…");
        K.listen({ button: this, onPartial: function (t) { input.value = t; }, onResult: run, onError: function (m) { status.textContent = m; } });
      });
      if (prm.query) run(prm.query);
    }
  };

  /* ───────── 뭐든지 묻기 ───────── */
  var EX_ASK = {
    ko: ["여수 밤바다 어디서 봐?", "아이랑 갈 곳 알려줘", "오동도는 어떤 곳이야?", "맛집 추천해줘", "하멜이 누구야?"],
    en: ["Where can I see the night view?", "Places to go with kids", "Tell me about Odongdo", "Recommend local food", "Which bus goes to Hyangiram?"],
    ja: ["夜景はどこで見られる?", "子どもと行ける所を教えて", "梧桐島はどんな所?", "おすすめのグルメは?", "向日庵へ行くバスは?"],
    zh: ["在哪里看夜景？", "带孩子去哪里好？", "梧桐岛是什么地方？", "推荐美食", "去向日庵坐几路公交？"]
  };
  var chat = [];
  K.screens.ask = {
    render: function (el, prm) {
      el.innerHTML = '<section class="voice-finder ask-screen"><div class="voice-heading">' + I.sparkles + "<div><h2>" + T("뭐든지 묻기!") + "</h2><p>" + T("여수 여행, 무엇이든 말로 물어보세요") + "</p></div></div>" +
        '<div class="ask-log" aria-live="polite"></div>' +
        '<div class="voice-input-area"><button class="finder-mic" aria-label="' + T("음성으로 질문") + '" aria-pressed="false">' + I.mic + "<span>" + T("눌러서 질문하기") + "</span></button>" +
        '<p role="status">' + T("마이크를 누르고 궁금한 걸 말씀해 주세요.") + "</p>" +
        '<form><input aria-label="' + T("질문 입력") + '" placeholder="' + T("또는 글자로 질문하세요") + '" maxlength="200" value=""><button type="submit" aria-label="' + T("질문 보내기") + '">' + I.send + T("보내기") + "</button></form>" +
        '<div class="finder-examples">' + (EX_ASK[L.lang] || EX_ASK.ko).map(function (x) { return "<button>" + esc(x) + "</button>"; }).join("") + "</div></div>" +
        '<small class="finder-note">' + (C.ai.endpoint ? T("AI가 답변합니다. 답변은 참고용이며 정확하지 않을 수 있어요.") : T("기기에 등록된 안내와 위키백과(인터넷)를 바탕으로 답합니다. 답변은 참고용이에요.")) + "</small></section>";
      var log = $(".ask-log", el), input = $("input", el), status = $(".voice-input-area > p", el);
      chat = [];
      bot(log, T("안녕하세요! 여수 여행 안내 AI예요. 야경 명소, 맛집, 교통처럼 궁금한 걸 물어보세요."), null, true);
      $("form", el).addEventListener("submit", function (e) { e.preventDefault(); input.blur(); ask(log, input.value); input.value = ""; });
      $(".finder-examples", el).addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) ask(log, b.textContent); });
      $(".finder-mic", el).addEventListener("click", function () {
        status.textContent = T("듣고 있어요…");
        K.listen({ button: this, onPartial: function (t) { input.value = t; }, onResult: function (t) { input.value = ""; status.textContent = T("마이크를 누르고 궁금한 걸 말씀해 주세요."); ask(log, t); }, onError: function (m) { status.textContent = m; } });
      });
      log.addEventListener("click", function (e) {
        var b = e.target.closest("[data-ask-go]"); if (!b) return;
        var g = JSON.parse(b.getAttribute("data-ask-go")); K.go(g[0], g[1]);
      });
      if (prm.q) ask(log, prm.q);
      if (prm.listen) setTimeout(function () { var m = $(".finder-mic", el); if (m && m.isConnected) m.click(); }, 300);
      if (prm.type) setTimeout(function () { if (input.isConnected) input.focus(); }, 200);
    }
  };
  function bubble(log, cls, html) {
    var m = document.createElement("div"); m.className = "ask-msg " + cls; m.innerHTML = html;
    log.appendChild(m); log.scrollTop = log.scrollHeight; return m;
  }
  var GO_NAME = { course: "추천 코스", transit: "교통·주차", places: "관광지 찾기", parking: "주차장", taxi: "택시", bus: "버스", food: "맛집·카페", stay: "숙소 예약", photo: "AI 포토존", finder: "말로 찾을께", news: "소식" };
  function bot(log, text, go, silent, src) {
    var html = esc(text) + (src ? "<small>" + esc(src) + "</small>" : "");
    if (go) html += '<br><button class="ask-go" data-ask-go=\'' + esc(JSON.stringify(go)) + "'>" + esc(T("{0} 바로가기 ›", go[2] || T(GO_NAME[go[0]] || "바로가기"))) + "</button>";
    bubble(log, "bot", html);
    if (!silent) B.speak(text.replace(/\([^)]*\)/g, ""));
    chat.push({ role: "assistant", content: text });
  }
  var LANG_RULE = { en: " Always answer in English.", ja: " 必ず日本語で答えてください。", zh: " 请务必用简体中文回答。" };
  function ask(log, q) {
    q = String(q || "").trim(); if (!q) return;
    bubble(log, "me", esc(q)); chat.push({ role: "user", content: q }); chat = chat.slice(-10);
    var typing = bubble(log, "bot typing", T("답변을 생각하고 있어요…"));
    var done = function (a) { typing.remove(); bot(log, a.text, a.go, false, a.src); };
    if (C.ai.endpoint) {
      var h = { "Content-Type": "application/json" }; if (C.ai.apiKey) h.Authorization = "Bearer " + C.ai.apiKey;
      fetch(C.ai.endpoint, { method: "POST", headers: h, body: JSON.stringify({ model: C.ai.model, max_tokens: 300, messages: [{ role: "system", content: C.ai.systemPrompt + (LANG_RULE[L.lang] || "") + " 등록된 관광지: " + D.places.map(function (p) { return p.name; }).join(", ") }].concat(chat) }) })
        .then(function (r) { return r.json(); })
        .then(function (j) { var t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content; if (!t) throw 0; local(q, true).then(function (l) { done({ text: t.trim(), go: l.go }); }); })
        .catch(function () { local(q).then(done); });
    } else local(q).then(function (a) { setTimeout(function () { done(a); }, 350); });
  }

  /* 관광지 이름 속 고유 낱말의 번역 (예: 오동도 등대 → 梧桐島, Odongdo) */
  var GENERIC = /^(여수|여수시|공원|등대|해변|광장|전남|마을|거리|입구|인근|일대|케이블카|해상케이블카|돌산)$/;
  function aliases(p) {
    if (L.lang === "ko") return [];
    var kn = ko(p, "name");
    return Object.keys(L.words).filter(function (k) { return k.length >= 2 && !GENERIC.test(k) && kn.indexOf(k) >= 0; }).map(function (k) { return L.pick(L.words[k], k); });
  }
  /* 질문에서 버스 목적지만 남기기 */
  var BUS_Q = /버스|노선|몇 ?번|\bbus(es)?\b|\broute\b|バス|路線|公交|巴士|几路|线路|路线/i;
  var BUS_STRIP = [
    /(가는|가려면|타고|타면|어떤|무슨|몇 ?번|버스|노선|있어|알려줘|알려|돼|이야|인가요|이에요|\?|요)/g,
    /\b(which|what|how|do|does|can|i|we|get|go|goes|going|to|the|a|bus|buses|route|routes|take|number|no|is|there|for|from|here|by)\b|[?.!]/gi,
    /(行きの|行く|行き|には|へ|まで|何番|どの|乗れば|乗る|いい|ですか|でしょうか|バス|路線|は|に|教えて|[?？])/g,
    /(怎么|去|到|坐|乘|几路|哪路|哪一路|公交车|公交|巴士|线路|路线|可以|吗|呢|[?？])/g
  ];
  function busTarget(q) {
    var t = String(q); BUS_STRIP.forEach(function (r) { t = t.replace(r, " "); });
    return t.replace(/\s+/g, " ").trim();
  }
  /* 내장 답변 엔진: 자주 묻는 질문 → 관광지 → 기기 자료 → 위키백과 */
  function local(q, goOnly) {
    var nq = norm(q), foreign = L.lang !== "ko";
    // 1) 관광지 이름이 들어 있으면 그 장소 소개
    var pl = D.places.filter(function (p) {
      var kn = ko(p, "name");
      var names = [p.name, p.short || "", kn, kn.replace(/^여수/, ""), kn.split(/[ /]/)[0], p.name.replace(/^(Yeosu|麗水|丽水)\s*/, ""), p.name.split(/[ /・]/)[0]].concat(aliases(p)).map(norm)
        .filter(function (n) { return n.length >= 2 && !/^(yeosu|麗水|丽水|여수|jeonnam|全南|전남)$/.test(n); });
      return names.some(function (n) { return nq.indexOf(n) >= 0; });
    }).sort(function (a, b) { return b.name.length - a.name.length; })[0];
    // 1-2) "○○ 가는 버스" → 실제 노선 안내
    if (BUS_Q.test(q)) {
      var target = busTarget(q);
      if (target.length >= 2) {
        var rr = search(target).filter(function (e) { return e.type === "route"; }).slice(0, 4);
        if (rr.length) {
          var nos = rr.map(function (e) { return T("{0}번", e.no); });
          return Promise.resolve({ text: T("{0}에 가려면 {1} 버스를 타면 돼요. {2} 노선부터 확인해 보세요.", pl ? pl.name : target, nos.join(", "), rr[0].title),
            go: rr[0].go.concat([T("{0} 노선", nos[0])]), src: T("노선 출처: 국토교통부 TAGO 여수시 버스 정보") });
        }
      }
    }
    // 2) 자주 묻는 질문
    var faq = foreign ? (L.data.faq && L.data.faq[L.lang]) || [] : D.faq;
    var f = faq.filter(function (x) { return x.keys.some(function (k) { return nq.indexOf(norm(k)) >= 0; }); })[0];
    var aboutPlace = /어떤|뭐야|무엇|소개|알려|what|tell|about|どんな|について|教えて|什么|介绍/i.test(q);
    if (f && !(pl && aboutPlace)) {
      var go = f.go ? [f.go, f.place ? { no: f.place } : f.query ? { query: f.query } : {}] : null;
      return Promise.resolve({ text: f.answer, go: go });
    }
    if (pl) {
      var base = foreign ? T("{0}은(는) {1}에 있어요. {2}", pl.name, pl.area, pl.desc) : pl.name + josa(pl.name, "은", "는") + " " + pl.area + "에 있어요. " + pl.desc;
      if (goOnly) return Promise.resolve({ text: base, go: ["places", { no: pl.no }, pl.name] });
      return Wiki.place(pl).then(function (info) {
        return { text: base + (info && info.extract ? "\n\n" + info.extract : ""), go: ["places", { no: pl.no }, pl.name], src: info && info.extract ? T("출처: 위키백과 · 기기 안내 자료") : T("출처: 기기 안내 자료") };
      });
    }
    // 3) 기기 자료 검색
    var r = search(q).filter(function (e) { return e.type !== "menu"; });
    if (r.length && norm(r[0].title).length && tokens(q).some(function (t) { return norm(r[0].title + r[0].keys.join("")).indexOf(t) >= 0; })) {
      var e = r[0];
      return Promise.resolve({ text: T("{0} 정보를 찾았어요. {1}", e.title, e.desc), go: e.go.concat([e.title.replace(/^\d+\. /, "")]) });
    }
    if (goOnly) return Promise.resolve({ text: "", go: null });
    // 4) 위키백과 (지금 언어의 위키백과)
    var term = String(q).replace(/[?？!.。]/g, " ")
      .replace(/(누구야|누구|뭐야|무엇이야|무엇|뭔가요|이 뭐|가 뭐|에 대해|알려줘|알려|설명해줘|설명|어떤 곳이야|어떤곳|이야|야)\s*$/g, "")
      .replace(/^\s*(who|what)\s+(is|are|was|were)\s+|^\s*tell me about\s+|^\s*about\s+/i, "")
      .replace(/(って何|とは|について教えて|について|は誰|は何|教えて|ですか)\s*$/g, "")
      .replace(/(是谁|是什么|是什么地方|介绍一下|介绍)\s*$/g, "").trim() || q;
    return Wiki.lookup(term).then(function (w) {
      if (w && w.text) return { text: w.text, src: T("출처: 위키백과 「{0}」", w.title) };
      return { text: T("죄송해요, 그 질문에는 아직 답을 찾지 못했어요. 야경, 맛집, 주차, 버스, 숙소처럼 여수 여행에 대해 물어봐 주세요.") + (navigator.onLine === false ? " " + T("(지금은 인터넷 연결이 없어 기기 안의 자료로만 답할 수 있어요.)") : ""), go: ["finder", { query: q }, T("말로 찾을께에서 찾기")] };
    });
  }
})();

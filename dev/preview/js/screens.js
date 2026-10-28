/*
 * 메뉴 화면: 주차장 · 택시 · 버스 · 맛집·카페 · 숙소 예약 · 교통·주차 · 추천 코스
 * 원본 사이트의 sample-screen 구성(사진 → 분류 탭 → 목록 → 실행 버튼 → 안내 문구)을 그대로 쓰고,
 * 항목이 많을 때를 위해 목록 위에 검색칸을 더했습니다. 데이터: js/data-yeosu.js
 * 화면 글자는 T("한국어") 로 적고, 외국어 번역은 js/i18n-text.js 에 있습니다.
 */
(function () {
  "use strict";
  var K = window.Kiosk, C = window.KIOSK_CONFIG, D = window.KIOSK_DATA, B = window.KioskBridge, L = window.I18N;
  var $ = K.$, $$ = K.$$, esc = K.esc;
  function pname(no) { var p = no ? K.place(no) : null; return p ? p.name : ""; }
  function norm(s) { return String(s || "").toLowerCase().replace(/[\s·()\-.,]/g, ""); }
  function ko(rec, f) { return L.ko(rec, f) || ""; }
  function kioskName() { return L.name(C.kioskLocationName); }
  function kind(r) { return T("{0}버스", r.kindLabel || r.kind); }

  /* ───────── 공통 sample-screen ───────── */
  function Sample(el, cfg) {
    var st = { tab: cfg.tab || 0, chosen: cfg.chosen || null, items: [], q: cfg.q || "" };
    el.innerHTML = '<section class="sample-screen' + (cfg.search ? " k-compact" : "") + '">' +
      (cfg.switcher ? '<nav class="k-switch" aria-label="' + T("교통·주차") + '">' + [["bus", T("🚌 버스")], ["taxi", T("🚕 택시")], ["parking", T("🅿️ 주차장")]].map(function (x) { return '<button data-sw="' + x[0] + '"' + (x[0] === cfg.switcher ? ' class="on"' : "") + ">" + x[1] + "</button>"; }).join("") + "</nav>" : "") +
      '<div class="sample-hero"><img alt="' + esc(cfg.alt) + '" src="' + cfg.hero + '"></div>' +
      '<nav class="sample-tabs" aria-label="' + T("분류") + '">' + cfg.tabs.map(function (t, i) { return '<button data-tab="' + i + '" aria-pressed="' + (i === st.tab) + '">' + esc(t) + "</button>"; }).join("") + "</nav>" +
      (cfg.search ? '<form class="k-search"><input placeholder="' + esc(cfg.search) + '" maxlength="30" aria-label="' + T("목록 검색") + '"><button type="submit">' + T("찾기") + '</button><span class="k-count"></span></form>' : "") +
      '<div class="sample-list"></div><div class="k-sticky"><button class="sample-action"></button><p class="sample-message" role="status"></p></div></section>';
    var list = $(".sample-list", el), action = $(".sample-action", el), msg = $(".sample-message", el), input = $(".k-search input", el);
    function chosenItem() { return st.items.filter(function (i) { return i.id === st.chosen; })[0] || null; }
    function draw() {
      var all = cfg.items(st.tab) || [], q = norm(st.q);
      st.items = q ? all.filter(function (it) { return norm(it.title + " " + it.sub + " " + (it.keys || "")).indexOf(q) >= 0; }) : all;
      if (!chosenItem()) st.chosen = st.items[0] ? st.items[0].id : null;
      list.innerHTML = st.items.length ? st.items.map(function (it) {
        return '<button data-id="' + esc(it.id) + '" class="' + (it.id === st.chosen ? "chosen" : "") + '"><span>' + it.icon + "</span><div><b>" + esc(it.title) +
          (it.badge ? '<i class="k-badge ' + (it.badgeCls || "") + '">' + esc(it.badge) + "</i>" : "") + "</b><small>" + esc(it.sub) + "</small></div><span>›</span></button>";
      }).join("") : '<div class="sample-empty">' + esc(q ? T("‘{0}’에 맞는 항목이 없어요.", st.q) : (cfg.empty ? cfg.empty(st.tab) : T("표시할 항목이 없어요."))) + "</div>";
      var c = $(".k-count", el); if (c) c.textContent = T("{0}곳", st.items.length);
      var it = chosenItem();
      action.textContent = cfg.actionLabel(st.tab, it);
      action.disabled = !it;
      msg.textContent = cfg.message ? cfg.message(st.tab, it) : "";
    }
    if (cfg.switcher) $(".k-switch", el).addEventListener("click", function (e) { var b = e.target.closest("[data-sw]"); if (b && b.getAttribute("data-sw") !== cfg.switcher) K.go(b.getAttribute("data-sw")); });
    $(".sample-tabs", el).addEventListener("click", function (e) {
      var b = e.target.closest("[data-tab]"); if (!b) return;
      if (cfg.tabGo && cfg.tabGo[+b.getAttribute("data-tab")]) return K.go(cfg.tabGo[+b.getAttribute("data-tab")]);
      st.tab = +b.getAttribute("data-tab"); st.chosen = null;
      $$(".sample-tabs button", el).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      draw(); $(".sample-screen", el).scrollTop = 0;
    });
    if (input) {
      input.value = st.q;
      $(".k-search", el).addEventListener("submit", function (e) { e.preventDefault(); input.blur(); st.q = input.value.trim(); st.chosen = null; draw(); });
      input.addEventListener("input", function () { st.q = input.value.trim(); st.chosen = null; draw(); });
    }
    list.addEventListener("click", function (e) {
      var b = e.target.closest("[data-id]"); if (!b) return;
      var again = st.chosen === b.getAttribute("data-id");
      st.chosen = b.getAttribute("data-id"); draw();
      if (again) cfg.onAction(chosenItem(), st.tab); // 같은 항목을 한 번 더 누르면 바로 실행
    });
    action.addEventListener("click", function () { cfg.onAction(chosenItem(), st.tab); });
    draw();
    // 고른 항목이 보이도록
    setTimeout(function () { var c = $(".sample-list .chosen", el); if (c && st.chosen && (cfg.chosen || cfg.q)) K.scrollWithin($(".sample-screen", el), c); }, 50);
    return { draw: draw, state: st, setTab: function (i) { var b = $('.sample-tabs [data-tab="' + i + '"]', el); b && b.click(); } };
  }

  /* 모달 안에서 1초마다 갱신 (모달을 닫으면 멈춤) */
  function liveModal(label, renderBody) {
    var t = null;
    var body = K.modal(label, renderBody(), { onClose: function () { clearInterval(t); } });
    t = setInterval(function () { if (!body.isConnected) return clearInterval(t); renderBody(body); }, 1000);
    body._refresh = function () { renderBody(body); };
    return body;
  }
  function srcNote(real) {
    return '<p class="k-note">' + (real ? T("이름·주소: 한국관광공사 관광정보 등록 자료 · 영업 여부와 세부 정보는 바뀔 수 있어요.") : T("시연용 예시 정보입니다.")) + "</p>";
  }
  /* 외국어일 때 원래 한글 이름도 함께 (기사님·가게에 보여주기 좋게) */
  function koLine(name) { return L.lang === "ko" || !name ? "" : '<p class="k-sub k-ko-name">' + esc(T("한글 표기")) + ": <b>" + esc(name) + "</b></p>"; }

  /* ───────── 주차장 ───────── */
  var favParking = {};
  var parkingSim = {}; D.parking.forEach(function (p) { parkingSim[p.id] = p.free; });
  function lot(id) { return D.parking.filter(function (p) { return p.id === id; })[0]; }
  function freeOf(id) { return parkingSim[id]; }
  setInterval(function () {
    D.parking.forEach(function (p) {
      var d = Math.round((Math.random() - .5) * Math.max(4, p.total * .02));
      parkingSim[p.id] = Math.max(0, Math.min(p.total, parkingSim[p.id] + d));
    });
  }, 9000);
  function parkBadge(p) {
    var f = freeOf(p.id), r = f / p.total;
    return f === 0 ? [T("만차"), "full"] : r < 0.12 ? [T("혼잡"), "warn"] : [T("여유"), ""];
  }
  K.screens.parking = {
    render: function (el, prm) {
      var near = prm.near ? K.place(prm.near) : null;
      var s = Sample(el, {
        hero: "assets/parking.jpg", alt: T("주차장 안내 이미지"), switcher: "parking", tabs: [T("전체"), T("지도 주변"), T("즐겨찾기")], tab: near ? 1 : 0, chosen: prm.chosen,
        search: T("주차장·관광지 이름으로 찾기"),
        items: function (tab) {
          var list = D.parking.slice();
          list.sort(function (a, b) { return a.dist - b.dist; });
          if (tab === 1) list = list.filter(function (p) { return near ? p.near === near.no || p.dist <= 1.5 : p.dist <= 2.2; })
            .sort(function (a, b) { return (near ? (b.near === near.no) - (a.near === near.no) : 0) || a.dist - b.dist; });
          if (tab === 2) list = list.filter(function (p) { return favParking[p.id]; });
          return list.map(function (p) {
            var bd = parkBadge(p);
            return { id: p.id, icon: "🅿️", title: p.name, badge: bd[0], badgeCls: bd[1], keys: pname(p.near) + " " + ko(p, "name"),
              sub: T("빈자리 {0} / {1}면", freeOf(p.id), p.total) + " · " + p.dist + "km" + (p.near ? " · " + T("{0} 인근", pname(p.near)) : "") + (favParking[p.id] ? " · ★" : "") };
          });
        },
        empty: function (tab) { return tab === 2 ? T("즐겨찾기한 주차장이 없어요. ‘주차장 위치 보기’에서 ☆를 눌러 추가하세요.") : T("주변 주차장이 없어요."); },
        actionLabel: function () { return T("주차장 위치 보기 →"); },
        message: function (tab, it) {
          if (tab === 1 && near) return T("{0} 근처 주차장을 가까운 순으로 보여드려요.", near.name);
          if (!it) return "";
          var p = lot(it.id); return T("{0} · 지금 빈자리 {1}면 · {2} · 빈자리 수는 시연용 예시", p.name, freeOf(p.id), p.fee);
        },
        onAction: function (it) { if (it) parkingDetail(lot(it.id), s); }
      });
      K.every(9000, function () { s.draw(); });
    }
  };
  function parkingDetail(p, s) {
    var pl = p.near ? K.place(p.near) : null;
    function big(f, bd) { return f + "<small> " + esc(T("/ {0}면 빈자리 · {1}", p.total, bd[0])) + "</small>"; }
    liveModal(T("주차장"), function (body) {
      var f = freeOf(p.id), bd = parkBadge(p), pct = Math.round(f / p.total * 100);
      if (body) {
        var bn = $(".k-bignum", body), bar = $(".k-bar", body);
        if (bn) bn.innerHTML = big(f, bd);
        if (bar) { bar.className = "k-bar " + bd[1]; bar.firstChild.style.width = pct + "%"; }
        return;
      }
      return "<h2>" + esc(p.name) + '</h2><p class="k-sub">' + (pl ? esc(T("{0} 인근", pl.name)) + " · " : "") + esc(T("키오스크에서 약 {0}km", p.dist)) + "</p>" + koLine(ko(p, "name")) +
        '<div class="k-bignum">' + big(f, bd) + "</div>" +
        '<div class="k-bar ' + bd[1] + '"><i style="width:' + pct + '%"></i></div>' +
        '<dl class="k-meta"><dt>' + T("요금") + "</dt><dd>" + esc(p.fee) + "</dd><dt>" + T("운영") + "</dt><dd>" + esc(p.hours) + " " + T("(예시)") + "</dd>" + (pl ? "<dt>" + T("가까운 곳") + "</dt><dd>" + esc(pl.no + ". " + pl.name) + "</dd>" : "") + "</dl>" +
        K.qrBlock(K.MAP(p.map), T("휴대폰으로 길안내"), T("QR을 찍으면 휴대폰 지도에서 주차장 위치를 찾아 길안내를 받을 수 있어요.")) +
        '<div class="k-actions"><button data-a="fav">' + (favParking[p.id] ? T("★ 즐겨찾기 해제") : T("☆ 즐겨찾기 추가")) + "</button>" + (pl ? '<button data-a="place" class="k-primary">' + esc(T("{0} 보기", pl.name)) + "</button>" : "") + "</div>" +
        '<p class="k-note">' + (p.confirmed ? T("주차장 이름은 여수시 자료에서 확인했어요. ") : T("주차장 이름은 위치 참고용 예시예요. ")) + T("면수·요금·빈자리 수는 시연용 예시입니다.") + "</p>";
    });
    $(".k-actions", $("#modalBody")).addEventListener("click", function (e) {
      var a = e.target.closest("[data-a]"); if (!a) return;
      if (a.getAttribute("data-a") === "fav") {
        favParking[p.id] = !favParking[p.id]; a.textContent = favParking[p.id] ? T("★ 즐겨찾기 해제") : T("☆ 즐겨찾기 추가");
        K.toast(favParking[p.id] ? T("즐겨찾기에 추가했어요") : T("즐겨찾기에서 뺐어요")); s.draw();
      } else K.go("places", { no: pl.no });
    });
  }
  window.addEventListener("kiosk:screen", function (e) { if (e.detail.to === "home") favParking = {}; });

  /* ───────── 버스 ───────── */
  function route(no) { return D.busRoutes.filter(function (r) { return r.no === no; })[0]; }
  function kioskStop() { return D.busStops.filter(function (s) { return s.name === C.kioskStopName; })[0] || D.busStops[0]; }
  function stopLabel(name) { return L.stop(name); }
  function routeName(r) { return (r.fromLabel || r.from) + " → " + (r.toLabel || r.to); }
  function routeNo(no) { return T("{0}번", no); }
  var busSim = {}; // "stop|route" → 남은 초 (시연용)
  function eta(stop, r) {
    var k = stop.id + "|" + r.no;
    if (busSim[k] == null) busSim[k] = 30 + Math.floor(Math.random() * r.interval * 60);
    return busSim[k];
  }
  setInterval(function () {
    Object.keys(busSim).forEach(function (k) {
      busSim[k] -= 1;
      if (busSim[k] < 0) { var r = route(k.split("|")[1]); busSim[k] = (r ? r.interval : 20) * 60 + Math.floor(Math.random() * 120); }
    });
  }, 1000);
  function fmtEta(sec) { return sec <= 60 ? T("곧 도착") : L.mmss(sec); }
  function nextAt(stop) {
    return stop.routes.map(route).filter(Boolean).map(function (r) { return { r: r, s: eta(stop, r) }; }).sort(function (a, b) { return a.s - b.s; });
  }
  var realBus = null; // TAGO 실시간 (설정 시)
  function loadRealBus() {
    var b = C.bus; if (!(b.serviceKey && b.cityCode && b.nodeId)) return;
    var url = b.endpoint + "?serviceKey=" + encodeURIComponent(b.serviceKey) + "&cityCode=" + encodeURIComponent(b.cityCode) + "&nodeId=" + encodeURIComponent(b.nodeId) + "&numOfRows=30&pageNo=1&_type=json";
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var it = (((j || {}).response || {}).body || {}).items; it = it && it.item ? (Array.isArray(it.item) ? it.item : [it.item]) : [];
      realBus = { t: Date.now(), list: it.map(function (x) { return { no: String(x.routeno), sec: +x.arrtime || 0, prev: x.arrprevstationcnt }; }).sort(function (a, b) { return a.sec - b.sec; }) };
    }).catch(function () { realBus = null; });
  }
  function sortRoutes(a, b) { return (!!b.tour - !!a.tour) || (parseFloat(a.no) - parseFloat(b.no)) || a.no.localeCompare(b.no); }

  K.screens.bus = {
    render: function (el, prm) {
      var pl = prm.place ? K.place(prm.place) : null, home = kioskStop();
      loadRealBus(); K.every(30000, loadRealBus);
      var s = Sample(el, {
        hero: "assets/bus.jpg", alt: T("버스 안내 이미지"), switcher: "bus", tabs: [T("주변 정류장"), T("노선 찾기"), T("이용 안내")], tab: prm.tab || (pl ? 1 : 0), chosen: prm.chosen,
        search: T("정류장·노선 번호·관광지로 찾기"),
        items: function (tab) {
          if (tab === 0) {
            var stops = D.busStops.slice().sort(function (a, b) { return (b === home) - (a === home); });
            if (pl) stops.sort(function (a, b) { return (b.near.indexOf(pl.no) >= 0) - (a.near.indexOf(pl.no) >= 0); });
            return stops.map(function (st) {
              var n = nextAt(st)[0], live = st === home && realBus && realBus.list.length;
              return { id: st.id, icon: "🚏", title: stopLabel(st.name) + (st === home ? " " + T("(이 키오스크 앞)") : ""), badge: live ? T("실시간") : (n && n.s <= 60 ? T("곧 도착") : ""), badgeCls: live ? "blue" : "warn",
                keys: st.routes.join(" ") + " " + st.near.map(pname).join(" ") + " " + st.name,
                sub: (st.areaLabel || st.area) + " · " + T("{0}개 노선", st.routes.length) + (st.near.length ? " · " + st.near.map(pname).slice(0, 2).join("·") : "") + (n ? " · " + T("다음") + " " + (live ? routeNo(realBus.list[0].no) + " " + fmtEta(realBus.list[0].sec) : routeNo(n.r.no) + " " + fmtEta(n.s)) : "") };
            });
          }
          if (tab === 1) {
            var rs = D.busRoutes.slice().sort(sortRoutes);
            if (pl) rs.sort(function (a, b) { return (b.places.indexOf(pl.no) >= 0) - (a.places.indexOf(pl.no) >= 0); });
            return rs.map(function (r) {
              return { id: r.id, icon: r.kind === "마을" ? "🚐" : "🚍", title: routeNo(r.no) + " · " + routeName(r),
                badge: pl && r.places.indexOf(pl.no) >= 0 ? T("추천") : (r.tour ? T("관광") : ""), badgeCls: "blue",
                keys: r.places.map(pname).join(" ") + " " + r.atStops.join(" ") + " " + (r.stops || []).join(" ") + " " + r.from + " " + r.to,
                sub: (r.tour ? r.tourLabel + " · " : "") + kind(r) + (r.places.length ? " · " + r.places.map(pname).slice(0, 3).join("·") : "") };
            });
          }
          return D.busGuide.map(function (g, i) { return { id: "g" + i, icon: g.icon, title: g.title, sub: g.text }; });
        },
        actionLabel: function (tab) { return tab === 2 ? T("실시간 도착 정보 보기 →") : tab === 0 ? T("도착 정보 보기 →") : T("노선 안내 보기 →"); },
        message: function (tab, it) {
          if (tab === 1 && pl) return T("{0}에 가는 노선을 ‘추천’으로 먼저 보여드려요.", pl.name);
          if (tab === 2 && it) return D.busGuide[+it.id.slice(1)].text;
          if (tab === 1) return T("노선·정류장 이름은 국토교통부 TAGO 여수시 버스 정보 기준이에요. 도착 시간은 시연용 예시입니다.");
          return realBus ? T("{0} 정류장은 실시간 정보입니다.", stopLabel(home.name)) : T("정류장·노선은 실제 자료, 도착 시간은 시연용 예시입니다.");
        },
        onAction: function (it, tab) {
          if (tab === 2) return s.setTab(0);
          if (!it) return;
          if (tab === 0) stopBoard(D.busStops.filter(function (x) { return x.id === it.id; })[0]);
          else routeDetail(D.busRoutes.filter(function (x) { return x.id === it.id; })[0]);
        }
      });
      K.every(5000, function () { s.draw(); });
    }
  };
  function stopBoard(stop) {
    var showAll = false;
    var body = liveModal(T("버스 도착 정보"), function (b) {
      var rows = nextAt(stop), live = stop === kioskStop() && realBus && realBus.list.length;
      var list = live ? realBus.list.map(function (x) { return { no: x.no, sec: Math.max(0, x.sec - Math.floor((Date.now() - realBus.t) / 1000)), r: route(x.no), prev: x.prev }; })
        : rows.map(function (x) { return { no: x.r.no, sec: x.s, r: x.r }; });
      var shown = showAll ? list : list.slice(0, 8);
      var board = shown.map(function (x) {
        var r = x.r;
        return '<button data-r="' + (r ? r.id : "") + '"><span class="k-route-no" style="background:' + (r ? r.color : "#135ca5") + '">' + esc(x.no) + "</span><div><b>" + esc(r ? routeName(r) : routeNo(x.no)) + "</b><small>" + esc(r ? (r.tour ? r.tourLabel : kind(r)) + " · " + T("눌러서 노선 보기") : (x.prev != null ? T("{0}정류장 전", x.prev) : "")) + '</small></div><span class="k-eta' + (x.sec <= 60 ? " soon" : "") + '">' + fmtEta(x.sec) + "</span></button>";
      }).join("") + (list.length > 8 && !showAll ? '<button data-more="1" class="k-more">' + T("노선 {0}개 더 보기", list.length - 8) + "</button>" : "");
      if (b) { var bd = $(".k-board", b); if (bd) bd.innerHTML = board; return; }
      return "<h2>🚏 " + esc(stopLabel(stop.name)) + '</h2><p class="k-sub">' + esc(stop.areaLabel || stop.area) + " · " + T("{0}개 노선 정차", stop.routes.length) + (stop.near.length ? " · " + T("가까운 곳: {0}", esc(stop.near.map(pname).join(", "))) : "") + (live ? " · " + T("실시간") : "") + "</p>" + koLine(stop.name) +
        '<div class="k-board">' + board + "</div>" +
        K.qrBlock(K.MAP("여수 " + stop.name + " 버스정류장"), T("정류장 위치 보기"), T("QR을 찍으면 휴대폰 지도에 정류장 위치가 열려요.")) +
        '<p class="k-note">' + (live ? T("국토교통부 버스도착정보 기준입니다.") : T("정류장·정차 노선은 국토교통부 TAGO 자료이고, 도착 시간은 시연용 예시입니다.")) + "</p>";
    });
    body.addEventListener("click", function (e) {
      if (e.target.closest("[data-more]")) { showAll = true; body._refresh(); return; }
      var b = e.target.closest("[data-r]"); if (!b || !b.getAttribute("data-r")) return;
      routeDetail(D.busRoutes.filter(function (x) { return x.id === b.getAttribute("data-r"); })[0]);
    });
  }
  function routeDetail(r) {
    var home = kioskStop(), here = r.stops ? r.stops.indexOf(home.name) : -1;
    liveModal(T("버스 노선"), function (body) {
      var sec = eta(home, r), line = "";
      if (r.stops) {
        var pos = here >= 0 ? Math.max(0, here - Math.min(here, Math.ceil(sec / 150))) : -1;
        line = r.stops.map(function (s, i) {
          var tourist = D.busStops.some(function (b) { return b.name === s && b.near.length; });
          return '<div class="' + (i === here ? "here" : "") + (tourist ? " k-tour" : "") + '">' + esc(stopLabel(s)) + (i === here ? " " + T("(현재 위치)") : "") + (i === pos && sec > 60 ? "<em>" + T("🚌 버스") + "</em>" : "") + (i === here && sec <= 60 ? "<em>" + T("🚌 곧 도착") + "</em>" : "") + "</div>";
        }).join("");
      }
      if (body) { var l = $(".k-line", body); if (l && line) l.innerHTML = line; var e2 = $(".k-eta", body); if (e2) { e2.textContent = fmtEta(sec); e2.className = "k-eta" + (sec <= 60 ? " soon" : ""); } return; }
      var stopsAtRoute = r.atStops.length ? "<h3>" + T("관광지 주변 정차 정류장") + '</h3><div class="k-chips">' + r.atStops.map(function (s) { return '<button data-stop="' + esc(s) + '">🚏 ' + esc(stopLabel(s)) + "</button>"; }).join("") + "</div>" : "";
      return '<h2><span class="k-route-no" style="background:' + r.color + '">' + esc(r.no) + "</span> " + esc(routeName(r)) + "</h2>" +
        '<p class="k-sub">' + esc(kind(r)) + (r.tour ? " · " + esc(r.tourLabel) : "") + (here >= 0 || r.atStops.indexOf(home.name) >= 0 ? " · " + esc(T("{0} 도착까지", stopLabel(home.name))) + ' <span class="k-eta">' + fmtEta(sec) + "</span>" : "") + "</p>" +
        (r.stops ? "<h3>" + T("전체 정류장 ({0}곳)", r.stops.length) + '</h3><div class="k-line" style="--route:' + r.color + '">' + line + "</div>" :
          '<div class="k-line" style="--route:' + r.color + '"><div>' + esc(r.fromLabel || r.from) + " " + T("(기점)") + "</div>" + r.atStops.map(function (s) { return "<div>… " + esc(stopLabel(s)) + "</div>"; }).join("") + "<div>" + esc(r.toLabel || r.to) + " " + T("(종점)") + '</div></div><p class="k-note">' + T("가운데 정류장은 관광지 주변 정류장만 보여드려요. 전체 정류장 순서는 QR로 확인하세요.") + "</p>") +
        stopsAtRoute +
        (r.places.length ? "<h3>" + T("이 버스로 갈 수 있는 관광지") + "</h3><div class=\"k-chips\">" + r.places.map(function (n) { return '<button data-place="' + n + '">' + n + ". " + esc(pname(n)) + "</button>"; }).join("") + "</div>" : "") +
        K.qrBlock(K.WEB("여수 " + r.no + "번 버스 노선"), T("휴대폰으로 노선 보기"), T("QR을 찍으면 이 노선의 정류장·시간표를 검색해 보여드려요.")) +
        '<p class="k-note">' + T("노선·정류장: 국토교통부 TAGO 여수시 버스 정보. 버스 위치·도착 시간은 시연용 예시입니다.") + "</p>";
    });
    $("#modalBody").addEventListener("click", function (e) {
      var b = e.target.closest("[data-place]"); if (b) return K.go("places", { no: +b.getAttribute("data-place") });
      var s = e.target.closest("[data-stop]"); if (s) { var st = D.busStops.filter(function (x) { return x.name === s.getAttribute("data-stop"); })[0]; if (st) stopBoard(st); }
    });
  }

  /* ───────── 택시 ───────── */
  function fare(km) { return 4300 + Math.max(0, Math.ceil((km - 2) * 1000 / 132)) * 100; } // 예시 요금
  function dests() {
    return D.places.map(function (p) { return { id: "p" + p.no, name: p.name, ko: ko(p, "name"), area: p.area, areaKo: ko(p, "area"), km: D.taxiDistance[p.no], map: p.map, place: p.no }; })
      .concat(D.taxiExtra.map(function (t) { return { id: t.id, name: t.name, ko: ko(t, "name"), area: t.area, areaKo: ko(t, "area"), km: t.km, map: "여수 " + ko(t, "name") }; }));
  }
  function dest(id) { return dests().filter(function (d) { return d.id === id; })[0]; }
  K.screens.taxi = {
    render: function (el, prm) {
      Sample(el, {
        hero: "assets/taxi.jpg", alt: T("택시 안내 이미지"), switcher: "taxi", tabs: [T("택시 호출"), T("목적지 보여주기"), T("요금 안내")], tab: prm.tab || 0,
        chosen: prm.dest ? "p" + prm.dest : null, search: T("목적지·승강장 이름으로 찾기"),
        items: function (tab) {
          if (tab === 0) {
            return D.taxiTypes.map(function (t) { return { id: t.id, icon: t.icon, title: t.name, sub: t.desc + " · " + T("기본요금 {0} (예시)", K.won(t.base)) }; })
              .concat(D.taxiStands.map(function (t) { return { id: t.id, icon: "🚏", title: t.name, sub: T("택시 승강장") + " · " + t.where + (t.near ? " · " + pname(t.near) : ""), keys: pname(t.near) + " " + ko(t, "name") }; }));
          }
          var list = dests();
          if (tab === 2) list.sort(function (a, b) { return a.km - b.km; });
          return list.map(function (d) {
            return { id: d.id, icon: d.place ? "📍" : "🏁", title: (d.place ? d.place + ". " : "") + d.name, keys: d.area + " " + d.ko,
              sub: tab === 1 ? d.area + " · " + T("약 {0}km", d.km) : T("약 {0}km", d.km) + " · " + T("예상 {0} (예시)", K.won(fare(d.km))) };
          });
        },
        actionLabel: function (tab, it) { return tab === 0 ? (it && /^ts/.test(it.id) ? T("승강장 위치 보기 →") : T("택시 호출하기 →")) : tab === 1 ? T("기사님께 보여주기 →") : T("이 목적지로 호출 →"); },
        message: function (tab) {
          if (tab === 0) return T("탑승 위치: {0} 앞 · 호출은 시연용 체험입니다. 승강장 위치는 예시예요.", kioskName());
          if (tab === 1) return T("목적지를 크게 띄워 드려요. 휴대폰으로 찍어 기사님께 보여주세요.");
          return T("예상 요금은 기본 4,300원(2km)·132m당 100원으로 계산한 예시입니다. 실제 요금은 미터기를 따릅니다.");
        },
        onAction: function (it, tab) {
          if (!it) return;
          if (tab === 0) {
            if (/^ts/.test(it.id)) return standDetail(D.taxiStands.filter(function (t) { return t.id === it.id; })[0]);
            return dispatch(D.taxiTypes.filter(function (t) { return t.id === it.id; })[0], prm.dest ? dest("p" + prm.dest) : null);
          }
          if (tab === 1) return showDriver(dest(it.id));
          dispatch(D.taxiTypes[0], dest(it.id));
        }
      });
    }
  };
  function standDetail(t) {
    var kn = ko(t, "name");
    K.modal(T("택시 승강장"), "<h2>🚏 " + esc(t.name) + '</h2><p class="k-sub">' + esc(t.where) + (t.near ? " · " + esc(T("{0} 근처", pname(t.near))) : "") + "</p>" + koLine(kn.replace(/ \(예시\)$/, "")) +
      K.qrBlock(K.MAP("여수 " + kn.replace(/ 택시 승강장.*$/, "") + " 택시승강장"), T("승강장 위치 찾기"), T("QR을 찍으면 휴대폰 지도에서 주변 택시 승강장을 찾아볼 수 있어요.")) +
      '<p class="k-note">' + T("승강장 위치는 시연용 예시입니다. 현장 안내를 따라 주세요.") + "</p>");
  }
  /* 기사님께 보여주기: 기사님이 읽을 수 있게 한국어를 크게, 외국어는 작게 함께 */
  function showDriver(d) {
    var kn = d.ko || d.name, foreign = L.lang !== "ko";
    var body = K.modal(T("기사님께 보여주기"), '<p class="k-center k-sub">기사님, 여기로 가주세요' + (foreign ? " · " + esc(T("기사님께 이 화면을 보여주세요")) : "") + '</p><div class="k-big">' + esc(kn) + "</div>" +
      (foreign && d.name !== kn ? '<p class="k-center k-big-sub">' + esc(d.name) + "</p>" : "") +
      '<p class="k-center k-sub">전라남도 여수시 · ' + esc(d.areaKo || L.ko(d, "area") || d.area) + " · 출발: " + esc(C.kioskLocationName) + "</p>" +
      K.qrBlock(K.MAP(d.map), T("휴대폰에 목적지 저장"), T("QR을 찍어 기사님께 지도 화면을 보여줄 수도 있어요.")) +
      '<div class="k-actions"><button class="k-yellow" data-a="call">' + T("🚕 이 목적지로 택시 호출") + "</button></div>");
    $("[data-a=call]", body).addEventListener("click", function () { dispatch(D.taxiTypes[0], d); });
    B.speak(foreign ? T("{0}(으)로 가주세요", d.name) : kn + "(으)로 가주세요");
  }
  function dispatch(type, d) {
    var timers = [];
    function clear() { timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; }
    function step1() {
      var body = K.modal(T("택시 호출"), "<h2>" + type.icon + " " + esc(type.name) + '</h2><p class="k-sub">' + esc(T("탑승 위치: {0} 앞", kioskName())) + "</p>" +
        "<h3>" + T("목적지를 고르세요 (선택)") + "</h3><div class=\"k-chips\">" + dests().map(function (x) { return '<button data-d="' + x.id + '"' + (d && d.id === x.id ? ' class="on"' : "") + ">" + esc(x.name) + "</button>"; }).join("") + "</div>" +
        '<div class="k-actions"><button class="k-yellow" data-a="go">' + T("호출하기") + '</button></div><p class="k-note">' + T("시연용 호출 체험입니다. 실제 택시는 오지 않아요.") + "</p>", { onClose: clear });
      $(".k-chips", body).addEventListener("click", function (e) {
        var b = e.target.closest("[data-d]"); if (!b) return;
        var on = b.classList.contains("on");
        $$(".k-chips button", body).forEach(function (x) { x.classList.remove("on"); });
        if (!on) { b.classList.add("on"); d = dest(b.getAttribute("data-d")); } else d = null;
      });
      $("[data-a=go]", body).addEventListener("click", step2);
    }
    function step2() {
      var body = $("#modalBody");
      body.innerHTML = '<div class="k-dispatch"><div class="k-spinner"></div><h2>' + T("가까운 택시를 찾고 있어요") + '</h2><p class="k-sub">' + esc(type.name) + (d ? " · " + esc(T("{0}(으)로", d.name)) : "") + "</p></div>" +
        '<div class="k-actions"><button class="k-danger" data-a="cancel">' + T("호출 취소") + "</button></div>";
      $("[data-a=cancel]", body).addEventListener("click", function () { clear(); K.closeModal(); K.toast(T("호출을 취소했어요")); });
      timers.push(setTimeout(step3, 2600 + Math.random() * 1500));
    }
    function step3() {
      var body = $("#modalBody"); if (!body.isConnected || $("#modal").hidden) return;
      var no = "전남 " + (30 + Math.floor(Math.random() * 60)) + "바 " + (1000 + Math.floor(Math.random() * 9000));
      var left = 120 + Math.floor(Math.random() * 180);
      body.innerHTML = '<div class="k-dispatch"><h2>' + T("배차 완료!") + '</h2><div class="k-car">' + no + '</div><p class="k-sub">' + esc(type.name) + " · " + T("시연용 배차 정보") + "</p>" +
        '<div class="k-bignum" id="taxiEta"></div><p>' + esc(T("{0} 앞에서 기다려 주세요.", kioskName())) + (d ? "<br>" + T("목적지") + ": <b>" + esc(d.name) + "</b> · " + esc(T("예상 요금 {0} (예시)", K.won(fare(d.km)))) : "") + "</p></div>" +
        '<div class="k-actions"><button class="k-danger" data-a="cancel">' + T("호출 취소") + "</button>" + (d ? '<button data-a="show">' + T("목적지 크게 보기") + "</button>" : "") + '<button class="k-primary" data-a="ok">' + T("확인") + "</button></div>";
      B.speak(T("택시가 배차되었어요. 차량 번호 {0}.", no));
      function draw() {
        var e = $("#taxiEta"); if (!e) return;
        e.innerHTML = left > 0 ? L.mmss(left) + "<small> " + T("후 도착") + "</small>" : T("도착!") + "<small> " + T("택시가 도착했어요") + "</small>";
        if (left === 0) B.speak(T("택시가 도착했어요."));
        left = Math.max(0, left - 1);
      }
      draw(); timers.push(setInterval(draw, 1000));
      body.addEventListener("click", function (e) {
        var a = e.target.closest("[data-a]"); if (!a) return; a = a.getAttribute("data-a");
        if (a === "cancel") { clear(); K.closeModal(); K.toast(T("호출을 취소했어요")); }
        if (a === "ok") { clear(); K.closeModal(); }
        if (a === "show") { clear(); showDriver(d); }
      });
    }
    step1();
  }

  /* ───────── 맛집·카페 ───────── */
  K.screens.food = {
    render: function (el, prm) {
      Sample(el, {
        hero: "assets/food.jpg", alt: T("맛집·카페 안내 이미지"), tabs: [T("전체"), T("음식점"), T("카페"), T("🛏️ 숙소")], tabGo: { 3: "stay" }, chosen: prm.chosen, q: prm.q,
        search: T("가게 이름·음식·동네로 찾기 (예: 게장, 돌산)"),
        items: function (tab) {
          return D.food.filter(function (f) { return tab === 0 || f.type === (tab === 1 ? "음식점" : "카페"); }).map(function (f) {
            return { id: f.id, icon: f.type === "카페" ? "☕" : "🍽️", title: f.name, keys: f.addr + " " + pname(f.near) + " " + ko(f, "name") + " " + ko(f, "menu") + " " + ko(f, "area"),
              sub: L.term(f.type) + (f.menu ? " · " + f.menu : "") + " · " + f.area + (f.near ? " · " + T("{0} 근처", pname(f.near)) : "") };
          });
        },
        actionLabel: function () { return T("상세 정보 보기 →"); },
        message: function (tab, it) { if (!it) return ""; var f = D.food.filter(function (x) { return x.id === it.id; })[0]; return f.name + " · " + f.addr; },
        onAction: function (it) {
          if (!it) return;
          var f = D.food.filter(function (x) { return x.id === it.id; })[0], pl = f.near ? K.place(f.near) : null;
          var body = K.modal(T("맛집·카페"), "<h2>" + (f.type === "카페" ? "☕ " : "🍽️ ") + esc(f.name) + '</h2><p class="k-sub">' + esc(L.term(f.type) + " · " + f.area + (pl ? " · " + T("{0} 근처", pl.name) : "")) + "</p>" + koLine(ko(f, "name")) +
            '<dl class="k-meta"><dt>' + T("주소") + "</dt><dd>" + esc(f.addr) + "</dd><dt>" + T("대표 음식") + "</dt><dd>" + esc(f.menu || T("매장에 문의해 주세요")) + "</dd><dt>" + T("영업 시간") + "</dt><dd>" + esc(f.hours || T("매장에 문의해 주세요")) + "</dd><dt>" + T("전화") + "</dt><dd>" + esc(f.phone || T("지도 앱에서 확인")) + "</dd></dl>" +
            K.qrBlock(K.MAP(f.map), T("휴대폰으로 가게 찾기"), T("QR을 찍으면 휴대폰 지도에서 이 가게를 찾아 길안내를 받을 수 있어요.")) +
            '<div class="k-actions">' + (pl ? '<button data-a="place">' + esc(T("{0} 보기", pl.name)) + "</button>" : "") + '<button data-a="parking">' + T("🅿️ 주변 주차장") + '</button><button class="k-yellow" data-a="taxi">' + T("🚕 택시로 가기") + "</button></div>" + srcNote(f.real));
          body.addEventListener("click", function (e) {
            var a = e.target.closest("[data-a]"); if (!a) return; a = a.getAttribute("data-a");
            if (a === "place") K.go("places", { no: pl.no });
            if (a === "parking") K.go("parking", pl ? { near: pl.no } : {});
            if (a === "taxi") { if (pl) K.go("taxi", { tab: 1, dest: pl.no }); else showDriver({ name: f.name, ko: ko(f, "name"), area: f.area, areaKo: ko(f, "area"), map: f.map }); }
          });
        }
      });
    }
  };

  /* ───────── 숙소 예약 (예약 화면 체험) ───────── */
  K.screens.stay = {
    render: function (el, prm) {
      Sample(el, {
        hero: "assets/stay.jpg", alt: T("숙소 예약 안내 이미지"), tabs: [T("전체"), T("호텔"), T("펜션"), T("🍽️ 맛집·카페")], tabGo: { 3: "food" }, chosen: prm.chosen, q: prm.q,
        search: T("숙소 이름·지역으로 찾기 (예: 돌산, 엑스포)"),
        items: function (tab) {
          return D.stay.filter(function (s) { return tab === 0 || s.group === (tab === 1 ? "호텔" : "펜션"); }).map(function (s) {
            var min = Math.min.apply(null, s.rooms.map(function (r) { return r.price; }));
            return { id: s.id, icon: s.type === "캠핑" ? "⛺" : "🛏️", title: s.name, badge: s.grade, badgeCls: "blue", keys: s.type + " " + pname(s.near) + " " + ko(s, "name") + " " + ko(s, "area"),
              sub: L.term(s.type) + " · " + s.area + " · " + T("1박 {0}~ (예시)", K.won(min)) };
          });
        },
        actionLabel: function () { return T("예약 화면 체험 →"); },
        message: function () { return T("숙소 이름은 실제, 객실·요금은 시연용 예시입니다. 실제 예약은 마지막 QR로 휴대폰에서 이어서 하세요."); },
        onAction: function (it) { if (it) booking(D.stay.filter(function (s) { return s.id === it.id; })[0]); }
      });
    }
  };
  function booking(stay) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var st = { step: 1, date: 0, nights: 1, guests: 2, room: null, phone: "010" };
    function day(i) { var d = new Date(today); d.setDate(d.getDate() + i); return d; }
    function fmt(d) { return L.date(d); }
    function nights(n) { return T(stay.type === "캠핑" ? "{0}박(사이트)" : "{0}박", n); }
    function steps() { return '<div class="k-steps">' + [T("날짜·인원"), T("객실"), T("연락처"), T("확인")].map(function (s, i) { return '<span class="' + (i + 1 === st.step ? "on" : i + 1 < st.step ? "done" : "") + '">' + (i + 1) + ". " + s + "</span>"; }).join("") + "</div>"; }
    function phoneFmt(p) { return p.replace(/^(\d{3})(\d{0,4})(\d{0,4}).*/, function (m, a, b, c) { return a + (b ? "-" + b : "") + (c ? "-" + c : ""); }); }
    var KEY_DEL = "⌫", KEY_CLR = "C";
    function render() {
      var body = $("#modalBody"), h = "<h2>" + esc(stay.name) + '</h2><p class="k-sub">' + esc(L.term(stay.type) + " · " + stay.area) + "</p>" + (st.step < 5 ? steps() : "");
      if (st.step === 1) {
        h += "<h3>" + T("체크인 날짜") + "</h3><div class=\"k-dates\">" + Array.from({ length: 14 }, function (_, i) {
          var d = day(i); return '<button data-d="' + i + '" class="' + (i === st.date ? "on " : "") + (d.getDay() === 0 ? "sun" : d.getDay() === 6 ? "sat" : "") + '">' + d.getDate() + "<small>" + (i === 0 ? T("오늘") : L.weekday(d)) + "</small></button>";
        }).join("") + "</div>" +
          '<div class="k-stepper"><span>' + T("숙박") + '</span><div><button data-n="-1">−</button><b>' + T("{0}박", st.nights) + '</b><button data-n="1">+</button></div></div>' +
          '<div class="k-stepper"><span>' + T("인원") + '</span><div><button data-g="-1">−</button><b>' + T("{0}명", st.guests) + '</b><button data-g="1">+</button></div></div>' +
          '<p class="k-sub" style="margin-top:calc(var(--cq)*1.6)">' + fmt(day(st.date)) + " ~ " + fmt(day(st.date + st.nights)) + "</p>" +
          '<div class="k-actions"><button class="k-primary" data-a="next">' + T("객실 고르기 →") + "</button></div>";
      } else if (st.step === 2) {
        var rooms = stay.rooms.filter(function (r) { return r.max >= st.guests; });
        h += "<h3>" + T("{0}명 · {1}박 가능한 객실 (예시)", st.guests, st.nights) + "</h3>" + (rooms.length ? '<div class="k-rooms">' + rooms.map(function (r) {
          return '<button data-room="' + esc(r.name) + '" class="' + (st.room === r.name ? "on" : "") + '"><div><b>' + esc(r.name) + "</b><small>" + T("최대 {0}명 · 1박 {1}", r.max, K.won(r.price)) + "</small></div><strong>" + K.won(r.price * st.nights) + "</strong></button>";
        }).join("") + "</div>" : '<div class="sample-empty">' + T("이 인원으로 묵을 수 있는 객실이 없어요. 인원을 줄이거나 다른 숙소를 골라주세요.") + "</div>") +
          '<div class="k-actions"><button data-a="prev">' + T("‹ 이전") + '</button><button class="k-primary" data-a="next"' + (st.room ? "" : " disabled") + ">" + T("연락처 입력 →") + "</button></div>";
      } else if (st.step === 3) {
        h += "<h3>" + T("예약자 휴대폰 번호") + "</h3><div class=\"k-phone\">" + esc(phoneFmt(st.phone)) + '</div><div class="k-keypad">' +
          [1, 2, 3, 4, 5, 6, 7, 8, 9, KEY_DEL, 0, KEY_CLR].map(function (k) { return '<button data-k="' + k + '"' + (isNaN(k) ? ' class="k-fn" aria-label="' + (k === KEY_DEL ? T("지움") : T("전체 지움")) + '"' : "") + ">" + (k === KEY_DEL ? T("지움") : k === KEY_CLR ? T("전체 지움") : k) + "</button>"; }).join("") + "</div>" +
          '<p class="k-note">' + T("시연용: 입력한 번호는 어디에도 저장·전송되지 않아요.") + "</p>" +
          '<div class="k-actions"><button data-a="prev">' + T("‹ 이전") + '</button><button class="k-primary" data-a="next"' + (st.phone.length === 11 ? "" : " disabled") + ">" + T("예약 확인 →") + "</button></div>";
      } else if (st.step === 4) {
        var room = stay.rooms.filter(function (r) { return r.name === st.room; })[0];
        h += '<dl class="k-meta"><dt>' + T("숙소") + "</dt><dd>" + esc(stay.name) + "</dd><dt>" + T("객실") + "</dt><dd>" + esc(room.name) + " " + T("(예시)") + "</dd><dt>" + T("일정") + "</dt><dd>" + fmt(day(st.date)) + " ~ " + fmt(day(st.date + st.nights)) + " · " + nights(st.nights) + "</dd><dt>" + T("인원") + "</dt><dd>" + T("{0}명", st.guests) + "</dd><dt>" + T("연락처") + "</dt><dd>" + esc(phoneFmt(st.phone)) + "</dd></dl>" +
          '<div class="k-total"><span>' + T("결제 예정 금액 (예시)") + "</span><strong>" + K.won(room.price * st.nights) + "</strong></div>" +
          '<div class="k-actions"><button data-a="prev">' + T("‹ 이전") + '</button><button class="k-yellow" data-a="next">' + T("예약 완료 체험") + "</button></div>";
      } else {
        var code = "YS-" + String(Math.floor(100000 + Math.random() * 900000));
        h += '<div class="k-done"><div class="k-check">✓</div><h2>' + T("예약 체험이 끝났어요") + '</h2><div class="k-code">' + code + '</div><p class="k-sub">' + esc(st.room) + " · " + fmt(day(st.date)) + " · " + nights(st.nights) + " · " + T("{0}명", st.guests) + "</p></div>" +
          K.qrBlock(K.WEB(stay.map + " 예약"), T("휴대폰으로 실제 예약 이어하기"), T("QR을 찍으면 이 숙소의 예약 페이지를 검색해 보여드려요. 이 화면의 예약은 시연용이라 실제로 접수되지 않아요.")) +
          '<div class="k-actions"><button data-a="restart">' + T("다른 날짜로 다시") + '</button><button class="k-primary" data-a="close">' + T("닫기") + "</button></div>";
        st.phone = "010";
      }
      body.innerHTML = h; body.scrollTop = 0; K.paintQR(body);
    }
    var body = K.modal(T("숙소 예약 체험"), "");
    body.addEventListener("click", function (e) {
      var t = e.target.closest("button"); if (!t) return;
      if (t.dataset.d != null) st.date = +t.dataset.d;
      else if (t.dataset.n) st.nights = Math.max(1, Math.min(5, st.nights + +t.dataset.n));
      else if (t.dataset.g) { st.guests = Math.max(1, Math.min(6, st.guests + +t.dataset.g)); st.room = null; }
      else if (t.dataset.room) st.room = t.dataset.room;
      else if (t.dataset.k) { var k = t.dataset.k; if (k === KEY_DEL) st.phone = st.phone.slice(0, -1); else if (k === KEY_CLR) st.phone = ""; else if (st.phone.length < 11) st.phone += k; }
      else if (t.dataset.a === "next") { if (t.disabled) return; st.step++; }
      else if (t.dataset.a === "prev") st.step--;
      else if (t.dataset.a === "restart") { st.step = 1; st.room = null; }
      else if (t.dataset.a === "close") return K.closeModal();
      else return;
      render();
    });
    render();
  }

  /* ───────── 교통·주차 (메뉴 고르기) ───────── */
  K.screens.transit = {
    render: function (el) {
      var home = kioskStop(), n = nextAt(home)[0];
      var items = [
        { go: "bus", icon: "🚌", title: T("버스"), sub: T("가까운 정류장 도착 정보 · 관광지 가는 노선 {0}개", D.busRoutes.length), badge: n ? T("다음") + " " + routeNo(n.r.no) + " " + fmtEta(n.s) : "" },
        { go: "taxi", icon: "🚕", title: T("택시"), sub: T("택시 호출 · 기사님께 목적지 보여주기 · 예상 요금"), badge: "" },
        { go: "parking", icon: "🅿️", title: T("주차장"), sub: T("관광지 주변 주차장 {0}곳 · 빈자리 · 길안내", D.parking.length), badge: "" }
      ];
      el.innerHTML = '<section class="sample-screen"><div class="sample-hero k-hero-text"><img alt="" src="assets/bus.jpg"><div><small>TRANSPORT · PARKING</small><h2>' + T("교통 · 주차") + "</h2><p>" + T("버스 · 택시 · 주차장을 골라 주세요") + "</p></div></div>" +
        '<div class="sample-list k-big-list">' + items.map(function (it) {
          return '<button data-go="' + it.go + '"><span>' + it.icon + "</span><div><b>" + esc(it.title) + (it.badge ? '<i class="k-badge warn">' + esc(it.badge) + "</i>" : "") + "</b><small>" + esc(it.sub) + "</small></div><span>›</span></button>";
        }).join("") + '</div><p class="sample-message">' + T("버스 노선·정류장은 국토교통부 자료, 도착 시간·주차 빈자리·택시 호출은 시연용 예시예요.") + "</p></section>";
    }
  };

  /* ───────── 추천 코스 ───────── */
  K.screens.course = {
    render: function (el, prm) {
      var s = Sample(el, {
        hero: "assets/bg-nightsea.jpg", alt: T("추천 코스 이미지"), tabs: [T("전체 코스"), T("가족·실내"), T("야경·사진")], chosen: prm.chosen,
        items: function (tab) {
          var list = D.courses.filter(function (c) { return tab === 0 || (tab === 1 ? /c3|c7/.test(c.id) : /c2|c1|c5/.test(c.id)); }).map(function (c) {
            return { id: c.id, icon: c.icon, title: c.title, sub: c.sub + " · " + c.stops.map(pname).join(" → ") };
          });
          if (tab !== 1) list.push({ id: "photo", icon: "📸", title: T("여행의 마무리, AI 포토존"), sub: T("사진을 찍고 여수 명소 배경과 합성해 휴대폰으로 받아 가세요") });
          return list;
        },
        actionLabel: function (tab, it) { return it && it.id === "photo" ? T("AI 포토존 가기 →") : T("코스 자세히 보기 →"); },
        message: function (tab, it) { var c = it && D.courses.filter(function (x) { return x.id === it.id; })[0]; return c ? c.time + " " + T("(예시)") + " · " + c.desc : T("시간은 대략적인 예시예요. 이동 방법과 날씨에 따라 달라져요."); },
        onAction: function (it) {
          if (!it) return;
          if (it.id === "photo") return K.go("photo");
          courseDetail(D.courses.filter(function (x) { return x.id === it.id; })[0]);
        }
      });
    }
  };
  function courseDetail(c) {
    var body = K.modal(T("추천 코스"), "<h2>" + c.icon + " " + esc(c.title) + '</h2><p class="k-sub">' + esc(c.sub) + " · " + esc(c.time) + " " + T("(예시)") + "</p><p>" + esc(c.desc) + "</p>" +
      '<div class="k-course">' + c.stops.map(function (n, i) {
        var p = K.place(n);
        return '<button data-no="' + n + '"><span class="k-step k-no-' + p.color + '">' + (i + 1) + "</span><div><b>" + esc(p.name) + "</b><small>" + esc(p.area) + " · " + T("지도 {0}번", n) + "</small></div><span>›</span></button>";
      }).join('<i class="k-course-arrow">↓</i>') + "</div>" +
      K.qrBlock(K.MAP(K.place(c.stops[0]).map), T("첫 장소 길안내"), T("QR을 찍으면 휴대폰 지도에서 {0}부터 길안내를 시작할 수 있어요.", K.place(c.stops[0]).name)) +
      '<div class="k-actions"><button data-a="taxi" class="k-yellow">' + T("🚕 첫 장소까지 택시") + '</button><button data-a="bus">' + T("🚌 가는 버스 보기") + '</button><button data-a="photo">' + T("📸 AI 포토존") + "</button></div>");
    body.addEventListener("click", function (e) {
      var b = e.target.closest("[data-no]"); if (b) return K.go("places", { no: +b.getAttribute("data-no") });
      var a = e.target.closest("[data-a]"); if (!a) return; a = a.getAttribute("data-a");
      if (a === "taxi") K.go("taxi", { tab: 1, dest: c.stops[0] });
      if (a === "bus") K.go("bus", { tab: 1, place: c.stops[0] });
      if (a === "photo") K.go("photo");
    });
  }

  K.showDriver = showDriver;
})();

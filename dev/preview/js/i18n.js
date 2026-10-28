/*
 * 다국어 (한국어 · English · 日本語 · 中文)
 * ─────────────────────────────────────────────
 *  T("한국어 문장 {0}", 값)  → 지금 언어의 문장 (사전: js/i18n-text.js)
 *  I18N.name("오동도 입구 주차장") → 고유 이름 번역 (낱말 사전 + 로마자 표기)
 *  I18N.set("en") → 언어 바꾸기 (화면 다시 그림)
 * 사전에 없는 문장은 한국어 그대로 보입니다.
 */
(function () {
  "use strict";
  var LANGS = ["ko", "en", "ja", "zh"], IDX = { en: 0, ja: 1, zh: 2 };
  var I = window.I18N = {
    lang: "ko", langs: LANGS,
    text: {},      // "한국어 원문" : [en, ja, zh]          (i18n-text.js)
    words: {},     // 이름 속 낱말 : [en, ja, zh]           (i18n-data.js)
    terms: {},     // 짧은 용어(분류·메뉴·요금 등) : [en, ja, zh]
    data: {},      // 자료별 번역 (관광지·코스·소식 …)
    miss: {},      // 사전에 없는 문장 (점검용)
    speech: { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN" },
    label: { ko: "한국어", en: "English", ja: "日本語", zh: "中文" }
  };
  var listeners = [];

  function fill(s, args) {
    return String(s).replace(/\{(\d+)\}/g, function (m, i) { var v = args[+i]; return v == null ? "" : v; });
  }
  /* 문장 번역 */
  I.t = function (ko) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (I.lang === "ko" || ko == null || ko === "") return fill(ko == null ? "" : ko, args);
    var e = I.text[ko];
    if (!e || e[IDX[I.lang]] == null) { I.miss[ko] = 1; return fill(ko, args); }
    return fill(e[IDX[I.lang]], args);
  };
  window.T = I.t;
  I.pick = function (arr, ko) { return I.lang === "ko" || !arr ? ko : (arr[IDX[I.lang]] != null ? arr[IDX[I.lang]] : ko); };

  /* ───────── 한글 로마자 표기 (국어의 로마자 표기법, 간단한 규칙) ───────── */
  var CHO = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
  var JUNG = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
  var JONG = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
  // 받침이 다음 글자 ㅇ 으로 넘어갈 때의 소리
  var LINK = ["", "g", "kk", "ks", "n", "nj", "n", "d", "r", "lg", "lm", "lb", "ls", "lt", "lp", "r", "m", "b", "ps", "s", "ss", "", "j", "ch", "k", "t", "p", ""];
  function roman(word) {
    var out = "", syl = [];
    for (var i = 0; i < word.length; i++) {
      var c = word.charCodeAt(i) - 0xac00;
      if (c < 0 || c > 11171) { syl.push(word[i]); continue; }
      syl.push([Math.floor(c / 588), Math.floor((c % 588) / 28), c % 28]);
    }
    for (var j = 0; j < syl.length; j++) {
      var s = syl[j];
      if (typeof s === "string") { out += s; continue; }
      var prev = syl[j - 1], next = syl[j + 1];
      var cho = CHO[s[0]];
      if (prev && typeof prev !== "string") {
        var pj = prev[2];
        if (s[0] === 11 && pj && pj !== 21) cho = ""; // 앞 받침이 넘어옴 (아래에서 처리)
        else if (s[0] === 5 && (pj === 8 || pj === 4)) cho = "l";        // ㄹㄹ, ㄴㄹ → ll
        else if (s[0] === 5 && (pj === 16 || pj === 21)) cho = "n";      // ㅁㄹ, ㅇㄹ → n
        else if (s[0] === 5 && (JONG[pj] === "k" || JONG[pj] === "p")) cho = "n"; // ㄱㄹ → ngn, ㅂㄹ → mn
      }
      var jong = "";
      if (s[2]) {
        if (next && typeof next !== "string" && next[0] === 11 && s[2] !== 21) jong = LINK[s[2]];
        else if (next && typeof next !== "string" && (next[0] === 2 || next[0] === 6)) {
          var k = JONG[s[2]]; jong = k === "k" ? "ng" : k === "p" ? "m" : k === "t" ? "n" : k;  // 비음화
        } else if (next && typeof next !== "string" && next[0] === 5 && (s[2] === 4 || s[2] === 8)) jong = "l";
        else if (next && typeof next !== "string" && next[0] === 5 && (JONG[s[2]] === "k" || JONG[s[2]] === "p")) jong = JONG[s[2]] === "k" ? "ng" : "m";
        else jong = JONG[s[2]];
      }
      out += cho + JUNG[s[1]] + jong;
    }
    return out;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  I.roman = function (ko) {
    return String(ko).replace(/[가-힣]+/g, function (w) {
      var m = /^(.+?)(동|읍|면)$/.exec(w);
      if (m && w.length >= 2) return cap(roman(m[1])) + "-" + roman(m[2]);
      return cap(roman(w));
    });
  };

  /* ───────── 고유 이름 번역 ───────── */
  var cache = {}, wordRe = null, wordKeys = null;
  function buildRe() {
    wordKeys = Object.keys(I.words).sort(function (a, b) { return b.length - a.length; });
    wordRe = wordKeys.length ? new RegExp(wordKeys.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|"), "g") : null;
  }
  I.name = function (ko) {
    if (ko == null) return "";
    ko = String(ko);
    if (I.lang === "ko" || !/[가-힣]/.test(ko)) return ko;
    var key = I.lang + "|" + ko;
    if (cache[key] != null) return cache[key];
    if (!wordRe) buildRe();
    var li = IDX[I.lang], parts = [], last = 0, m, orig = ko;
    (I.pre || []).forEach(function (r) { ko = ko.replace(r[0], r[1][li]); });
    if (wordRe) {
      wordRe.lastIndex = 0;
      while ((m = wordRe.exec(ko))) {
        if (m.index > last) parts.push({ raw: ko.slice(last, m.index) });
        parts.push({ tr: I.words[m[0]][li] });
        last = m.index + m[0].length;
      }
    }
    if (last < ko.length) parts.push({ raw: ko.slice(last) });
    var cjk = I.lang !== "en", out = "";
    parts.forEach(function (p) {
      var s = p.tr != null ? p.tr : I.roman(p.raw);
      if (p.raw != null && !/\S/.test(p.raw)) { out += cjk ? (/[A-Za-z0-9]$/.test(out) ? " " : "") : " "; return; }
      if (!out) { out = s.replace(/^\s+/, ""); return; }
      var a = out.slice(-1), b = s.charAt(0);
      var needSpace = !/\s/.test(a) && !/^\s/.test(s) && !/^[)\]·,./-]/.test(b) && !/[(\[·/-]$/.test(a) &&
        (!cjk || /[A-Za-z0-9]/.test(a) || /[A-Za-z0-9]/.test(b));
      out += (needSpace ? " " : "") + s;
    });
    out = out.replace(/(\d)Gil\b/g, "$1-gil").replace(/(\d)Ro\b/g, "$1-ro").replace(/(\d)Gu\b/g, "$1-gu").replace(/\s{2,}/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();
    return (cache[I.lang + "|" + orig] = out);
  };
  I.term = function (ko) {
    if (ko == null || ko === "" || I.lang === "ko") return ko == null ? "" : ko;
    var e = I.terms[ko]; if (e && e[IDX[I.lang]] != null) return e[IDX[I.lang]];
    if (/[·,]/.test(ko)) return ko.split(/\s*([·,])\s*/).map(function (x) { return /^[·,]$/.test(x) ? (x === "·" ? " · " : ", ") : I.term(x); }).join("");
    return I.name(ko);
  };
  I.hours = function (s) {
    if (I.lang === "ko" || !s) return s;
    return String(s).replace(/24시간/g, I.pick(["24 hours", "24時間", "24小时"])).replace(/평일 ?/g, I.pick(["Weekdays ", "平日 ", "工作日 "]));
  };

  /* ───────── 숫자·날짜 ───────── */
  I.won = function (n) {
    var v = Number(n).toLocaleString("en-US");
    return I.lang === "en" ? "₩" + v : I.lang === "ja" ? v + "ウォン" : I.lang === "zh" ? v + "韩元" : Number(n).toLocaleString("ko-KR") + "원";
  };
  var WD = { ko: "일월화수목금토", ja: "日月火水木金土" };
  var WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], WD_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  I.weekday = function (d) { var w = d.getDay(); return I.lang === "en" ? WD_EN[w] : I.lang === "zh" ? WD_ZH[w] : WD[I.lang === "ja" ? "ja" : "ko"][w]; };
  I.date = function (d) {
    var m = d.getMonth() + 1, day = d.getDate(), w = I.weekday(d);
    if (I.lang === "en") return w + ", " + MON[m - 1] + " " + day;
    if (I.lang === "ja" || I.lang === "zh") return m + "月" + day + "日(" + w + ")";
    return m + "월 " + day + "일(" + w + ")";
  };
  I.mmss = function (sec) {
    var m = Math.floor(sec / 60), s = String(sec % 60).padStart(2, "0");
    return I.lang === "en" ? m + " min " + s + " s" : I.lang === "ja" ? m + "分" + s + "秒" : I.lang === "zh" ? m + "分" + s + "秒" : m + "분 " + s + "초";
  };

  /* ───────── 자료 바꾸기 (원본 한국어는 rec._ko 에 보관) ───────── */
  function keep(rec, f) { rec._ko = rec._ko || {}; if (!(f in rec._ko)) rec._ko[f] = rec[f]; return rec._ko[f]; }
  I.ko = function (rec, f) { return rec && rec._ko && f in rec._ko ? rec._ko[f] : rec && rec[f]; };
  function put(rec, f, fn) { var ko = keep(rec, f); rec[f] = I.lang === "ko" ? ko : fn(ko); }
  function byLang(entry, f, ko) { var e = entry && entry[I.lang]; return e && e[f] != null ? e[f] : ko; }
  I.swapData = function () {
    var D = window.KIOSK_DATA, X = I.data;
    D.places.forEach(function (p) {
      var e = X.places && X.places[p.no];
      ["name", "short", "area", "desc", "tags"].forEach(function (f) {
        if (f === "short" && !("short" in p)) p.short = p.name;
        put(p, f, function (ko) { return byLang(e, f, f === "short" ? byLang(e, "name", I.name(ko)) : f === "tags" ? ko : I.name(ko)); });
      });
    });
    (D.courses || []).forEach(function (c) {
      var e = X.courses && X.courses[c.id];
      ["title", "sub", "time", "desc"].forEach(function (f) { put(c, f, function (ko) { return byLang(e, f, ko); }); });
    });
    (D.taxiTypes || []).forEach(function (t) {
      var e = X.taxiTypes && X.taxiTypes[t.id];
      ["name", "desc"].forEach(function (f) { put(t, f, function (ko) { return byLang(e, f, ko); }); });
    });
    D.food.forEach(function (f) {
      put(f, "name", I.name); put(f, "menu", I.term); put(f, "area", I.name);
    });
    D.stay.forEach(function (s) {
      put(s, "name", I.name); put(s, "area", I.name); put(s, "grade", I.term);
      s.rooms.forEach(function (r) { put(r, "name", I.term); });
    });
    D.parking.forEach(function (p) { put(p, "name", I.name); put(p, "fee", I.fee || I.term); put(p, "hours", I.hours); });
    D.taxiStands.forEach(function (t) { put(t, "name", I.name); put(t, "where", I.name); });
    D.taxiExtra.forEach(function (t) { put(t, "name", I.name); put(t, "area", I.name); });
    D.news.forEach(function (n, i) {
      var e = X.news && X.news[i];
      put(n, "label", I.term);
      ["title", "place", "body", "date"].forEach(function (f) { put(n, f, function (ko) { return byLang(e, f, f === "date" ? I.t(ko) : I.name(ko)); }); });
    });
    D.spots.forEach(function (s) {
      var e = X.spots && X.spots[I.ko(s, "name")];
      put(s, "name", function (ko) { return byLang(e, "name", I.name(ko)); });
      put(s, "cat", I.term);
      put(s, "desc", function (ko) { return byLang(e, "desc", ko); });
    });
    (D.busGuide || []).forEach(function (g, i) {
      var e = X.busGuide && X.busGuide[i];
      ["title", "text"].forEach(function (f) { put(g, f, function (ko) { return String(byLang(e, f, ko)).replace("{0}", D.busRoutes.length); }); });
    });
    (D.uiHotspots || []).forEach(function (h) { put(h, "label", function (ko) { return I.t(ko); }); });
    D.busStops.forEach(function (s) { keep(s, "name"); s.label = I.name(s.name); s.areaLabel = I.name(s.area); });
    D.busRoutes.forEach(function (r) {
      r.fromLabel = I.name(r.from); r.toLabel = I.name(r.to); r.kindLabel = I.term(r.kind);
      r.tourLabel = r.tour ? I.term(r.tour) : "";
    });
  };
  /* 버스 정류장 이름 (원래 이름은 노선 순서 비교에 쓰이므로 바꾸지 않고 표시용만 번역) */
  I.stop = function (ko) { return I.name(ko); };

  /* ───────── 언어 바꾸기 ───────── */
  I.on = function (fn) { listeners.push(fn); };
  I.set = function (lang, opts) {
    if (LANGS.indexOf(lang) < 0) lang = "ko";
    var changed = lang !== I.lang;
    I.lang = lang;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
    I.swapData();
    applyStatic();
    if (changed || (opts && opts.force)) listeners.forEach(function (fn) { try { fn(lang); } catch (e) { console.error(e); } });
  };
  /* index.html 안의 data-i18n 글자 */
  function applyStatic() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      if (!el.hasAttribute("data-i18n-ko")) el.setAttribute("data-i18n-ko", el.textContent);
      el.textContent = I.t(el.getAttribute("data-i18n-ko"));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-label]"), function (el) {
      if (!el.hasAttribute("data-i18n-label-ko")) el.setAttribute("data-i18n-label-ko", el.getAttribute("aria-label") || "");
      el.setAttribute("aria-label", I.t(el.getAttribute("data-i18n-label-ko")));
    });
  }
  I.applyStatic = applyStatic;

  /* ───────── 화면에 새로 그려진 글자 자동 번역 (사전에 같은 문장이 있으면) ─────────
     코드에서 T() 로 감싸지 않은 고정 문구(사진 안내 등)도 외국어로 바뀌게 하는 안전망 */
  var HANGUL = /[가-힣]/, ATTRS = ["placeholder", "aria-label", "title", "alt"];
  function trText(s) {
    var key = s.trim(); if (!key || !HANGUL.test(key)) return null;
    var e = I.text[key]; if (!e || e[IDX[I.lang]] == null) { I.miss[key] = 1; return null; }
    var lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0];
    return lead + e[IDX[I.lang]] + tail;
  }
  I.translateDom = function (root) {
    if (I.lang === "ko" || !root) return;
    if (root.nodeType === 3) { var r0 = trText(root.nodeValue); if (r0 != null && r0 !== root.nodeValue) root.nodeValue = r0; return; }
    if (root.nodeType !== 1 || root.hasAttribute && root.hasAttribute("data-no-i18n")) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return n.parentNode && n.parentNode.closest && n.parentNode.closest("[data-no-i18n]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } }), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function (t) { var r = trText(t.nodeValue); if (r != null && r !== t.nodeValue) t.nodeValue = r; });
    var els = root.querySelectorAll ? root.querySelectorAll("[placeholder],[aria-label],[title],[alt],option") : [];
    Array.prototype.concat.call([root], Array.prototype.slice.call(els)).forEach(function (el) {
      if (!el.getAttribute) return;
      ATTRS.forEach(function (a) { var v = el.getAttribute(a); if (v && HANGUL.test(v)) { var r = trText(v); if (r != null) el.setAttribute(a, r.trim()); } });
    });
  };
  I.watch = function (root) {
    if (!window.MutationObserver || !root) return;
    new MutationObserver(function (muts) {
      if (I.lang === "ko") return;
      muts.forEach(function (m) {
        if (m.type === "characterData") I.translateDom(m.target);
        else Array.prototype.forEach.call(m.addedNodes, function (n) { I.translateDom(n); });
      });
    }).observe(root, { childList: true, subtree: true, characterData: true });
  };
})();

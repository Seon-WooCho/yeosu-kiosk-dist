/*
 * 음성·글자 질문 → 답변 (AI 모델 없이, 시트의 '질문사전'으로)
 *  1) 질문에서 관광지 이름 찾기: 여수10경·관광지의 4개국어 이름 + 별칭
 *  2) 질문 종류 찾기: 질문사전의 언어별 키워드 (가장 길게 맞는 것)
 *  3) 답변 틀의 {칸이름}을 그 관광지 내용으로 채움. 칸이 비어 있으면 '준비 중' 안내
 *
 * 대화처럼 느껴지게 하는 장치
 *  - 답변 틀 칸에 여러 줄을 적으면 그중 하나를 골라 말함 (같은 질문에도 매번 조금씩 다르게)
 *  - 관광지 이름 없이 "거기 어떻게 가?"라고 물으면, 지금 보고 있는 상세 화면이나
 *    2분 안에 이야기한 관광지를 이어서 씀
 *  - {추천 3곳}, {추천 1곳:야경}, {추천 2곳:동백/봄} 처럼 개수와 태그를 정할 수 있음
 *  - 답변 틀에 관광지 칸({이름}·{주소} 등)이 없으면 관광지 없이도 답함 (인사·날씨·맛집 등)
 *  - 연결 화면: '관광지 상세', '10경 지도', '처음 화면', '다시 듣기', '언어:en'(ko/en/ja/zh)
 * 결과: { text, place, screen, type, examples, choosePlace }
 */
(function () {
  "use strict";

  var FIELD = { "소개": "intro", "주소": "address", "전화": "tel", "운영시간": "hours", "요금": "fee", "교통안내_ko": "transit", "교통안내": "transit" };
  var PLACE_KEY = /\{(이름|소개|주소|전화|운영시간|요금|교통안내(_ko)?)\}/;
  var REC_KEY = /^추천\s*(\d+)\s*곳(?:\s*:\s*(.+))?$/;
  var MEMORY_MS = 2 * 60 * 1000;
  var last = { place: null, at: 0 };

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[\s.,!?·~'"()\-?？！。、，]/g, "");
  }
  function t(obj, lang) { return obj ? (obj[lang] || obj.ko || "") : ""; }
  /* 칸에 여러 줄이면 하나를 무작위로 */
  function pick(s) {
    var v = String(s || "").split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
    return v.length ? v[Math.floor(Math.random() * v.length)] : "";
  }

  function placesOf(d) {
    var list = [];
    (d.tenSights || []).forEach(function (p) { list.push({ kind: "ten", p: p }); });
    (d.places || []).forEach(function (p) { list.push({ kind: "place", p: p }); });
    return list;
  }

  function findPlace(d, q) {
    var nq = norm(q), best = null, bestLen = 0;
    placesOf(d).forEach(function (it) {
      var names = [it.p.name.ko, it.p.name.en, it.p.name.ja, it.p.name.zh].concat(it.p.aliases || []);
      names.forEach(function (n) {
        // 'XX·YY' 같은 이름은 앞부분만 말해도 찾도록 나눠서도 비교
        String(n || "").split(/[·\/]/).concat([n]).forEach(function (part) {
          var k = norm(part);
          if (k.length >= 2 && nq.indexOf(k) >= 0 && k.length > bestLen) { best = { kind: it.kind, p: it.p, term: k }; bestLen = k.length; }
        });
      });
    });
    return best;
  }

  function kwsOf(it, lang) { return (it.keywords[lang] || []).concat(lang === "ko" ? [] : it.keywords.ko || []); }
  /* 가장 길게 맞는 키워드. 길이가 같으면 '추천-야경'처럼 세부 종류를 우선 */
  function findIntent(d, q, lang) {
    var nq = norm(q), best = null, bestScore = 0;
    (d.intents || []).forEach(function (it) {
      kwsOf(it, lang).forEach(function (k) {
        var nk = norm(k);
        var score = nk.length + (/-/.test(it.type) ? 0.5 : 0);
        if (nk && nq.indexOf(nk) >= 0 && score > bestScore) { best = it; bestScore = score; }
      });
    });
    return best;
  }
  /* 한국어 조사: '오동도을(를)' → '오동도를', '향일암을(를)' → '향일암을' */
  var JOSA = { "을(를)": ["을", "를"], "이(가)": ["이", "가"], "은(는)": ["은", "는"], "과(와)": ["과", "와"], "와(과)": ["과", "와"], "아(야)": ["아", "야"], "이에요(예요)": ["이에요", "예요"] };
  function josa(text) {
    return String(text).replace(/(.)(을\(를\)|이\(가\)|은\(는\)|과\(와\)|와\(과\)|아\(야\)|이에요\(예요\))/g, function (_, ch, j) {
      var c = ch.charCodeAt(0), has;
      if (c >= 0xac00 && c <= 0xd7a3) has = (c - 0xac00) % 28 !== 0;
      else if (/[0-9]/.test(ch)) has = /[013678]/.test(ch);     // 일 삼 육 칠 팔 십(영)
      else has = false;
      return ch + JOSA[j][has ? 0 : 1];
    });
  }

  /* 추천: 태그(틀에 적은 것 → 없으면 질문 속 단어)로 고르고, 모자라면 그만큼만 */
  function recommend(d, q, lang, n, tagStr) {
    var nq = norm(q);
    var tags = tagStr ? tagStr.split(/[\/,]/).map(function (x) { return norm(x); }).filter(Boolean) : null;
    var all = placesOf(d);
    var hit = function (it) {
      return (it.p.tags || []).some(function (tg) { var k = norm(tg); return tags ? tags.indexOf(k) >= 0 : (k && nq.indexOf(k) >= 0); });
    };
    var tagged = all.filter(hit);
    // 태그가 없으면 10경에서, 10경을 앞에 두어 상세 화면으로 이어지게
    var pool = tagged.length ? tagged : all.filter(function (it) { return it.kind === "ten"; });
    pool = pool.slice().sort(function () { return Math.random() - 0.5; })
      .sort(function (a, b) { return (a.kind === "ten" ? 0 : 1) - (b.kind === "ten" ? 0 : 1); })
      .slice(0, n || 3);
    return { names: pool.map(function (it) { return t(it.p.name, lang); }).join(", "), first: pool[0] || null };
  }

  /**
   * ask(질문, 언어, UI문구함수, 상황{place}) → { text, place, type, screen, examples, choosePlace }
   */
  function ask(q, lang, ui, ctx) {
    var d = window.KioskData && KioskData.data;
    if (!d) return { text: ui("noData") };
    var found = findPlace(d, q);
    var intent = findIntent(d, q, lang);

    // 관광지 이름 + 추천류 질문("오동도 야경 어때?")은 그 관광지 소개로.
    // 단, 관광지를 찾은 말이 그 추천의 키워드이면(별칭 '야경' 등) 추천 그대로
    if (found && intent && /^추천/.test(intent.type)) {
      var viaKw = kwsOf(intent, lang).some(function (k) { var nk = norm(k); return nk && (found.term.indexOf(nk) >= 0 || nk.indexOf(found.term) >= 0); });
      if (viaKw) found = null; else intent = null;
    }
    if (!intent && found) intent = (d.intents || []).filter(function (i) { return i.type === "소개"; })[0] || null;
    if (!intent) return { text: pick(ui("msg.notUnderstood")), examples: true };

    var tpl = pick(t(intent.answer, lang));
    var needsPlace = PLACE_KEY.test(t(intent.answer, "ko")) || PLACE_KEY.test(tpl);

    // 이름 없이 물으면: 지금 보고 있는 상세 → 2분 안에 말한 관광지
    if (needsPlace && !found) {
      if (ctx && ctx.place) found = ctx.place;
      else if (last.place && Date.now() - last.at < MEMORY_MS) found = last.place;
    }
    if (needsPlace && !found) return { text: ui("whichPlace"), choosePlace: true, type: intent.type };

    var missing = false, rec = null;
    var name = found ? t(found.p.name, lang) : "";
    var text = tpl.replace(/\{([^}]+)\}/g, function (_, key) {
      key = key.trim();
      if (key === "이름") return name;
      var m = key.match(REC_KEY);
      if (m) { rec = recommend(d, q, lang, +m[1], m[2]); if (!rec.names) missing = true; return rec.names; }
      if (key === "메인영상 제목") {
        var titles = KioskData.activeMainMedia().filter(function (x) { return !x.isDefault; }).map(function (x) { return t(x.title, lang); });
        if (!titles.length) missing = true;
        return titles.slice(0, 3).join(", ");
      }
      var f = FIELD[key];
      var raw = found && f ? found.p[f] : "";
      var v = raw && typeof raw === "object" ? t(raw, lang) : (raw || "");
      if (!v) missing = true;
      return v || "";
    });
    if (missing) text = ui(intent.type === "축제" ? "noFestival" : "noInfo").replace("{이름}", name);
    if (lang === "ko") text = josa(text);

    if (found) { last.place = found; last.at = Date.now(); }
    var target = found || (rec && rec.first) || null;
    return { text: text, place: target, screen: intent.screen, type: intent.type };
  }

  window.KioskQA = { ask: ask, findPlace: findPlace, norm: norm, pick: pick };
})();

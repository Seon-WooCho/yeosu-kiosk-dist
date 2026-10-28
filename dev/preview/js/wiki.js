/*
 * 인터넷 자료 보강: 위키백과(소개글) + 위키미디어 공용(사진).
 * 실패하거나 오프라인이면 조용히 null 을 돌려주고, 화면은 내장 자료로 표시됩니다.
 */
(function () {
  "use strict";
  var KO = "https://ko.wikipedia.org/w/api.php";
  function WIKI(lang) { return "https://" + (lang || "ko") + ".wikipedia.org/w/api.php"; }
  function lang() { return window.I18N ? I18N.lang : "ko"; }
  function koOf(p, f) { return window.I18N ? I18N.ko(p, f) : p[f]; }
  var COMMONS = "https://commons.wikimedia.org/w/api.php";
  var TTL = 24 * 3600 * 1000;
  var mem = {};

  // 위키미디어 사진 파일 이름에 꼭 들어 있어야 하는 단어 (엉뚱한 사진 방지)
  var MUST = { 1: /manseong/i, 2: /rail.?bike|railbike/i, 3: /marae/i, 4: /expo/i, 5: /arte/i, 6: /aqua.?planet/i,
    7: /jasan/i, 8: /odongdo|odong/i, 9: /jinnam/i, 10: /sun.?sin|turtle|geobuk/i, 11: /goso|mural/i, 12: /pocha|romantic/i,
    13: /hamel/i, 14: /dolsan.*bridge|dolsandaegyo/i, 15: /dolsan/i, 16: /cable/i, 17: /science|fisheries|maritime/i, 18: /hyang.?il|hyangiram/i };

  function cacheGet(k) {
    if (mem[k]) return mem[k];
    try { var v = JSON.parse(localStorage.getItem("wiki:" + k)); if (v && Date.now() - v.t < TTL) return (mem[k] = v.d); } catch (e) {}
    return undefined;
  }
  function cacheSet(k, d) { mem[k] = d; try { localStorage.setItem("wiki:" + k, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} }

  function getJSON(base, params, ms) {
    var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }).join("&");
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { ctl && ctl.abort(); }, ms || 7000);
    return fetch(base + "?" + q, { signal: ctl && ctl.signal }).then(function (r) {
      clearTimeout(t); if (!r.ok) throw new Error("HTTP " + r.status); return r.json();
    }, function (e) { clearTimeout(t); throw e; });
  }
  function norm(s) { return String(s || "").replace(/[\s()·/,.-]/g, "").toLowerCase(); }
  function stripHtml(s) { var d = document.createElement("div"); d.innerHTML = s || ""; return (d.textContent || "").trim(); }
  function sentences(s, n) {
    var parts = String(s || "").replace(/\s+/g, " ").match(/[^.!?。]+[.!?。]?/g) || [];
    return parts.slice(0, n).join(" ").trim();
  }

  /* 위키백과 검색 → 가장 관련 있는 문서 1개 (제목·소개·대표사진) */
  function koArticle(term, base) {
    return getJSON(base || KO, {
      action: "query", format: "json", origin: "*", generator: "search", gsrsearch: term, gsrlimit: 3,
      prop: "extracts|pageimages", exintro: 1, explaintext: 1, exsentences: 4, piprop: "thumbnail", pithumbsize: 1280, redirects: 1
    }).then(function (j) {
      var pages = j && j.query && j.query.pages; if (!pages) return null;
      var list = Object.keys(pages).map(function (k) { return pages[k]; }).sort(function (a, b) { return (a.index || 0) - (b.index || 0); });
      return list[0] ? { title: list[0].title, extract: list[0].extract || "", image: list[0].thumbnail && list[0].thumbnail.source, all: list } : null;
    });
  }

  /* 한국어 문서와 연결된 다른 언어 문서의 소개 */
  function linkedExtract(koTitle, lg) {
    return getJSON(KO, { action: "query", format: "json", origin: "*", titles: koTitle, prop: "langlinks", lllang: lg, redirects: 1 }).then(function (j) {
      var pages = j && j.query && j.query.pages, pg = pages && pages[Object.keys(pages)[0]];
      var t = pg && pg.langlinks && pg.langlinks[0] && pg.langlinks[0]["*"]; if (!t) return null;
      return getJSON(WIKI(lg), { action: "query", format: "json", origin: "*", titles: t, prop: "extracts", exintro: 1, explaintext: 1, exsentences: 4, redirects: 1 }).then(function (j2) {
        var ps = j2 && j2.query && j2.query.pages, p2 = ps && ps[Object.keys(ps)[0]];
        return p2 && p2.extract ? { title: p2.title, extract: p2.extract } : null;
      });
    }).catch(function () { return null; });
  }

  function commonsImages(term, must) {
    return getJSON(COMMONS, {
      action: "query", format: "json", origin: "*", generator: "search", gsrnamespace: 6, gsrsearch: term + " filetype:bitmap", gsrlimit: 12,
      prop: "imageinfo", iiprop: "url|mime|size|extmetadata", iiurlwidth: 1280, iiextmetadatafilter: "Artist|LicenseShortName"
    }).then(function (j) {
      var pages = j && j.query && j.query.pages; if (!pages) return [];
      return Object.keys(pages).map(function (k) { return pages[k]; })
        .sort(function (a, b) { return (a.index || 0) - (b.index || 0); })
        .filter(function (p) {
          var ii = p.imageinfo && p.imageinfo[0];
          return ii && /jpe?g|png/.test(ii.mime || "") && (ii.width || 0) >= 800 && (!must || must.test(p.title));
        })
        .slice(0, 4)
        .map(function (p) {
          var ii = p.imageinfo[0], m = ii.extmetadata || {};
          var who = stripHtml(m.Artist && m.Artist.value).slice(0, 40), lic = stripHtml(m.LicenseShortName && m.LicenseShortName.value);
          return { src: ii.thumburl || ii.url, credit: T("사진: {0}", (who || "Wikimedia Commons") + (lic ? " · " + lic : "")) + " " + T("(위키미디어 공용)") };
        });
    });
  }

  window.Wiki = {
    enabled: function () { return window.KIOSK_CONFIG.useWikiContent !== false && navigator.onLine !== false; },

    /* 관광지 보강 정보 → Promise<{extract, images[]} | null> */
    place: function (p) {
      if (!this.enabled()) return Promise.resolve(null);
      var lg = lang(), key = "place" + p.no + (lg === "ko" ? "" : ":" + lg), c = cacheGet(key), name = koOf(p, "name");
      if (c !== undefined) return Promise.resolve(c);
      var a = koArticle(p.wiki).catch(function () { return null; });
      var b = commonsImages(p.commons, MUST[p.no]).catch(function () { return []; });
      return Promise.all([a, b]).then(function (r) {
        var art = r[0], imgs = r[1] || [];
        var ok = art && (norm(art.title).indexOf(norm(name).slice(0, 3)) >= 0 || norm(name).indexOf(norm(art.title).slice(0, 3)) >= 0 || norm(art.title).indexOf(norm(p.wiki).slice(0, 3)) >= 0);
        if (ok && lg !== "ko") return linkedExtract(art.title, lg).then(function (fx) { return [art, imgs, ok, fx ? sentences(fx.extract, 3) : ""]; });
        return [art, imgs, ok, ok ? sentences(art.extract, 3) : ""];
      }).then(function (r) {
        var art = r[0], imgs = r[1], ok = r[2];
        var out = { extract: r[3], images: [] };
        if (ok && art.image) out.images.push({ src: art.image, credit: T("사진: {0}", T("위키백과 「{0}」 문서", art.title)) });
        imgs.forEach(function (i) { if (out.images.length < 4 && !out.images.some(function (x) { return x.src === i.src; })) out.images.push(i); });
        if (!out.extract && !out.images.length) out = null;
        cacheSet(key, out);
        return out;
      }).catch(function () { return null; });
    },

    /* 일반 질문용 위키백과 요약 → Promise<{title, text} | null> */
    lookup: function (q) {
      if (!this.enabled()) return Promise.resolve(null);
      var lg = lang(), key = "q:" + lg + ":" + norm(q), c = cacheGet(key);
      if (c !== undefined) return Promise.resolve(c);
      return koArticle(q, WIKI(lg)).then(function (a) {
        var out = a && a.extract ? { title: a.title, text: sentences(a.extract, 2) } : null;
        cacheSet(key, out); return out;
      }).catch(function () { return null; });
    }
  };
})();

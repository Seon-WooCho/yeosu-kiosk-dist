/*
 * 구글 시트에서 만든 키오스크 데이터(data/kiosk-data.json) 불러오기
 *
 *  - APK를 빌드할 때 GitHub Actions가 시트를 읽어 web/data/kiosk-data.json 을 만들어 앱 안에 넣습니다.
 *  - config.js 의 sheetData.remoteUrl 을 채우면, 실행 중에 그 주소의 최신 JSON을 먼저 시도하고
 *    실패하면 앱 안의 파일을 씁니다 (원격 데이터 반영 시험용).
 *  - 화면 코드는 KioskData.ready.then(d => ...) 로 받아 쓰면 됩니다.
 *    아직 새 화면 구성(시안)이 오기 전이라 기존 화면에는 연결하지 않았습니다.
 */
(function () {
  var cfg = (window.KIOSK_CONFIG && window.KIOSK_CONFIG.sheetData) || {};
  var LOCAL = "data/kiosk-data.json";

  function getJSON(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url + (url.indexOf("?") < 0 ? "?" : "&") + "t=" + Date.now(), true);
      xhr.timeout = timeoutMs || 8000;
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(e); }
        } else reject(new Error("HTTP " + xhr.status));
      };
      xhr.onerror = xhr.ontimeout = function () { reject(new Error("load failed: " + url)); };
      xhr.send();
    });
  }

  function today() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  var KioskData = {
    data: null,
    source: null,

    /* 오늘 노출할 메인영상 (기간 필터, 아무것도 없으면 기본 화면) */
    activeMainMedia: function () {
      var d = this.data;
      if (!d) return [];
      var t = today();
      var list = d.mainMedia.filter(function (m) {
        return !m.isDefault && m.media && (!m.start || m.start <= t) && (!m.end || m.end >= t);
      });
      if (!list.length) list = d.mainMedia.filter(function (m) { return m.isDefault && m.media; });
      return list;
    },

    /* 위아래 2칸 교차 재생 순서: 2개면 [1,2] 반복, 3개면 [1,2],[3,1],[2,3] … */
    pairAt: function (step) {
      var list = this.activeMainMedia();
      var n = list.length;
      if (!n) return [];
      // 항목이 칸 수보다 적으면 있는 만큼만 (같은 영상을 위아래에 두 번 띄우지 않음)
      var per = Math.min((this.data.settings && this.data.settings.slotsPerScreen) || 2, n);
      var out = [];
      for (var i = 0; i < per; i++) out.push(list[(step * per + i) % n]);
      return out;
    },

    /* 언어별 글자 (비어 있으면 한국어) */
    t: function (obj, lang) {
      if (!obj) return "";
      return obj[lang] || obj.ko || "";
    },

    text: function (id, lang) {
      var d = this.data;
      return d && d.texts[id] ? this.t(d.texts[id], lang) : "";
    }
  };

  KioskData.ready = (cfg.remoteUrl
    ? getJSON(cfg.remoteUrl, cfg.timeoutMs).then(function (d) { KioskData.source = "remote"; return d; })
        .catch(function () { return getJSON(LOCAL).then(function (d) { KioskData.source = "local"; return d; }); })
    : getJSON(LOCAL).then(function (d) { KioskData.source = "local"; return d; })
  ).then(function (d) {
    KioskData.data = d;
    return d;
  }).catch(function (e) {
    console.warn("[KioskData] 시트 데이터를 불러오지 못했어요:", e && e.message);
    return null;
  });

  window.KioskData = KioskData;
})();

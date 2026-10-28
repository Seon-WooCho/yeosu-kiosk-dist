/*
 * 기기 상태 보고 → 구글 시트 '기기상태' 탭 (Apps Script 웹 앱)
 *  - 주소는 시트 '설정' 탭의 '기기상태 기록 주소' (빌드 때 data/kiosk-data.json 에 들어옴). 비어 있으면 아무것도 안 함
 *  - 앱 안에서만 보냄 (PC 브라우저 시험은 기록하지 않음)
 *  - 보내는 때: 화면이 뜰 때, 업데이트 확인 결과가 나올 때(최신/받아둠/적용/설치 중/앱 대기/실패)
 *  - 새 화면 묶음으로 바뀐 뒤 처음 뜨면 '정상 적용'으로 기록 → 원격 패치가 실제로 화면까지 반영됐다는 뜻
 */
(function () {
  "use strict";
  var K = window.KioskData, U = window.KioskUpdate;
  var LS = window.localStorage, ID_KEY = "kioskDeviceId", WEB_KEY = "kioskReportedWeb";

  function store(k, v) { try { if (v === undefined) return LS.getItem(k); LS.setItem(k, v); } catch (e) { return null; } }
  function deviceId() {
    var id = store(ID_KEY);
    if (!id) {
      var c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";
      for (var i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
      id = "KIOSK-" + s; store(ID_KEY, id);
    }
    return id;
  }

  var STATE = { latest: "최신", ready: "받아둠", applied: "정상 적용", installing: "설치 중", blocked: "앱 대기",
    error: "실패", permission: "실패", reset: "앱 기본" };
  var lastSent = "", lastAt = 0;

  function url() { return (K && K.data && K.data.settings && K.data.settings.statusUrl) || ""; }

  function send(st, extra) {
    var u = url();
    if (!u || !U || !U.available || !st) return;
    var state = (extra && extra.state) || STATE[st.state];
    if (!state) return;   // 확인 중·받는 중 같은 중간 상태는 보내지 않음
    var body = {
      id: deviceId(), channel: st.channel || "", appVersion: st.appVersion || "", webVersion: String(st.webVersion || ""),
      webSource: st.webSource || "", state: state, message: st.message || "",
      checkedAt: st.lastCheck || Date.now(), appliedAt: extra && extra.appliedAt || 0,
      rollback: "", error: state === "실패" ? (st.message || "") : ""
    };
    var key = JSON.stringify([body.state, body.webVersion, body.appVersion, body.message]);
    if (key === lastSent && Date.now() - lastAt < 4 * 60000) return;   // 같은 내용은 4분에 한 번만
    lastSent = key; lastAt = Date.now();
    try {
      fetch(u, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) })
        .catch(function () {});
    } catch (e) {}
  }

  window.KioskReport = { id: deviceId, send: send, url: url };

  if (!K || !U || !U.available) return;
  K.ready.then(function () {
    var st = U.status() || {};
    // 원격으로 받은 새 화면이 처음 떴으면 '정상 적용'
    var web = String(st.webVersion || ""), seen = store(WEB_KEY);
    if (st.webSource === "update" && web && web !== seen) {
      store(WEB_KEY, web);
      send(st, { state: "정상 적용", appliedAt: Date.now() });
    } else {
      if (web) store(WEB_KEY, web);
      send(st, { state: STATE[st.state] || "최신" });
    }
    U.on(function (s) { if (s.state !== "applied") send(s); });   // 적용은 화면이 다시 뜬 뒤 위에서 기록
  });
})();

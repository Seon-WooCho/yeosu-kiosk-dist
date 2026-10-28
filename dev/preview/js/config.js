/*
 * 키오스크 설정 — 현장에 맞게 이 파일만 고치면 됩니다.
 */
window.KIOSK_CONFIG = {
  // 아무 터치가 없으면 메인(지도)으로 돌아가는 시간(초)
  idleSeconds: 90,

  // 관리자 화면: 왼쪽 위 '여수시' 로고를 5번 연속 터치 → PIN
  adminPin: "0000",

  // 이 키오스크 위치 이름 (택시 화면 등에 표시)
  kioskLocationName: "여수 관광안내소",
  // 키오스크에서 가장 가까운 버스 정류장 이름 (js/data-yeosu.js 의 정류장 이름과 같게)
  kioskStopName: "이순신광장",

  // 관광지 사진·소개를 인터넷(위키백과·위키미디어 공용)에서 자동으로 보강할지
  useWikiContent: true,

  // ── 구글 시트 데이터 (여수 키오스크 데이터 관리) ──
  // APK 빌드 때 시트 내용이 data/kiosk-data.json 으로 앱 안에 들어갑니다.
  // remoteUrl 을 채우면 실행 중에 그 주소의 최신 JSON을 먼저 받아 씁니다(실패하면 앱 안의 파일).
  sheetData: {
    remoteUrl: "",
    timeoutMs: 8000
  },

  // ── 관광지 소개 영상 (유튜브) ──
  video: {
    enabled: true,
    startMuted: true,            // 처음엔 소리 없이 재생 (화면의 '소리 켜기'로 켬)
    // 이 채널에서 올린 영상만 재생 (채널 이름 일부가 맞으면 허용)
    allowedChannels: ["힐링여수야", "여수시", "문화체육관광부", "한국관광공사", "대한민국 구석구석", "전라남도"],
    // 공식 채널 확인이 안 될 때(확인 서버 접속 불가) 후보 영상을 그냥 재생할지
    playUnverified: false,
    // 마지막 대안: 여수시 공식 유튜브 채널 '힐링여수야'의 업로드 영상 목록
    channelName: "힐링여수야 (여수시 공식)",
    channelUploads: "UUsps_8Jb_DAC1pEE49uTbUA"
  },

  // ── 뭐든지 묻기 (음성 AI) ──
  // 비워두면: 내장 안내 답변 + 위키백과 검색으로 답합니다(인터넷 필요, 키 불필요).
  // OpenAI 호환 Chat Completions 주소를 넣으면 실제 대화형 AI로 답합니다.
  // ※ 운영 시 API 키는 웹앱에 넣지 말고 중계 서버 주소를 넣으세요.
  ai: {
    endpoint: "",
    apiKey: "",
    model: "gpt-4o-mini",
    systemPrompt: "당신은 전라남도 여수시 관광안내 키오스크의 안내원입니다. 관광객에게 친절하고 짧게(3문장 이내) 한국어로 답하세요."
  },

  // ── AI 포토존 ──
  photo: {
    countdown: 3,
    // AI 인물 분리 모델 (인터넷에서 불러옴). 실패하면 자동으로 '부드러운 테두리 합성'으로 대체됩니다.
    segmenterModule: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14",
    segmenterWasm: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
    segmenterModel: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
    // QR로 사진 받기: 사진을 올릴 서버.
    //  - 기본값은 시연용 공개 임시 파일 서버(tmpfiles.org)입니다. 실제 운영 전에는 꼭 자체 서버로 바꾸세요
    //    (server/upload-server.js 를 서버에 올리고 그 주소를 넣으면 됩니다).
    //  - type "tmpfiles": tmpfiles.org API / type "simple": POST file → {"url": "..."} 응답
    upload: { type: "tmpfiles", url: "https://tmpfiles.org/api/v1/upload" },
    printEnabled: true
  },

  // ── 버스 실시간 (선택) ── 공공데이터포털 TAGO 버스도착정보. 비워두면 예시 데이터
  bus: {
    serviceKey: "",
    cityCode: "",
    nodeId: "",
    endpoint: "https://apis.data.go.kr/1613000/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList"
  }
};

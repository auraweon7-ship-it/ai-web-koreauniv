/* =====================================================================
 *  사이트 설정 파일 — 사이트에 보이는 모든 글과 항목은 여기서만 고치면 됩니다.
 *  · 따옴표("…") 안의 글자만 바꾸세요.
 *  · 항목을 늘리려면 { … } 한 덩어리를 복사해 붙여 넣고, 줄이려면 지우면 됩니다.
 *  · 저장 후 브라우저에서 새로고침(F5)하면 바로 반영됩니다.
 *  · 화면 순서: 첫 화면 → 통계 → 강의 소개 → 커리큘럼
 *               → 수강 안내 → 참여하기 → 내 강의실 → FAQ → 공지사항 → 교수자(푸터)
 * ===================================================================== */
window.SITE_CONFIG = {
  /* ── 기본 정보 ─────────────────────────────────────────── */
  site: {
    university: "고려대학교",
    department: "○○학과",
    courseTitle: "AI WEB",
    version: "v1.0.0", // 제목 오른쪽에 빨간 글씨로 표시. 비워 두면 표시하지 않습니다.
    logoImage: "images/logo.webp", // 로고 이미지 경로. 비워 두면 아래 이모지가 로고로 쓰입니다.
    logoEmoji: "🌸",
    // 첫 화면·브라우저 탭의 제목 옆에 붙는 소속 줄. 비워 두면 위의 "대학교 학과"가 표시됩니다.
    brandSub: "박정원(한국외국어대학교)",
    // 헤더 왼쪽 위 제목의 윗줄. 비워 두면 위의 소속 줄(brandSub)이 표시됩니다.
    headerSub: "AI 기반 데이터 활용능력 배양",
  },

  /* ── 헤더 메뉴 (id는 아래 각 섹션의 id와 같아야 합니다) ── */
  nav: [
    { id: "about", label: "강의 소개" },
    { id: "curriculum", label: "커리큘럼" },
    { id: "portfolio", label: "포트폴리오" },
    { id: "guide", label: "수강 안내" },
    { id: "participate", label: "참여하기" },
    { id: "classroom", label: "내 강의실" },
    { id: "faq", label: "FAQ" },
    { id: "instructor", label: "교수자" },
  ],

  /* ── 첫 화면 ───────────────────────────────────────────── */
  hero: {
    badge: "2026 상반기 집중 프로그램",
    subtitle: "AI 기반 데이터 활용능력 배양",
    description:
      "생성형 AI와 웹 기술을 활용해 데이터를 수집·가공·분석하고, 이를 웹페이지·웹앱·대시보드로 구현하는 능력을 기릅니다. 매주 AI로 단계별 결과물을 만들고, 마지막에는 나만의 AI 기반 웹플랫폼을 완성해 실제 웹에 배포합니다.",
    buttons: [
      // href가 "#"으로 시작하면 페이지 안 이동, 주소(https://…)면 새 창으로 열립니다.
      { label: "수강 신청", href: "#apply", primary: true },
      { label: "커리큘럼 보기", href: "#curriculum", primary: false },
    ],
    // 한눈에 보기
    quickInfo: [
      { icon: "🗓️", label: "일정", value: "2026. 9. 1 – 12. 8 (15주)" },
      { icon: "⏰", label: "시간", value: "매주 화요일 13:00 – 15:00" },
      { icon: "💻", label: "수업 방식", value: "이론 강의 + 실습 병행" },
      { icon: "👥", label: "수강 대상", value: "중국학대학 학생" },
    ],
  },

  /* ── 공지사항 (자주 묻는 질문 아래. 카드를 누르면 내용이 펼쳐집니다) ──
   *   관리자 로그인 뒤 공지사항 섹션에서 추가·수정·삭제할 수 있습니다.
   *   pinned: true면 '중요' 표시와 함께 맨 위로. 그 밖에는 최근 날짜가 위로 옵니다. */
  notices: {
    id: "notices",
    eyebrow: "Notice",
    title: "공지사항",
    lead: "수업과 관련한 새 소식을 알려 드립니다.",
    items: [
      { title: "(예시) 8주차 중간 프로젝트 발표 안내", text: "예시 공지입니다. 실제 내용으로 바꾸거나 삭제해 주세요.\n발표 순서와 준비 사항을 이곳에 적습니다.", date: "2026-10-04", pinned: true },
      { title: "(예시) 실습용 계정 준비 안내", text: "예시 공지입니다. 실제 내용으로 바꾸거나 삭제해 주세요.", date: "2026-09-01", pinned: false },
    ],
  },

  /* ── 숫자로 보는 강의 ──────────────────────────────────── */
  stats: [
    { value: 15, suffix: "주", label: "집중 과정" },
    { value: 13, suffix: "개", label: "실습 AI·웹 도구" },
    { value: 6, suffix: "권", label: "교수자 저술" },
    { value: 12, suffix: "개", label: "최종 프로젝트 예시" },
  ],

  /* ── 강의 소개: 강의 내용 + 특징 슬라이드 + 학습 목표 ── */
  about: {
    id: "about",
    eyebrow: "About",
    title: "강의 소개",
    lead: "생성형 AI와 웹 기술로 기획부터 배포까지 직접 해 보는 강의입니다.",
    // 강의 내용 (문단)
    intro: [
      "본 교과목은 생성형 AI와 웹 기술을 활용하여 데이터를 수집·가공·분석하고 이를 웹페이지, 웹앱, 대시보드 등의 형태로 구현하는 능력을 배양하는 것을 목적으로 합니다. ChatGPT, Claude, Codex, Google AI Studio 등의 생성형 AI를 활용하여 웹 콘텐츠를 기획하고, HTML·CSS·JavaScript의 기본 구조와 프롬프트 기반 웹 개발 방법을 학습합니다.",
      "수업에서는 WordPress, Google Sites와 같은 전통적인 웹 구축 도구부터 Wix AI, Framer AI, Lovable, Replit, Claude Code, Codex 등 AI 기반 웹 개발 도구까지 폭넓게 활용합니다. 또한 텍스트·이미지·영상·데이터·지도·차트 등 다양한 콘텐츠를 웹에 통합하고, 외부 데이터와 API를 연결하여 실제 활용 가능한 웹플랫폼과 웹앱을 제작합니다.",
      "수업은 이론 강의와 실습을 병행하며, 매주 생성형 AI를 활용하여 단계별 결과물을 제작합니다. 후반부에는 GitHub와 Railway 등의 서비스를 활용하여 제작한 웹앱을 실제 웹에 배포하고, 최종적으로 개인 또는 팀별 AI 기반 웹플랫폼 프로젝트를 완성합니다.",
    ],
    // 좌우로 넘겨 보는 슬라이드
    slidesTitle: "이 강의의 특징",
    slides: [
      { icon: "🛠️", title: "이론과 실습 병행", text: "매주 핵심 개념을 배운 뒤 생성형 AI로 실습하고, 단계별 결과물을 쌓아 최종 웹플랫폼을 만듭니다." },
      { icon: "🤖", title: "전통 도구부터 AI 도구까지", text: "WordPress, Google Sites부터 Wix AI, Framer AI, Lovable, Replit, Claude Code, Codex까지 폭넓게 다룹니다." },
      { icon: "💬", title: "프롬프트 기반 웹 개발", text: "HTML·CSS·JavaScript의 기본 구조를 이해하고, 프롬프트로 웹 콘텐츠와 코드를 생성합니다." },
      { icon: "🧩", title: "다양한 콘텐츠 통합", text: "텍스트·이미지·영상·데이터·지도·차트 등 다양한 콘텐츠를 하나의 웹에 통합합니다." },
      { icon: "🔗", title: "데이터와 API 연동", text: "외부 데이터와 API를 연결해 실제로 활용할 수 있는 웹플랫폼과 웹앱을 제작합니다." },
      { icon: "🚀", title: "실제 웹에 배포", text: "GitHub와 Railway 등을 활용해 만든 웹앱을 배포하고, 개인 또는 팀 프로젝트를 완성합니다." },
    ],
    // 학습 목표
    goalsTitle: "강의 목표",
    goalsLead: "생성형 AI와 웹 기술의 기본 원리를 이해하고 다양한 AI 도구를 활용하여 웹 콘텐츠와 웹앱을 직접 기획·제작·배포할 수 있는 실무 역량을 배양합니다.",
    goals: [
      "생성형 AI와 웹 기술의 기본 구조를 이해한다.",
      "AI를 활용하여 웹페이지 및 웹앱을 설계할 수 있다.",
      "HTML·CSS·JavaScript의 기본 구조와 역할을 이해한다.",
      "프롬프트를 활용하여 웹 콘텐츠와 프로그램 코드를 생성할 수 있다.",
      "이미지·영상·지도·차트·데이터 등 다양한 콘텐츠를 웹에 통합할 수 있다.",
      "API와 외부 데이터를 웹서비스에 연결하는 방법을 이해한다.",
      "AI 기반 웹사이트 및 웹앱 제작 도구를 목적에 따라 선택할 수 있다.",
      "GitHub와 클라우드 서비스를 활용하여 웹앱을 배포할 수 있다.",
      "실제 활용 가능한 AI 기반 웹플랫폼을 기획하고 구현할 수 있다.",
    ],

    /* 인포그래픽 (강의 소개 맨 아래). 통째로 지우면 표시되지 않습니다.
     *   inputs → outputs : 무엇을 활용해 무엇을 만드는지
     *   steps            : 제작 과정
     *   roadmap          : 학기 흐름. span은 그 단계의 주 수(막대 길이)
     *   toolGroups       : 단계별 도구 */
    infographic: {
      title: "한눈에 보는 AI WEB",
      inputsTitle: "활용하는 것",
      inputs: [
        { icon: "🤖", title: "생성형 AI", text: "ChatGPT · Claude · Codex · Google AI Studio" },
        { icon: "🌐", title: "웹 기술", text: "HTML · CSS · JavaScript · 프롬프트 기반 웹 개발" },
        { icon: "📊", title: "콘텐츠와 데이터", text: "텍스트 · 이미지 · 영상 · 지도 · 차트 · 외부 데이터 · API" },
      ],
      outputsTitle: "만드는 것",
      outputs: [
        { icon: "📄", label: "웹페이지" },
        { icon: "📱", label: "웹앱" },
        { icon: "📈", label: "대시보드" },
      ],
      stepsTitle: "제작 과정",
      steps: [
        { icon: "📝", title: "기획", text: "목적·사용자·정보구조 설계" },
        { icon: "💬", title: "AI 활용", text: "프롬프트로 콘텐츠와 코드 생성" },
        { icon: "🧱", title: "웹 구현", text: "HTML·CSS·JavaScript로 제작" },
        { icon: "🔗", title: "데이터 연동", text: "외부 데이터와 API 연결" },
        { icon: "🚀", title: "배포", text: "GitHub·Railway로 실제 웹에 공개" },
      ],
      roadmapTitle: "15주 학습 흐름",
      roadmap: [
        { weeks: "1–3주", span: 3, title: "이해", text: "AI와 웹의 기본 구조, 웹 제작 도구 분석" },
        { weeks: "4–7주", span: 4, title: "기획과 제작", text: "웹 기획, HTML, CSS, JavaScript" },
        { weeks: "8주", span: 1, title: "중간 프로젝트", text: "개인별 AI 웹페이지" },
        { weeks: "9–13주", span: 5, title: "확장", text: "멀티미디어, 데이터 시각화, API, 웹앱, 데이터 저장" },
        { weeks: "14주", span: 1, title: "배포", text: "GitHub와 웹앱 배포" },
        { weeks: "15주", span: 1, title: "최종 프로젝트", text: "AI 기반 웹플랫폼 완성·발표" },
      ],
      toolsTitle: "전통 도구부터 AI 도구까지",
      toolGroups: [
        { title: "웹 구축 도구", items: ["WordPress", "Google Sites"] },
        { title: "AI 웹 제작", items: ["Wix AI", "Framer AI"] },
        { title: "AI 웹앱 개발", items: ["Lovable", "Replit", "Claude Code", "Codex"] },
        { title: "배포", items: ["GitHub", "Railway"] },
      ],
    },
  },

  /* ── 커리큘럼 ──────────────────────────────────────────── */
  curriculum: {
    id: "curriculum",
    eyebrow: "Curriculum",
    title: "커리큘럼",
    lead: "주차를 누르면 날짜·장소·학습 내용·과제를 볼 수 있습니다. 일정은 학기 중 조정될 수 있습니다.",
    weeksTitle: "주차별 학습",
    calendarTitle: "월간 수업 달력",

    /* 수업 일정 기본값 — 날짜는 첫 수업일부터 매주 같은 요일로 자동 계산됩니다.
     *   firstClass : 1주차 수업일 (2026-09-01은 화요일)
     *   time       : 기본 수업 시간
     *   location   : 기본 수업 장소
     *   submitUrl  : 과제 제출 버튼이 열 주소. "#classroom"이면 이 사이트의 '내 강의실'로 이동합니다. */
    schedule: {
      firstClass: "2026-09-01",
      time: "13:00 – 15:00",
      location: "인문관 203호",
      submitUrl: "#classroom",
    },

    /* 주차별 내용
     *   topics     : 학습 내용 (여러 줄 가능)
     *   videos     : 참고 영상 링크. 예) [{ label: "영상 제목", url: "https://…" }]  없으면 [] 로 두세요.
     *   assignment : 과제가 있는 주에만 넣습니다. due는 "연-월-일T시:분" 형식.
     *                submitUrl을 따로 적으면 그 과제만 다른 주소로 연결됩니다.
     *   date/time/location : 휴강·보강 등으로 그 주만 다를 때 적습니다.
     *                (예) date: "2026-05-07", location: "△△관 101호" */
    weeks: [
      {
        week: 1, title: "AI WEB 강의 소개", tag: "",
        topics: [
          "교과목의 목적과 전체 학습과정 이해",
          "AI와 웹 기술의 관계",
          "웹사이트·웹플랫폼·웹앱의 차이",
          "생성형 AI 기반 웹 개발 사례 살펴보기",
          "학기 프로젝트 소개",
        ],
        videos: [],
      },
      {
        week: 2, title: "웹과 생성형 AI의 이해", tag: "실습",
        topics: [
          "인터넷과 웹의 기본 구조",
          "프론트엔드와 백엔드 개념",
          "HTML·CSS·JavaScript의 역할",
          "생성형 AI와 웹 개발의 변화",
          "프롬프트 기반 웹 개발 실습",
        ],
        videos: [],
      },
      {
        week: 3, title: "AI 웹 제작 도구 분석", tag: "",
        topics: [
          "WordPress와 Google Sites",
          "Wix AI·Framer AI·Durable",
          "Lovable·Replit",
          "Claude Code·Codex",
          "주요 웹 제작 도구의 특징과 장단점 비교",
          "목적에 따른 웹 제작 도구 선택",
        ],
        videos: [],
      },
      {
        week: 4, title: "AI를 활용한 웹 콘텐츠 기획", tag: "실습",
        topics: [
          "웹사이트 목적과 사용자 정의",
          "정보구조와 메뉴 설계",
          "사이트맵 제작",
          "사용자 경험과 화면 구성",
          "생성형 AI를 활용한 웹사이트 기획안 제작",
        ],
        videos: [],
      },
      {
        week: 5, title: "HTML 기반 웹페이지 제작", tag: "실습",
        topics: [
          "HTML 기본 구조 이해",
          "제목·문단·이미지·링크 구성",
          "테이블과 리스트 활용",
          "AI를 활용한 HTML 코드 생성",
          "개인 프로필 또는 강의 소개 페이지 제작",
        ],
        videos: [],
      },
      {
        week: 6, title: "CSS와 웹 디자인", tag: "실습",
        topics: [
          "CSS의 기본 개념",
          "색상·폰트·레이아웃 설정",
          "카드·버튼·메뉴 디자인",
          "반응형 웹의 기본 개념",
          "생성형 AI를 활용한 UI 디자인 개선",
        ],
        videos: [],
      },
      {
        week: 7, title: "웹 인터랙션과 JavaScript", tag: "실습",
        topics: [
          "JavaScript의 역할",
          "버튼·탭·모달·슬라이더",
          "이미지 갤러리",
          "카운터와 검색 기능",
          "AI를 활용한 인터랙티브 웹페이지 제작",
        ],
        videos: [],
      },
      {
        week: 8, title: "중간평가 및 AI 웹 프로젝트", tag: "중간평가",
        topics: [
          "1~7주차 학습내용 정리",
          "개인별 AI 웹페이지 제작",
          "웹페이지 구조 및 기능 평가",
          "프로젝트 발표 및 상호 피드백",
        ],
        videos: [],
        assignment: {
          title: "중간 프로젝트: 개인별 AI 웹페이지",
          text: "1~7주차에 배운 내용을 활용해 개인별 AI 웹페이지를 제작하고 발표합니다. 웹페이지의 구조와 기능을 평가합니다.",
          due: "2026-10-20T23:59",
        },
      },
      {
        week: 9, title: "웹 콘텐츠와 멀티미디어", tag: "실습",
        topics: [
          "이미지 콘텐츠 활용",
          "YouTube 및 영상 임베드",
          "오디오 콘텐츠 활용",
          "PDF·문서·프레젠테이션 연동",
          "다양한 콘텐츠를 통합한 웹페이지 제작",
        ],
        videos: [],
      },
      {
        week: 10, title: "웹 데이터와 데이터 시각화", tag: "실습",
        topics: [
          "CSV·JSON 데이터 이해",
          "웹에서 데이터 불러오기",
          "표와 차트 구현",
          "데이터 대시보드의 기본 구조",
          "AI를 활용한 데이터 시각화 웹페이지 제작",
        ],
        videos: [],
      },
      {
        week: 11, title: "API와 외부 서비스 연동", tag: "실습",
        topics: [
          "API의 기본 개념",
          "REST API 이해",
          "API Key와 인증의 개념",
          "지도·날씨·YouTube 등 외부 데이터 활용",
          "생성형 AI를 활용한 API 연동 실습",
        ],
        videos: [],
      },
      {
        week: 12, title: "AI 웹앱 제작", tag: "실습",
        topics: [
          "웹사이트와 웹앱의 차이",
          "입력·검색·결과 화면 구성",
          "사용자 입력 데이터 처리",
          "AI 기능을 포함한 웹앱 구조",
          "Claude Code·Codex·Lovable·Replit 활용 웹앱 제작",
        ],
        videos: [],
      },
      {
        week: 13, title: "웹 데이터 저장과 사용자 기능", tag: "",
        topics: [
          "데이터 저장 방식의 이해",
          "Google Sheets 연동",
          "간단한 데이터베이스 활용",
          "로그인과 사용자 인증의 기본 개념",
          "관리자 페이지와 사용자 대시보드 구성",
        ],
        videos: [],
      },
      {
        week: 14, title: "GitHub와 웹앱 배포", tag: "배포",
        topics: [
          "Git과 GitHub의 기본 개념",
          "Repository 생성",
          "Commit과 Push",
          "GitHub와 웹프로젝트 연결",
          "Railway·Vercel 등을 활용한 웹앱 배포",
          "실제 URL을 통한 웹서비스 공개",
        ],
        videos: [],
      },
      {
        week: 15, title: "AI WEB 최종 프로젝트", tag: "최종 발표",
        topics: [
          "개인 또는 팀별 AI 웹플랫폼 완성",
          "웹서비스 시연",
          "기획·디자인·데이터·AI 기능 평가",
          "프로젝트 발표 및 상호 피드백",
          "AI 기반 웹 개발의 활용 가능성과 향후 발전 방향 논의",
        ],
        videos: [],
        assignment: {
          title: "기말 프로젝트: AI 기반 웹플랫폼",
          text: "개인 또는 팀별로 AI 기반 웹플랫폼을 완성해 시연·발표합니다. 기획 → AI 활용 → 웹 구현 → 데이터 연동 → 배포의 전 과정을 포함해야 합니다.",
          due: "2026-12-08T23:59",
        },
      },
    ],

    /* 달력 일정 — 수업 외에 달력에 표시할 일정(휴강·보강·특강·행사 등).
     *   관리자 로그인 뒤 달력에서 날짜를 눌러 추가·수정·삭제할 수 있습니다.
     *   (예) { date: "2026-05-05", title: "어린이날 휴강", type: "휴강", text: "보강 일정은 추후 공지" } */
    events: [],

    // 최종 프로젝트 예시
    projectsTitle: "최종 프로젝트 예시",
    projectsLead: "학기 동안 학습한 내용을 활용하여 다음과 같은 웹플랫폼 또는 웹앱 가운데 하나를 제작합니다.",
    projects: [
      "AI 학습지원 웹앱",
      "전공 자료 큐레이션 플랫폼",
      "여행정보 웹사이트",
      "데이터 분석 대시보드",
      "연구자료 관리 플랫폼",
      "AI 퀴즈 웹앱",
      "교육 콘텐츠 플랫폼",
      "이미지·영상 아카이브",
      "지역·문화정보 지도 플랫폼",
      "개인 포트폴리오 웹사이트",
      "AI 챗봇 기반 정보검색 웹앱",
      "데이터 수집·분석·시각화 웹플랫폼",
    ],
    projectsNote: "최종 결과물은 기획 → AI 활용 → 웹 구현 → 데이터 연동 → 배포의 전 과정을 포함하도록 합니다.",
  },

  /* ── 포트폴리오: 우수 과제물 ───────────────────────────────
   *   등록은 구글 드라이브 주소(driveUrl)로만 합니다. 관리자 로그인 뒤 포트폴리오 카드의 '과제물 추가'로 올릴 수 있습니다.
   *   · 드라이브에서 파일 공유를 "링크가 있는 모든 사용자 – 뷰어"로 바꿔야 방문자가 볼 수 있습니다.
   *   · 파일 주소면 미리 보기 그림이 자동으로 표시됩니다(폴더 주소는 그림 없이 표시).
   *   · 아래 3개는 샘플입니다(주소가 SAMPLE…이라 열리지 않음). 실제 과제물로 바꾸세요. */
  portfolio: {
    id: "portfolio",
    eyebrow: "Portfolio",
    title: "우수 과제 포트폴리오",
    lead: "수강생들이 AI로 직접 기획하고 만든 우수 과제물을 소개합니다.",
    buttonLabel: "과제물 보기",
    emptyText: "아직 등록된 과제물이 없습니다.",
    items: [
      {
        title: "AI 퀴즈 웹앱",
        student: "수강생 A",
        term: "2026 상반기 · 기말 프로젝트",
        category: "웹앱",
        description: "주제를 입력하면 생성형 AI가 퀴즈를 만들어 주고 점수를 기록하는 웹앱 (샘플 설명)",
        driveUrl: "https://drive.google.com/file/d/SAMPLE_FILE_ID_1/view",
      },
      {
        title: "데이터 분석 대시보드",
        student: "수강생 B",
        term: "2026 상반기 · 기말 프로젝트",
        category: "대시보드",
        description: "CSV 데이터를 불러와 표와 차트로 보여 주는 데이터 시각화 웹페이지 (샘플 설명)",
        driveUrl: "https://drive.google.com/file/d/SAMPLE_FILE_ID_2/view",
      },
      {
        title: "지역·문화정보 지도 플랫폼",
        student: "수강생 C",
        term: "2026 상반기 · 중간 프로젝트",
        category: "웹페이지",
        description: "지도 API를 연동해 지역 문화 정보를 한눈에 보여 주는 웹페이지 (샘플 설명)",
        driveUrl: "https://drive.google.com/file/d/SAMPLE_FILE_ID_3/view",
      },
    ],
  },

  /* ── 수강 안내: 운영 방식 · 실습 도구 · 평가 · 참고자료 · 준비물 ── */
  guide: {
    id: "guide",
    eyebrow: "Guide",
    title: "수강 안내",
    lead: "수업은 강의, 실습, 프로젝트, 발표 및 피드백 형식으로 진행합니다. 매주 핵심 개념을 학습한 후 생성형 AI를 활용한 실습을 진행하며, 단계별 결과물을 누적하여 최종 웹플랫폼을 제작합니다.",

    toolsTitle: "주요 실습 도구",
    tools: [
      { icon: "💬", name: "ChatGPT", category: "생성형 AI", text: "웹 콘텐츠 기획과 코드 생성에 활용합니다." },
      { icon: "✨", name: "Claude", category: "생성형 AI", text: "웹 콘텐츠 기획과 코드 생성에 활용합니다." },
      { icon: "⌨️", name: "Claude Code", category: "AI 웹 개발", text: "프롬프트로 웹앱을 제작하는 데 활용합니다." },
      { icon: "🧠", name: "Codex", category: "AI 웹 개발", text: "프롬프트로 웹앱을 제작하는 데 활용합니다." },
      { icon: "🔮", name: "Google AI Studio", category: "생성형 AI", text: "웹 콘텐츠 기획과 AI 기능 구현에 활용합니다." },
      { icon: "📝", name: "WordPress", category: "웹 구축 도구", text: "전통적인 웹 구축 도구로 사이트를 만들어 봅니다." },
      { icon: "📄", name: "Google Sites", category: "웹 구축 도구", text: "전통적인 웹 구축 도구로 사이트를 만들어 봅니다." },
      { icon: "🎨", name: "Wix AI", category: "AI 웹 제작", text: "AI 기반 웹사이트 제작 도구로 활용합니다." },
      { icon: "🖼️", name: "Framer AI", category: "AI 웹 제작", text: "AI 기반 웹사이트 제작 도구로 활용합니다." },
      { icon: "💜", name: "Lovable", category: "AI 웹앱 제작", text: "AI 기반 웹앱 제작에 활용합니다." },
      { icon: "🔁", name: "Replit", category: "AI 웹앱 제작", text: "AI 기반 웹앱 제작에 활용합니다." },
      { icon: "🐙", name: "GitHub", category: "코드 관리", text: "저장소를 만들고 웹프로젝트를 연결합니다." },
      { icon: "🚆", name: "Railway", category: "배포", text: "제작한 웹앱을 실제 웹에 배포합니다." },
    ],

    // 평가 (percent는 숫자. 합계 100)
    gradingTitle: "평가",
    grading: [
      { label: "중간평가 또는 중간 프로젝트", percent: 30 },
      { label: "기말 프로젝트", percent: 40 },
      { label: "출석", percent: 10 },
      { label: "실습과제", percent: 10 },
      { label: "수업 참여 및 발표", percent: 10 },
    ],
    gradingNote: "※ 세부 평가 방식은 수업 운영 상황에 따라 조정할 수 있습니다.",

    // 교재와 참고자료 (href를 비우면 링크 없이 이름만 표시)
    referencesTitle: "교재와 참고자료",
    referencesLead: "별도의 지정 교재보다는 교수자가 제공하는 강의자료와 최신 온라인 자료를 중심으로 진행합니다.",
    references: [
      { label: "MDN Web Docs", href: "https://developer.mozilla.org" },
      { label: "W3Schools", href: "https://www.w3schools.com" },
      { label: "WordPress Documentation", href: "https://wordpress.org/documentation/" },
      { label: "Google Sites Help", href: "https://support.google.com/sites" },
      { label: "GitHub Docs", href: "https://docs.github.com" },
      { label: "Railway Documentation", href: "https://docs.railway.com" },
      { label: "OpenAI Documentation", href: "https://platform.openai.com/docs" },
      { label: "Anthropic Claude Documentation", href: "https://docs.anthropic.com" },
      { label: "Google AI for Developers", href: "https://ai.google.dev" },
      { label: "Vercel Documentation", href: "https://vercel.com/docs" },
    ],
    referencesNote: "생성형 AI 및 웹 개발 기술의 변화가 빠른 분야이므로 최신 사례와 온라인 문서를 지속적으로 활용합니다.",

    prepTitle: "수강 준비물",
    prep: [
      { icon: "💻", title: "노트북", text: "실습용 개인 노트북" },
      { icon: "📧", title: "Google 계정", text: "Google AI Studio, Google Sites 실습에 사용" },
      { icon: "🔐", title: "AI 도구 계정", text: "ChatGPT, Claude 등 실습 도구 로그인에 사용" },
      { icon: "🐙", title: "GitHub 계정", text: "14주차 웹앱 배포 실습에 사용" },
    ],
  },

  /* ── 참여하기: 투표 + 수강 신청서 ──────────────────────── */
  participate: {
    id: "participate",
    eyebrow: "Join",
    title: "참여하기",
    lead: "여러분의 의견을 들려주고, 수강 신청서를 작성해 주세요.",

    /* 설문 — 여러 개를 둘 수 있습니다. 관리자 로그인 뒤 '참여하기'에서 추가·수정·삭제하세요.
     *   id        : 설문마다 다른 값(응답이 이 값으로 구분됩니다. 바꾸지 마세요)
     *   options   : 보기
     *   createdAt : 만든 날짜와 시각
     *   open      : true면 화면에 표시, false면 숨김(관리자의 히스토리 표에만 남음) */
    pollsTitle: "설문",
    polls: [
      {
        id: "p1",
        title: "가장 먼저 배우고 싶은 주제는?",
        help: "하나를 골라 주세요. 다시 눌러 바꿀 수 있습니다.",
        options: [
          "AI로 웹페이지 만들기 (HTML·CSS·JavaScript)",
          "데이터 시각화와 대시보드",
          "API 연동과 AI 웹앱 제작",
          "GitHub로 웹앱 배포하기",
        ],
        createdAt: "2026-10-03T12:00",
        open: true,
      },
    ],

    apply: {
      title: "수강 신청서",
      // 안내 문구. 서버를 연결한 뒤에는 지우거나 바꾸세요.
      notice: "지금은 시범 운영 중이라 신청서가 이 기기(브라우저)에만 저장됩니다.",
      // 신청서를 받을 서버 주소(Google Apps Script, Formspree 등). 비워 두면 이 브라우저에만 저장합니다.
      endpoint: "",
      submitLabel: "신청서 제출하기",
      successTitle: "신청서가 접수되었습니다 🌸",
      successText: "작성해 주셔서 고맙습니다. 확인 후 안내드리겠습니다.",
      /* 입력 항목
       *   type     : text · email · tel · select · textarea · checkbox
       *   required : true면 비워 둘 수 없습니다.
       *   pattern  : 형식 검사(정규식), patternMsg : 형식이 틀렸을 때 안내 문구 */
      fields: [
        { name: "name", label: "이름", type: "text", required: true, placeholder: "홍길동" },
        { name: "studentId", label: "학번", type: "text", required: true, placeholder: "숫자 10자리", pattern: "^\\d{10}$", patternMsg: "학번은 숫자 10자리로 입력해 주세요." },
        { name: "department", label: "소속 학과", type: "text", required: true, placeholder: "○○학과" },
        { name: "grade", label: "학년", type: "select", required: true, options: ["1학년", "2학년", "3학년", "4학년", "대학원생"] },
        { name: "email", label: "이메일", type: "email", required: true, placeholder: "name@example.com" },
        { name: "phone", label: "연락처", type: "tel", required: false, placeholder: "010-0000-0000", pattern: "^[0-9-]{9,13}$", patternMsg: "연락처는 숫자와 -만 입력해 주세요." },
        { name: "motivation", label: "수강 동기", type: "textarea", required: true, placeholder: "이 강의에서 무엇을 만들어 보고 싶은지 적어 주세요." },
        { name: "agree", label: "개인정보 수집·이용에 동의합니다.", type: "checkbox", required: true },
      ],
    },
  },

  /* ── 내 강의실: 로그인 · 출석 · 과제 제출 ──────────────── */
  classroom: {
    id: "classroom",
    eyebrow: "My Class",
    title: "내 강의실",
    lead: "로그인하면 출석을 체크하고 과제를 제출할 수 있습니다.",
    // 안내 문구. 서버를 연결한 뒤에는 지우거나 바꾸세요.
    notice: "지금은 시범 운영 중이라 출석·제출 기록이 이 기기(브라우저)에만 저장되고, 파일은 서버로 전송되지 않습니다.",
    // 수강 코드와 수강생 명단은 원문 대신 지문(해시)으로 저장됩니다.
    // 직접 고치지 말고 관리자 화면(오른쪽 위 자물쇠) → '수강생 명단'에서 바꾸세요.
    accessCodeHash: "c17a20306857aca4088143ade1b8406dc1d4cc339c3fec4459401ea59dd3b37f",
    rosterHashes: [], // 비어 있으면 수강 코드만 맞으면 로그인됩니다.
    // true면 수업일이 아니어도 주차를 눌러 출석을 체크할 수 있습니다(미리 보기용). 실제 운영 때는 false로 바꾸세요.
    testMode: true,
    // 제출 가능한 파일 형식과 최대 크기(MB)
    fileAccept: ".pdf,.docx,.hwp,.hwpx,.pptx,.xlsx,.zip",
    fileMaxMB: 20,
  },

  /* ── 안내 팝업 ─────────────────────────────────────────
   *   popup  : 모든 팝업에 공통인 설정
   *   popups : 팝업 목록. 여러 개를 둘 수 있고, enabled가 true인 것이 차례로 뜹니다.
   *            관리자 화면(자물쇠) → '팝업'에서 추가·수정·삭제할 수 있습니다.
   *     id          : 팝업마다 다른 값('오늘 하루 보지 않기' 기록에 씁니다. 바꾸지 마세요)
   *     buttonLabel : 비워 두면 버튼 없이 안내만 보여 줍니다. */
  popup: {
    delaySeconds: 2, // 접속 후 몇 초 뒤에 띄울지
    hideTodayLabel: "오늘 하루 보지 않기",
  },
  popups: [
    {
      id: "pop1",
      enabled: true,
      badge: "수강 신청 안내",
      title: "2026 상반기 수강 신청을 받고 있습니다",
      text: "신청 기간과 방법을 이곳에 적어 주세요. 정원이 차면 조기 마감될 수 있습니다.",
      buttonLabel: "수강 신청하러 가기",
      buttonHref: "#apply",
    },
  ],

  /* ── 첫 방문 환영 효과 ─────────────────────────────────── */
  welcome: {
    fireworks: true, // 폭죽 효과 (처음 방문한 사람에게 한 번만)
    message: "처음 오셨군요! 환영합니다 🎉",
  },

  /* ── FAQ ───────────────────────────────────────────────── */
  faq: {
    id: "faq",
    eyebrow: "FAQ",
    title: "자주 묻는 질문",
    lead: "수강생들이 자주 묻는 내용을 모았습니다.",
    items: [
      {
        q: "수업은 어떤 방식으로 진행되나요?",
        a: "강의, 실습, 프로젝트, 발표 및 피드백 형식으로 진행합니다. 매주 핵심 개념을 학습한 후 생성형 AI를 활용한 실습을 진행하며, 단계별 결과물을 누적하여 최종 웹플랫폼을 제작합니다.",
      },
      {
        q: "교재가 따로 있나요?",
        a: "별도의 지정 교재보다는 교수자가 제공하는 강의자료와 MDN Web Docs, W3Schools, GitHub Docs 등 최신 온라인 자료를 중심으로 진행합니다.",
      },
      {
        q: "어떤 도구를 사용하나요?",
        a: "ChatGPT, Claude, Claude Code, Codex, Google AI Studio, WordPress, Google Sites, Wix AI, Framer AI, Lovable, Replit, GitHub, Railway 등을 사용합니다.",
      },
      {
        q: "평가는 어떻게 하나요?",
        a: "중간평가 또는 중간 프로젝트 30%, 기말 프로젝트 40%, 출석 10%, 실습과제 10%, 수업 참여 및 발표 10%입니다. 세부 평가 방식은 수업 운영 상황에 따라 조정할 수 있습니다.",
      },
      {
        q: "최종 프로젝트로 무엇을 만드나요?",
        a: "개인 또는 팀별로 AI 기반 웹플랫폼이나 웹앱을 만듭니다. 예를 들어 AI 학습지원 웹앱, 데이터 분석 대시보드, 개인 포트폴리오 웹사이트 등이 있으며, 기획 → AI 활용 → 웹 구현 → 데이터 연동 → 배포의 전 과정을 포함해야 합니다.",
      },
    ],
  },

  /* ── 교수자 (페이지 끝 푸터) ───────────────────────────── */
  instructor: {
    id: "instructor",
    eyebrow: "Instructor",
    title: "교수자",
    name: "박정원 교수",
    nameSub: "朴正元 | Park Jeong Weon",
    role: "한국외국어대학교 중국학대학 중국언어문화학부",
    roleSub: "Division of Chinese Language, Literature and Culture",
    photo: "images/professor.jpg", // 사진 파일 경로. 비워 두면 이름 첫 글자가 표시됩니다.
    // 소개 글(여러 문단 가능). 비워 두면 표시하지 않습니다.
    bio: [
      "AI 기반 교육 콘텐츠 제작, 데이터 분석, 데이터 시각화 및 웹플랫폼 개발을 연구·교육하며, 생성형 AI를 활용한 교육 및 연구 방법론을 개발하고 있습니다.",
      "주요 관심 분야는 생성형 AI, AI 데이터 분석, 디지털인문학, 웹플랫폼, AI 자동화, 데이터 큐레이션 및 시각화이며, ChatGPT, Claude Code, Codex, Google AI Studio, Make, n8n 등 다양한 AI 도구를 활용한 교육 및 연구를 진행합니다.",
    ],
    career: [
      "국가교육위원회 AI특별위원회 위원",
      "교육부 AI인재양성추진단",
    ],
    // 저술·자료 목록. 누르면 새 창으로 열립니다.
    worksTitle: "저술",
    works: [
      { title: "데이터 큐레이팅", href: "https://www.upaper.net/auraweon/1144732" },
      { title: "AI 데이터 자동화: N8N(기업업무편)", href: "https://auraweon.upaper.kr/content/1204663" },
      { title: "AI 데이터 자동화: OPAL", href: "https://auraweon.upaper.kr/content/1204909" },
      { title: "AI 미디어 큐레이션", href: "https://auraweon.upaper.kr/content/1220294" },
      { title: "AI 대시보드", href: "https://auraweon.upaper.kr/content/1221085" },
      { title: "AI 데이터 자동화", href: "https://auraweon.upaper.kr/content/1224709" },
    ],
    contacts: [
      { icon: "📱", label: "mobile", value: "010-9131-6127", href: "tel:010-9131-6127" },
      { icon: "✉️", label: "email", value: "park9626@hanmail.net", href: "mailto:park9626@hanmail.net" },
      { icon: "🏢", label: "address", value: "02450 서울특별시 동대문구 이문로 107 교수회관 529호", href: "" },
      { icon: "🌐", label: "APP", value: "www.kletter.kr", href: "https://www.kletter.kr" },
      { icon: "🌐", label: "APP", value: "www.kteacher.kr", href: "https://www.kteacher.kr" },
    ],
  },

  /* ── 관리자 ────────────────────────────────────────────── */
  admin: {
    // 관리자 비밀번호의 지문(해시). 비밀번호 자체는 어디에도 저장되지 않습니다.
    // 비어 있으면 자물쇠를 처음 누를 때 비밀번호를 만들게 됩니다. 잊어버렸다면 ""로 비우세요.
    passwordHash: "bf3d6efe579d4d812b56b824a177a93deccd2586d153e5c03276d756db3a6e35",
  },

  /* ── 맨 아래 한 줄 ─────────────────────────────────────── */
  footer: {
    copyright: "Copyright 2026 ⓒ AI WEB, All Rights Reserved. | 박정원(한국외국어대학교)",
    links: [
      { icon: "✉️", label: "AI 뉴스레터 빌더", text: "www.kletter.kr", href: "https://www.kletter.kr" },
      { icon: "🎓", label: "AI 강의콘텐츠 빌더", text: "www.kteacher.kr", href: "https://www.kteacher.kr" },
    ],
  },
};

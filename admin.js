/* 관리자 모드 — 오른쪽 위 자물쇠를 누르면 열립니다.
 * 주의: 서버가 없는 정적 사이트라 여기서 고친 내용은 '이 브라우저'에만 저장됩니다.
 *       모든 방문자에게 반영하려면 '설정 파일 내려받기'로 받은 config.js로 교체해 다시 올려야 합니다. */
(function () {
  "use strict";

  // app.js가 화면을 다 그린 뒤(서버 응답을 받은 뒤)에 시작합니다.
  if (window.KU) startAdmin(); else document.addEventListener("ku:ready", startAdmin);

  function startAdmin() {
  var KU = window.KU;
  if (!KU) return;
  var store = KU.store, makeForm = KU.makeForm, C = KU.config;
  var REMOTE = KU.remote; // true면 서버(DB)에 저장

  // 서버에 저장될 때는 '이 브라우저에만 저장' 안내 문구를 바꿔 보여 줍니다.
  function serverText(t) {
    if (typeof t !== "string") return t;
    return t
      .replace(/이 브라우저에 저장된 기록만 보입니다\..*$/, "서버(DB)에 모인 전체 기록입니다.")
      .replace(/바꾼 뒤 '저장하고 적용' → 설정 파일을 내려받아 교체해야 다른 기기에도 적용됩니다\./, "바꾼 뒤 '저장하고 적용'을 누르면 서버에 저장되어 바로 적용됩니다. (Railway 변수 ADMIN_PASSWORD를 쓰는 경우에는 그 값이 우선합니다.)")
      .replace(/^참고: 서버 없는 사이트의 관리자 잠금은.*$/, "참고: 관리자 비밀번호는 서버가 확인합니다. 다만 비밀번호 지문(해시)이 설정 안에 들어 있으므로 길고 다른 곳에서 쓰지 않는 비밀번호를 쓰세요. Railway 변수 ADMIN_PASSWORD를 넣으면 지문 대신 그 값으로 확인합니다.")
      .replace(/참여 수는 이 브라우저에 저장된 응답만 셉니다\./, "참여 수는 서버에 모인 전체 응답입니다.")
      .replace(/(바로 )?이 브라우저에(서)? (바로 )?(저장|반영)(됩니다\.|되며,)\s*모든 방문자에게[^.]*config\.js를 내려받아 교체하세요\./, "서버(DB)에 저장되어 모든 방문자에게 바로 반영됩니다.");
  }
  var h = !REMOTE ? KU.h : function (tag, attrs, children) {
    return KU.h(tag, attrs, Array.isArray(children) ? children.map(serverText) : serverText(children));
  };
  function adminToken() { var s = store.get("adminLogin", null); return s && s.token; }
  // 관리자 권한이 필요한 요청. 로그인이 풀렸으면 알려 줍니다.
  function adminCall(method, path, body) {
    return KU.call(method, path, body, adminToken()).catch(function (err) {
      if (err.status === 401) { setAdmin(false); KU.toast("관리자 로그인이 풀렸습니다. 다시 로그인해 주세요."); }
      else KU.toast("저장하지 못했습니다: " + err.message);
      throw err;
    });
  }

  // 화면 계산용 임시 값(_로 시작)은 빼고 복사
  function clone(o) {
    return JSON.parse(JSON.stringify(o, function (k, v) { return k.charAt(0) === "_" ? undefined : v; }));
  }
  var draft = clone(C); // 편집 중인 설정
  var dirty = false;

  var SESSION_KEY = "kucourse:admin";
  /* 관리자 로그인 상태는 이 브라우저에 저장되어 새로고침하거나 창을 닫았다 열어도 유지됩니다.
   * LOGIN_DAYS일이 지나거나, 로그아웃하거나, 비밀번호가 바뀌면 다시 로그인해야 합니다. */
  var LOGIN_DAYS = 7;
  function isAdmin() {
    var s = store.get("adminLogin", null);
    if (REMOTE) return !!(s && s.token && Date.now() < s.until); // 실제 권한은 서버가 토큰으로 확인
    return !!(s && s.hash && s.hash === C.admin.passwordHash && Date.now() < s.until);
  }
  function setAdmin(on, token) {
    var until = Date.now() + LOGIN_DAYS * 86400000;
    store.set("adminLogin", !on ? null : REMOTE ? { token: token, until: until } : { hash: C.admin.passwordHash, until: until });
    showAdminState();
  }
  // 관리자 로그인 중이면 자물쇠가 열리고, 각 섹션에 '편집' 버튼이 나타납니다.
  function showAdminState() {
    var on = isAdmin();
    document.body.classList.toggle("is-admin", on);
    var lock = document.getElementById("adminBtn");
    lock.textContent = on ? "🔓" : "🔒";
    lock.setAttribute("aria-label", on ? "관리자 화면 열기" : "관리자 모드");
    if (KU.calendar) KU.calendar.refresh(); // 달력의 일정 관리 도구를 보이거나 숨김
    if (KU.portfolio) KU.portfolio.refresh(); // 포트폴리오 카드의 추가·수정·삭제 버튼
    if (KU.guide) KU.guide.refresh(); // 수강 안내 카드의 추가·수정·삭제 버튼
    if (KU.polls) KU.polls.refresh(); // 설문 추가 칸과 히스토리 표
    if (KU.notices) KU.notices.refresh(); // 공지 카드의 추가·수정·삭제 버튼
  }

  /* ── 포트폴리오 카드에서 바로 추가·수정·삭제 ──
   * 관리자 로그인 중에는 카드마다 수정·삭제 버튼이, 목록 끝에는 '추가' 칸이 나타납니다.
   * 바꾸는 즉시 이 브라우저에 저장되고 화면에 반영됩니다. */
  var FOLIO_CATS = ["웹페이지", "웹앱", "대시보드", "기타"];
  function applyFolio() {
    saveDraft(false);
    KU.portfolio.refresh(clone(draft.portfolio.items));
  }
  // idx가 -1이면 새로 추가, 아니면 그 번호의 과제물 수정
  function folioDialog(idx) {
    var items = draft.portfolio.items;
    var cur = idx >= 0 ? items[idx] : null;
    var cats = cur && cur.category && FOLIO_CATS.indexOf(cur.category) < 0 ? FOLIO_CATS.concat([cur.category]) : FOLIO_CATS;
    var close;
    var form = makeForm([
      { name: "driveUrl", label: "구글 드라이브 주소", type: "text", required: true, wide: true, placeholder: "https://drive.google.com/file/d/…/view", hint: "드라이브에서 파일 → 공유 → 링크 복사 (공유 범위: 링크가 있는 모든 사용자)" },
      { name: "title", label: "과제물 제목", type: "text", required: true, wide: true },
      { name: "student", label: "학생 표시 이름", type: "text", required: true, wide: true, placeholder: "예: 김○○ 또는 수강생 A" },
      { name: "term", label: "학기·과제 구분", type: "text", required: false, wide: true, placeholder: "예: 2026 상반기 · 기말 프로젝트" },
      { name: "category", label: "분류", type: "select", required: true, wide: true, options: cats },
      { name: "description", label: "소개", type: "textarea", required: false },
    ], cur ? "수정 내용 저장" : "포트폴리오에 추가", function (v, api) {
      if (!KU.driveId(v.driveUrl)) return api.fail("driveUrl", "구글 드라이브 주소가 아닙니다. drive.google.com 또는 docs.google.com 주소를 넣어 주세요.");
      var item = { title: v.title, student: v.student, term: v.term, category: v.category, description: v.description, driveUrl: v.driveUrl };
      if (cur) items[idx] = item; else items.push(item);
      close();
      applyFolio();
    });
    if (cur) ["driveUrl", "title", "student", "term", "category", "description"].forEach(function (k) { form.setValue(k, cur[k] || ""); });
    close = dialog(cur ? "과제물 수정" : "과제물 추가", "", form, "🏆");
  }
  KU.onFolioCard = function (cover, idx) {
    if (!isAdmin()) return;
    var armed = false;
    cover.appendChild(h("div", { class: "folio-admin" }, [
      button("✏️ 수정", "ad-mini", function () { folioDialog(idx); }),
      button("🗑 삭제", "ad-mini danger", function (b) {
        if (!armed) { // 실수로 지우지 않게 두 번 눌러야 삭제
          armed = true;
          b.textContent = "한 번 더 누르면 삭제";
          setTimeout(function () { armed = false; b.textContent = "🗑 삭제"; }, 4000);
          return;
        }
        draft.portfolio.items.splice(idx, 1);
        applyFolio();
      }),
    ]));
  };
  KU.onFolioGrid = function (grid) {
    if (!isAdmin()) return false;
    var tile = h("button", { class: "folio-add", type: "button" }, [
      h("span", { class: "folio-add-plus", "aria-hidden": "true" }, "＋"),
      h("b", {}, "과제물 추가"),
      h("span", {}, "구글 드라이브 주소로 등록"),
    ]);
    tile.addEventListener("click", function () { folioDialog(-1); });
    grid.appendChild(tile);
    return true;
  };

  /* ── 주차별 학습: 주차 카드에서 바로 추가·수정·삭제 ──
   * 주차마다 강의 자료(구글 드라이브)와 참고 영상(YouTube)을 붙일 수 있습니다.
   * 저장하면 수업 날짜·달력을 다시 계산해야 해서 화면을 새로 고칩니다. */
  function weekTemplate(n) {
    return { week: n, title: "", tag: "", topics: [""], materials: [], videos: [] };
  }
  // idx가 -1이면 새 주차, 아니면 그 번호의 주차 수정
  function weekDialog(idx) {
    var weeks = draft.curriculum.weeks;
    var isNew = idx < 0;
    var w = isNew ? weekTemplate(weeks.length + 1) : clone(weeks[idx]); // 복사본을 고치고, 저장할 때만 반영
    if (!Array.isArray(w.topics)) w.topics = [];
    if (!Array.isArray(w.materials)) w.materials = [];
    if (!Array.isArray(w.videos)) w.videos = [];
    // 편집 칸 순서: 주차 번호·제목·꼬리표 → 학습 내용 → 강의 자료 → 참고 영상 → (과제·날짜)
    var ordered = {};
    ["week", "title", "tag", "topics", "materials", "videos"].forEach(function (k) { ordered[k] = w[k]; });
    Object.keys(w).forEach(function (k) { if (!(k in ordered)) ordered[k] = w[k]; });
    w = ordered;

    var close;
    var alertBox = h("div", { class: "form-alert", role: "alert", hidden: "hidden" });
    var editorBox = h("div", {});
    function render() {
      editorBox.textContent = "";
      editorBox.appendChild(objectEditor(w, render));
    }
    function fail(msg) { alertBox.hidden = false; alertBox.textContent = msg; alertBox.scrollIntoView({ block: "nearest" }); }
    var save = button(isNew ? "주차 추가" : "수정 내용 저장", "btn btn-primary", function () {
      if (!String(w.title || "").trim()) return fail("제목을 입력해 주세요.");
      w.topics = w.topics.filter(function (t) { return String(t || "").trim(); });
      w.materials = w.materials.filter(function (m) { return m && String(m.url || "").trim(); });
      w.videos = w.videos.filter(function (v) { return v && String(v.url || "").trim(); });
      var badMaterial = w.materials.filter(function (m) { return !KU.driveId(m.url.trim()); })[0];
      if (badMaterial) return fail("강의 자료 주소가 구글 드라이브 주소가 아닙니다: " + badMaterial.url);
      var badVideo = w.videos.filter(function (v) { return !/^https?:\/\//.test(v.url.trim()); })[0];
      if (badVideo) return fail("참고 영상 주소는 https://로 시작해야 합니다: " + badVideo.url);
      w.materials.forEach(function (m) { m.url = m.url.trim(); });
      w.videos.forEach(function (v) { v.url = v.url.trim(); });
      if (isNew) weeks.push(w); else weeks[idx] = w;
      saved = true;
      close();
      saveDraft(true, "weeks-title");
    });
    var saved = false;
    render();
    close = dialog(isNew ? "주차 추가" : (w.week + "주차 수정"), "", h("div", { class: "guide-edit" }, [alertBox, editorBox, save]), "🗓️");
    var backs = document.querySelectorAll(".modal-backdrop");
    backs[backs.length - 1].querySelector(".modal").classList.add("modal-wide");
  }
  // 주차 카드마다 수정·삭제 버튼, 목록 끝에 '주차 추가' 칸 (관리자 로그인 중에만 보임)
  (function () {
    var list = document.querySelector("#curriculum .week-list");
    if (!list) return;
    [].forEach.call(list.querySelectorAll(".week-item"), function (item, idx) {
      var edit = button("✏️", "ad-mini", function () { if (isAdmin()) weekDialog(idx); });
      edit.title = "수정";
      edit.setAttribute("aria-label", "이 주차 수정");
      item.querySelector("summary").appendChild(h("span", { class: "card-admin in-summary admin-only" }, [
        edit,
        deleteButton(function () {
          if (!isAdmin()) return;
          draft.curriculum.weeks.splice(idx, 1);
          saveDraft(true, "weeks-title");
        }),
      ]));
    });
    var tile = h("button", { class: "folio-add small admin-only", type: "button" }, [
      h("span", { class: "folio-add-plus", "aria-hidden": "true" }, "＋"),
      h("b", {}, "주차 추가"),
    ]);
    tile.addEventListener("click", function () { if (isAdmin()) weekDialog(-1); });
    list.appendChild(tile);
  })();

  /* ── 공지사항: 카드에서 바로 추가·수정·삭제 ── */
  function applyNotices() {
    saveDraft(false);
    KU.notices.refresh(clone(draft.notices.items));
  }
  // idx가 -1이면 새 공지, 아니면 그 번호의 공지 수정
  function noticeDialog(idx) {
    var items = draft.notices.items = draft.notices.items || [];
    var cur = idx >= 0 ? items[idx] : null;
    var close;
    var form = makeForm([
      { name: "title", label: "제목", type: "text", required: true, wide: true },
      { name: "text", label: "내용", type: "textarea", required: false, placeholder: "카드를 눌렀을 때 펼쳐질 내용" },
      { name: "date", label: "날짜", type: "date", required: true, wide: true },
      { name: "pinned", label: "중요 공지로 맨 위에 고정", type: "checkbox", required: false },
    ], cur ? "수정 내용 저장" : "공지 올리기", function (v) {
      var item = { title: v.title, text: v.text, date: v.date, pinned: v.pinned };
      if (cur) items[idx] = item; else items.push(item);
      close();
      applyNotices();
    });
    form.setValue("date", cur && cur.date ? cur.date : today());
    if (cur) {
      form.setValue("title", cur.title || "");
      form.setValue("text", cur.text || "");
      form.setValue("pinned", !!cur.pinned);
    }
    close = dialog(cur ? "공지 수정" : "공지 추가", "", form, "📢");
  }
  KU.onNoticeCard = function (summary, idx) {
    if (!isAdmin()) return;
    var edit = button("✏️", "ad-mini", function () { noticeDialog(idx); });
    edit.title = "수정";
    edit.setAttribute("aria-label", "수정");
    summary.appendChild(h("span", { class: "card-admin in-summary" }, [
      edit,
      deleteButton(function () { draft.notices.items.splice(idx, 1); applyNotices(); }),
    ]));
  };
  KU.onNoticeList = function (box) {
    if (!isAdmin()) return false;
    var tile = h("button", { class: "folio-add small", type: "button" }, [
      h("span", { class: "folio-add-plus", "aria-hidden": "true" }, "＋"),
      h("b", {}, "공지 추가"),
    ]);
    tile.addEventListener("click", function () { noticeDialog(-1); });
    box.appendChild(tile);
    return true;
  };

  /* ── 설문 관리: 추가·수정·삭제 + 히스토리 표 ──
   * 관리자 로그인 중에는 설문 목록 끝에 '설문 추가' 칸이, 그 바로 아래에 히스토리 표가 나타납니다. */
  function nowStamp() {
    var d = new Date();
    return today() + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function applyPolls() {
    saveDraft(false);
    KU.polls.refresh(clone(draft.participate.polls));
  }
  function clearVotes(id) {
    var all = store.get("pollVotes", {});
    delete all[id];
    store.set("pollVotes", all);
    if (REMOTE) adminCall("POST", "admin/poll/clear", { pollId: id }).then(function (res) { KU.setPollCounts(res.polls); }, function () {});
  }
  // idx가 -1이면 새 설문, 아니면 그 번호의 설문 수정
  function pollDialog(idx) {
    var polls = draft.participate.polls = draft.participate.polls || [];
    var cur = idx >= 0 ? polls[idx] : null;
    var close;
    var form = makeForm([
      { name: "title", label: "주제(질문)", type: "text", required: true, wide: true, placeholder: "예: 가장 어려웠던 주차는?" },
      { name: "help", label: "안내 문구", type: "text", required: false, wide: true, placeholder: "예: 하나를 골라 주세요." },
      { name: "options", label: "보기 (한 줄에 하나)", type: "textarea", required: true, hint: cur ? "보기를 바꾸면 이 설문의 기존 응답은 지워집니다." : "두 개 이상 적어 주세요." },
      { name: "open", label: "화면에 표시 (끄면 숨김 — 히스토리에만 남음)", type: "checkbox", required: false },
    ], cur ? "수정 내용 저장" : "설문 만들기", function (v, api) {
      var opts = v.options.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (opts.length < 2) return api.fail("options", "보기를 두 개 이상 적어 주세요.");
      if (cur) {
        if (JSON.stringify(opts) !== JSON.stringify(cur.options)) clearVotes(cur.id);
        cur.title = v.title; cur.help = v.help; cur.options = opts; cur.open = v.open;
      } else {
        polls.push({ id: "p" + Date.now().toString(36), title: v.title, help: v.help, options: opts, createdAt: nowStamp(), open: v.open });
      }
      close();
      applyPolls();
    });
    form.setValue("open", cur ? cur.open !== false : true);
    if (cur) {
      form.setValue("title", cur.title || "");
      form.setValue("help", cur.help || "");
      form.setValue("options", cur.options.join("\n"));
    }
    close = dialog(cur ? "설문 수정" : "설문 추가", "", form, "🗳️");
  }
  // 설문 숨기기/다시 보이기. 숨긴 설문은 방문자 화면에서 사라지고 히스토리 표에만 남습니다(응답은 유지).
  function setPollOpen(id, open) {
    (draft.participate.polls || []).forEach(function (p) { if (p.id === id) p.open = open; });
    applyPolls();
  }
  KU.onPollCard = function (card, poll) {
    if (!isAdmin()) return;
    var idx = -1;
    (draft.participate.polls || []).forEach(function (p, i) { if (p.id === poll.id) idx = i; });
    card.appendChild(h("div", { class: "card-admin" }, [
      button("🙈 숨기기", "ad-mini", function () { setPollOpen(poll.id, false); }),
      button("✏️ 수정", "ad-mini", function () { pollDialog(idx); }),
    ]));
  };
  KU.onPollsRender = function (box, adminBox) {
    adminBox.textContent = "";
    if (!isAdmin()) return;
    var polls = draft.participate.polls = draft.participate.polls || [];

    var tile = h("button", { class: "folio-add small", type: "button" }, [
      h("span", { class: "folio-add-plus", "aria-hidden": "true" }, "＋"),
      h("b", {}, "설문 추가"),
    ]);
    tile.addEventListener("click", function () { pollDialog(-1); });
    box.appendChild(tile);

    // 최근에 만든 설문이 위로
    var order = polls.map(function (p, i) { return i; }).sort(function (a, b) {
      return String(polls[b].createdAt || "").localeCompare(String(polls[a].createdAt || "")) || b - a;
    });
    adminBox.appendChild(h("div", { class: "poll-history" }, [
      h("div", { class: "ad-row between" }, [
        h("h3", { class: "sub-title" }, "설문 히스토리"),
        button("＋ 설문 추가", "btn btn-primary btn-sm", function () { pollDialog(-1); }),
      ]),
      polls.length ? h("div", { class: "ad-table-wrap" }, [
        h("table", { class: "ad-table" }, [
          h("thead", {}, [h("tr", {}, ["생성일시", "주제", "상태", "참여", "열기", "숨기기", "수정", "삭제"].map(function (x) { return h("th", {}, x); }))]),
          h("tbody", {}, order.map(function (i) {
            var p = polls[i];
            var open = p.open !== false;
            return h("tr", { class: open ? "" : "is-hidden" }, [
              h("td", {}, p.createdAt ? String(p.createdAt).replace("T", " ") : "—"),
              h("td", { class: "poll-h-title" }, p.title),
              h("td", {}, [h("span", { class: "tag" + (open ? " tag-assign" : " tag-closed") }, open ? "표시 중" : "숨김")]),
              h("td", {}, KU.polls.stats(p).total + "표"),
              h("td", {}, [button("열기", "ad-mini", function () {
                dialog("설문 결과", (open ? "표시 중" : "숨김") + (p.createdAt ? " · " + String(p.createdAt).replace("T", " ") : ""), KU.polls.card(p, true), "🗳️");
              })]),
              h("td", {}, [button(open ? "🙈 숨기기" : "👁 보이기", "ad-mini", function () { setPollOpen(p.id, !open); })]),
              h("td", {}, [button("수정", "ad-mini", function () { pollDialog(i); })]),
              h("td", {}, [deleteButton(function () { clearVotes(p.id); polls.splice(i, 1); applyPolls(); })]),
            ]);
          })),
        ]),
      ]) : h("p", { class: "cal-empty" }, "아직 만든 설문이 없습니다."),
      h("p", { class: "field-hint" }, "이 표는 관리자에게만 보입니다. 숨긴 설문도 여기에 남으며 '보이기'로 되돌릴 수 있습니다. 참여 수는 이 브라우저에 저장된 응답만 셉니다. 추가·수정·삭제는 바로 이 브라우저에 저장되며, 모든 방문자에게 보이게 하려면 config.js를 내려받아 교체하세요."),
    ]));
  };

  /* ── 수강 안내 카드에서 바로 추가·수정·삭제 (포트폴리오와 같은 방식) ──
   * 실습 도구·준비물: 카드마다 수정·삭제, 목록 끝에 '추가' 칸
   * 평가·참고자료   : 카드의 '수정' 버튼으로 항목 목록을 편집 */
  KU.adminOn = isAdmin;
  var GUIDE_KINDS = {
    tools: {
      name: "실습 도구",
      fields: [
        { name: "icon", label: "아이콘(이모지)", type: "text", required: false, wide: true, placeholder: "예: 💬" },
        { name: "name", label: "도구 이름", type: "text", required: true, wide: true },
        { name: "category", label: "분류", type: "text", required: false, wide: true, placeholder: "예: 생성형 AI" },
        { name: "text", label: "설명", type: "textarea", required: false },
      ],
    },
    prep: {
      name: "준비물",
      fields: [
        { name: "icon", label: "아이콘(이모지)", type: "text", required: false, wide: true, placeholder: "예: 💻" },
        { name: "title", label: "준비물 이름", type: "text", required: true, wide: true },
        { name: "text", label: "설명", type: "textarea", required: false },
      ],
    },
  };
  function applyGuide() {
    saveDraft(false);
    KU.guide.refresh(clone(draft.guide));
  }
  // idx가 -1이면 새로 추가, 아니면 그 번호의 카드 수정
  function guideDialog(kind, idx) {
    var def = GUIDE_KINDS[kind];
    var items = draft.guide[kind];
    var cur = idx >= 0 ? items[idx] : null;
    var close;
    var form = makeForm(def.fields, cur ? "수정 내용 저장" : def.name + " 추가", function (v) {
      var item = {};
      def.fields.forEach(function (f) { item[f.name] = v[f.name]; });
      if (!item.icon) item.icon = "📌";
      if (cur) items[idx] = item; else items.push(item);
      close();
      applyGuide();
    });
    if (cur) def.fields.forEach(function (f) { form.setValue(f.name, cur[f.name] || ""); });
    close = dialog(def.name + (cur ? " 수정" : " 추가"), "", form, "🧰");
  }
  // 누르면 '한 번 더'로 바뀌고, 다시 눌러야 실행되는 삭제 버튼
  function deleteButton(fn) {
    var armed = false;
    var b = button("🗑", "ad-mini danger", function () {
      if (!armed) {
        armed = true;
        b.textContent = "삭제?";
        setTimeout(function () { armed = false; b.textContent = "🗑"; }, 4000);
        return;
      }
      fn();
    });
    b.title = "삭제";
    b.setAttribute("aria-label", "삭제");
    return b;
  }
  KU.onGuideCard = function (card, kind, idx) {
    if (!isAdmin()) return;
    var edit = button("✏️", "ad-mini", function () { guideDialog(kind, idx); });
    edit.title = "수정";
    edit.setAttribute("aria-label", "수정");
    card.appendChild(h("div", { class: "card-admin" }, [
      edit,
      deleteButton(function () { draft.guide[kind].splice(idx, 1); applyGuide(); }),
    ]));
  };
  KU.onGuideGrid = function (grid, kind) {
    if (!isAdmin()) return;
    var tile = h("button", { class: "folio-add small", type: "button" }, [
      h("span", { class: "folio-add-plus", "aria-hidden": "true" }, "＋"),
      h("b", {}, GUIDE_KINDS[kind].name + " 추가"),
    ]);
    tile.addEventListener("click", function () { guideDialog(kind, -1); });
    grid.appendChild(tile);
  };
  // 평가·참고자료 카드: 항목 목록을 창에서 편집
  var GUIDE_BOXES = {
    grading: { name: "평가", list: "grading", texts: ["gradingNote"], template: { label: "", percent: 0 } },
    references: { name: "교재와 참고자료", list: "references", texts: ["referencesLead", "referencesNote"], template: { label: "", href: "" } },
  };
  KU.onGuideBox = function (card, kind) {
    if (!isAdmin()) return;
    var def = GUIDE_BOXES[kind];
    var edit = button("✏️ 수정", "ad-mini", function () {
      var g = draft.guide;
      g[def.list] = g[def.list] || [];
      TEMPLATES[def.list] = def.template;
      var close;
      var done = button("저장하고 닫기", "btn btn-primary", function () { close(); });
      var body = h("div", { class: "guide-edit" }, [
        h("p", { class: "field-hint" }, kind === "grading"
          ? "항목을 펼쳐 이름과 비율(%)을 고칩니다. 비율의 합이 100이 되게 맞춰 주세요."
          : "항목을 펼쳐 이름과 주소를 고칩니다. 주소를 비우면 링크 없이 이름만 표시됩니다."),
        arrayEditor(g, def.list),
        h("div", { class: "ed-grid" }, def.texts.map(function (k) {
          if (!(k in g)) g[k] = "";
          var f = leaf(g, k);
          f.classList.add("wide");
          return f;
        })),
        done,
      ]);
      // 창을 닫으면(× 포함) 고친 내용을 바로 저장하고 카드에 반영
      close = dialog(def.name + " 수정", "", body, "🧰", applyGuide);
    });
    card.appendChild(h("div", { class: "card-admin" }, [edit]));
  };

  /* ── 달력에서 바로 일정 관리 ──
   * 관리자 로그인 중에 달력 날짜를 누르면, 그날 내용 아래에서 일정을 추가·수정·삭제합니다.
   * 바꾸는 즉시 이 브라우저에 저장되고 달력에 반영됩니다. */
  var editingEvent = -1; // 수정 중인 일정의 번호(없으면 -1)
  var lastAlso = "";     // 방금 팝업·공지에 함께 등록했다는 안내 문구
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function normDate(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s || "");
    return m ? m[1] + "-" + pad(+m[2]) + "-" + pad(+m[3]) : "";
  }
  function applyEvents() {
    saveDraft(false);
    KU.calendar.refresh(clone(draft.curriculum.events));
  }
  // 일정 추가 창의 '팝업 등록', '공지사항 등록' 체크 칸
  var ALSO_FIELDS = [
    { name: "asPopup", label: "팝업으로도 등록 (접속한 사람에게 안내 팝업으로 띄움)", type: "checkbox", required: false },
    { name: "asNotice", label: "공지사항에도 등록", type: "checkbox", required: false },
  ];
  function dateText(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s || "");
    if (!m) return s || "";
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return m[1] + "년 " + (+m[2]) + "월 " + (+m[3]) + "일(" + "일월화수목금토".charAt(d.getDay()) + ")";
  }
  // 체크한 곳에 같은 내용을 함께 등록합니다. 등록한 곳의 이름 목록을 돌려줍니다.
  function alsoRegister(ev, v) {
    var made = [];
    var body = dateText(ev.date) + (ev.text ? "\n" + ev.text : "");
    if (v.asPopup) {
      draft.popups = draft.popups || [];
      draft.popups.push({
        id: "pop" + Date.now().toString(36), enabled: true, badge: ev.type || "일정 안내",
        title: ev.title, text: body, buttonLabel: "달력에서 보기", buttonHref: "#calendar",
      });
      made.push("팝업");
    }
    if (v.asNotice) {
      draft.notices.items = draft.notices.items || [];
      draft.notices.items.push({ title: (ev.type ? "[" + ev.type + "] " : "") + ev.title, text: body, date: today(), pinned: false });
      made.push("공지사항");
    }
    return made;
  }
  // 함께 등록한 팝업·공지를 화면에 반영
  function applyAlso(made) {
    if (!made.length) return;
    C.popups = clone(draft.popups || []);
    if (KU.notices) KU.notices.refresh(clone(draft.notices.items));
  }
  KU.onCalDetail = function (box, date) {
    if (!isAdmin()) return;
    var key = ymd(date);
    var events = draft.curriculum.events = draft.curriculum.events || [];
    var mine = [];
    events.forEach(function (ev, i) { if (normDate(ev.date) === key) mine.push(i); });
    var editing = mine.indexOf(editingEvent) >= 0 ? editingEvent : -1;

    var form = makeForm([
      { name: "type", label: "종류", type: "select", required: true, wide: true, options: EVENT_TYPES },
      { name: "title", label: "제목", type: "text", required: true, wide: true, placeholder: "예: 어린이날 휴강" },
      { name: "text", label: "내용", type: "textarea", required: false, placeholder: "설명(선택)" },
    ].concat(ALSO_FIELDS), editing >= 0 ? "수정 내용 저장" : "이 날짜에 일정 추가", function (v) {
      var ev;
      if (editing >= 0) {
        ev = events[editing];
        ev.type = v.type; ev.title = v.title; ev.text = v.text;
      } else {
        ev = { date: key, title: v.title, type: v.type, text: v.text };
        events.push(ev);
      }
      var made = alsoRegister(ev, v);
      lastAlso = made.length ? made.join("·") + "에도 등록했습니다." : "";
      editingEvent = -1;
      applyEvents();
      applyAlso(made);
    });
    if (editing >= 0) {
      form.setValue("type", events[editing].type || "");
      form.setValue("title", events[editing].title || "");
      form.setValue("text", events[editing].text || "");
    }

    box.appendChild(h("div", { class: "cal-admin" }, [
      h("div", { class: "cal-admin-title" }, "🔧 일정 관리 · " + key),
      mine.length ? h("ul", { class: "cal-admin-list" }, mine.map(function (i) {
        return h("li", { class: i === editing ? "editing" : "" }, [
          h("span", {}, [events[i].type ? h("span", { class: "tag tag-event" }, events[i].type) : null, " " + events[i].title]),
          h("span", { class: "ed-ctrl" }, [
            button("수정", "ad-mini", function () { editingEvent = i; KU.calendar.refresh(); }),
            button("삭제", "ad-mini danger", function () { events.splice(i, 1); editingEvent = -1; applyEvents(); }),
          ]),
        ]);
      })) : h("p", { class: "field-hint" }, "이 날짜에 등록된 일정이 없습니다."),
      h("div", { class: "cal-admin-form" }, [
        h("b", {}, editing >= 0 ? "일정 수정" : "새 일정"),
        form,
        editing >= 0 ? button("수정 취소", "ad-mini", function () { editingEvent = -1; KU.calendar.refresh(); }) : null,
      ]),
      lastAlso ? h("p", { class: "also-done", role: "status" }, "✓ " + lastAlso) : null,
      h("p", { class: "field-hint" }, "추가·수정·삭제는 바로 이 브라우저에 저장됩니다. 모든 방문자에게 보이게 하려면 자물쇠 → 설정 파일·보안에서 config.js를 내려받아 교체하세요."),
    ]));
    lastAlso = "";
  };
  function rememberTab(t) { try { sessionStorage.setItem(SESSION_KEY + ":tab", t); } catch (e) { /* 무시 */ } }
  function lastTab() { try { return sessionStorage.getItem(SESSION_KEY + ":tab"); } catch (e) { return null; } }

  // anchor를 주면(본문에서 바로 편집한 경우) 새로고침 뒤 관리자 화면 대신 그 위치로 돌아갑니다.
  function saveDraft(reload, anchor) {
    function after() {
      if (!reload) return updateStatus();
      try { sessionStorage.setItem(SESSION_KEY + (anchor ? ":goto" : ":open"), anchor || "1"); } catch (e) { /* 무시 */ }
      location.reload();
    }
    if (REMOTE) { // 서버(DB)에 저장 → 모든 방문자에게 바로 반영
      dirty = false;
      updateStatus();
      return adminCall("PUT", "config", { config: clone(draft) }).then(after, function () { dirty = true; updateStatus(); });
    }
    store.set("config", { base: KU.baseStamp, data: draft });
    dirty = false;
    after();
  }

  /* ── 작은 도구들 ── */
  function button(label, cls, fn) {
    var b = h("button", { class: cls, type: "button" }, label);
    b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); fn(b); });
    return b;
  }
  // 되돌릴 수 없는 동작은 두 번 눌러야 실행
  function confirmButton(label, cls, fn) {
    var armed = false;
    return button(label, cls, function (b) {
      if (armed) return fn();
      armed = true;
      b.textContent = "한 번 더 누르면 실행합니다";
      setTimeout(function () { armed = false; b.textContent = label; }, 4000);
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function stamp(ms) { return ms ? KU.fmtDateTime(new Date(ms)) : ""; }

  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = h("a", { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  // 엑셀에서 바로 열리는 CSV (한글이 깨지지 않도록 BOM 포함)
  function toCsv(headers, rows) {
    function cell(v) {
      v = v === null || v === undefined ? "" : String(v);
      if (/^[=+\-@]/.test(v)) v = "'" + v; // 엑셀이 수식으로 실행하지 않도록
      return '"' + v.replace(/"/g, '""') + '"';
    }
    return "﻿" + [headers].concat(rows).map(function (r) { return r.map(cell).join(","); }).join("\r\n");
  }
  function table(headers, rows, empty) {
    if (!rows.length) return h("p", { class: "cal-empty" }, empty);
    return h("div", { class: "ad-table-wrap" }, [
      h("table", { class: "ad-table" }, [
        h("thead", {}, [h("tr", {}, headers.map(function (x) { return h("th", {}, x); }))]),
        h("tbody", {}, rows.map(function (r) {
          return h("tr", {}, r.map(function (x) { return h("td", {}, x === null || x === undefined ? "" : String(x)); }));
        })),
      ]),
    ]);
  }
  function note(text) { return h("p", { class: "notice" }, [h("span", { "aria-hidden": "true" }, "ℹ️ "), text]); }

  /* ── 비밀번호 창 ── */
  function dialog(title, text, body, icon, onClose) {
    var closeBtn = h("button", { class: "modal-close", type: "button", "aria-label": "닫기" }, "×");
    var backdrop = h("div", { class: "modal-backdrop" }, [
      h("div", { class: "modal modal-form", role: "dialog", "aria-modal": "true", "aria-label": title }, [
        closeBtn,
        h("div", { class: "modal-emoji", "aria-hidden": "true" }, icon || "🔒"),
        h("h2", {}, title),
        text ? h("p", {}, text) : null,
        body,
      ]),
    ]);
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      backdrop.remove();
      document.removeEventListener("keydown", onKey);
      if (onClose) onClose();
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(backdrop);
    requestAnimationFrame(function () {
      backdrop.classList.add("show");
      var first = backdrop.querySelector("input");
      if (first) first.focus();
    });
    return close;
  }
  var NEW_PW = [
    { name: "pw", label: "새 비밀번호", type: "password", required: true, wide: true, pattern: "^.{8,}$", patternMsg: "8자 이상으로 입력해 주세요." },
    { name: "pw2", label: "비밀번호 확인", type: "password", required: true, wide: true },
  ];
  var fails = 0, lockUntil = 0;

  var askLogin = false; // 서버에 비밀번호가 이미 있다는 응답을 받았을 때 true
  function onLock() {
    if (isAdmin()) return openPanel();
    var close;
    if (!C.admin.passwordHash && !(REMOTE && askLogin)) {
      close = dialog("관리자 비밀번호 만들기", "아직 비밀번호가 없습니다. 8자 이상으로 정해 주세요.",
        makeForm(NEW_PW, "비밀번호 만들기", function (v, api) {
          if (v.pw !== v.pw2) return api.fail("pw2", "두 비밀번호가 서로 다릅니다.");
          if (REMOTE) {
            return KU.call("POST", "admin/setup", { password: v.pw }).then(function (res) {
              draft.admin.passwordHash = C.admin.passwordHash = res.passwordHash;
              setAdmin(true, res.token); close(); openPanel("security");
            }).catch(function (err) {
              if (err.status === 409) { askLogin = true; close(); return onLock(); } // 이미 비밀번호가 있음 → 로그인 창으로
              api.fail("pw", err.message);
            });
          }
          draft.admin.passwordHash = C.admin.passwordHash = KU.hashSecret(v.pw);
          saveDraft(false);
          setAdmin(true); close(); openPanel("security");
        }));
    } else {
      close = dialog("관리자 로그인", "", makeForm([
        { name: "pw", label: "비밀번호", type: "password", required: true, wide: true },
      ], "들어가기", function (v, api) {
        if (REMOTE) { // 서버가 비밀번호를 확인하고 로그인 토큰을 줍니다.
          return KU.call("POST", "admin/login", { password: v.pw }).then(function (res) {
            setAdmin(true, res.token); close(); openPanel();
          }).catch(function (err) { api.fail("pw", err.message); });
        }
        if (Date.now() < lockUntil) return api.fail("pw", "여러 번 틀렸습니다. 30초 뒤 다시 시도해 주세요.");
        if (KU.hashSecret(v.pw) !== C.admin.passwordHash) {
          if (++fails >= 5) { fails = 0; lockUntil = Date.now() + 30000; }
          return api.fail("pw", "비밀번호가 맞지 않습니다.");
        }
        fails = 0;
        setAdmin(true); close(); openPanel();
      }));
    }
  }

  /* ── 내용 편집기: 설정의 모양을 읽어 입력 칸을 자동으로 만듭니다 ── */
  var SECTIONS = [
    ["site", "사이트 기본 정보"], ["hero", "첫 화면"], ["stats", "통계 카드"], ["about", "강의 소개(슬라이드)"],
    ["curriculum", "커리큘럼·일정"], ["portfolio", "포트폴리오"], ["guide", "수강 안내(AI 도구·준비물)"], ["participate", "참여하기(투표·신청서)"],
    ["classroom", "내 강의실"], ["faq", "FAQ"], ["instructor", "교수자"], ["popup", "팝업 공통 설정"],
    ["welcome", "첫 방문 효과"], ["footer", "맨 아래 문구"], ["nav", "헤더 메뉴"],
  ];
  var LABELS = {
    university: "대학교", department: "학과", courseTitle: "강의 제목", logoEmoji: "로고 이모지", version: "버전(제목 오른쪽 빨간 글씨)", logoImage: "로고 이미지 경로", brandSub: "제목 옆 소속 줄(첫 화면·탭)", headerSub: "헤더 제목 윗줄",
    id: "연결 ID (바꾸지 마세요)", label: "이름", badge: "배지 문구", subtitle: "부제", description: "설명",
    buttons: "버튼", href: "연결 주소", primary: "강조 버튼", quickInfo: "한눈에 보기", icon: "아이콘", value: "값",
    suffix: "단위", eyebrow: "작은 영문 제목", title: "제목", lead: "소개 문구", slides: "슬라이드", text: "내용",
    weeksTitle: "주차 목록 제목", calendarTitle: "달력 제목", schedule: "수업 일정 기본값", firstClass: "첫 수업일 (연-월-일)",
    time: "수업 시간", location: "수업 장소", submitUrl: "과제 제출 주소", weeks: "주차", week: "주차 번호", tag: "꼬리표",
    topics: "학습 내용", videos: "참고 영상 (YouTube)", materials: "강의 자료 (구글 드라이브)", url: "주소", assignment: "과제", due: "마감 (연-월-일T시:분)", date: "날짜 (연-월-일)",
    toolsTitle: "도구 제목", tools: "AI 도구", name: "이름", category: "분류", prepTitle: "준비물 제목", prep: "준비물",
    poll: "투표", help: "도움말", options: "보기", apply: "수강 신청서", notice: "안내 문구", endpoint: "전송할 서버 주소",
    submitLabel: "제출 버튼 문구", successTitle: "접수 완료 제목", successText: "접수 완료 문구", fields: "입력 항목",
    type: "종류", required: "필수", placeholder: "입력 예시", pattern: "형식 검사(정규식)", patternMsg: "형식 오류 문구",
    testMode: "출석 미리 보기 모드", fileAccept: "제출 가능 형식", fileMaxMB: "최대 크기(MB)", items: "목록",
    q: "질문", a: "답변", role: "소속·직함", nameSub: "이름(한자·영문)", worksTitle: "저술 목록 제목", works: "저술 목록", roleSub: "소속(영문)", photo: "사진 경로", bio: "소개", career: "약력", contacts: "연락처",
    enabled: "사용", delaySeconds: "몇 초 뒤 표시", buttonLabel: "버튼 문구", buttonHref: "버튼 연결 주소",
    hideTodayLabel: "'오늘 하루 보지 않기' 문구", fireworks: "폭죽 효과", message: "환영 문구",
    intro: "강의 내용(문단)", slidesTitle: "슬라이드 제목", goalsTitle: "목표 제목", goalsLead: "목표 소개 문구", goals: "학습 목표",
    projectsTitle: "프로젝트 예시 제목", projectsLead: "프로젝트 예시 소개", projects: "프로젝트 예시", projectsNote: "프로젝트 예시 덧붙임",
    gradingTitle: "평가 제목", grading: "평가 항목", percent: "비율(%)", gradingNote: "평가 덧붙임",
    referencesTitle: "참고자료 제목", referencesLead: "참고자료 소개", references: "참고자료", referencesNote: "참고자료 덧붙임",
    infographic: "인포그래픽", inputsTitle: "'활용하는 것' 제목", inputs: "활용하는 것", outputsTitle: "'만드는 것' 제목", outputs: "만드는 것",
    stepsTitle: "제작 과정 제목", steps: "제작 과정", roadmapTitle: "학습 흐름 제목", roadmap: "학습 흐름", span: "주 수(막대 길이)",
    toolGroups: "도구 묶음",
    popups: "팝업 목록",
    polls: "설문", pollsTitle: "설문 영역 제목", createdAt: "생성일시", open: "화면에 표시",
    events: "달력 일정", student: "학생 표시 이름", term: "학기·과제 구분", driveUrl: "구글 드라이브 주소", emptyText: "비었을 때 문구",
    address: "주소", copyright: "저작권 문구", pinned: "중요 표시", links: "링크",
  };
  var HIDE = { rosterHashes: 1, accessCodeHash: 1, accessCode: 1, passwordHash: 1 };
  var ONE_LINE = { url: 1, href: 1, driveUrl: 1, buttonHref: 1, submitUrl: 1, photo: 1, logoImage: 1, endpoint: 1 }; // 주소는 길어도 한 줄 칸
  var LONG = { text: 1, description: 1, a: 1, lead: 1, notice: 1, successText: 1 };
  var TEMPLATES = {
    items: { title: "", text: "", date: "", pinned: false },
    videos: { label: "", url: "" },
    materials: { label: "", url: "" },
    events: { date: "", title: "", type: "행사", text: "" },
  };
  var EVENT_TYPES = ["휴강", "보강", "특강", "행사", "공휴일", "기타"];
  // 묶음 제목 아래에 보여 줄 도움말
  var SET_HINTS = {
    materials: "구글 드라이브에서 파일 → 공유 → 링크 복사로 얻은 주소를 넣습니다. 공유 범위는 '링크가 있는 모든 사용자 – 뷰어'로 맞춰 주세요.",
    videos: "YouTube 주소를 넣으면 주차를 펼쳤을 때 그 자리에서 바로 재생됩니다. 다른 주소는 링크로 표시됩니다.",
  };
  function label(k) { return LABELS[k] || k; }
  function blank(v) {
    if (Array.isArray(v)) return [];
    if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { o[k] = blank(v[k]); }); return o; }
    return typeof v === "number" ? 0 : typeof v === "boolean" ? false : "";
  }
  function summaryOf(item) {
    var t = item.title || item.label || item.q || item.name || item.value || "항목";
    return (item.week ? item.week + "주차 · " : "") + (item.date && item.title ? item.date + " · " : "") + t;
  }

  function leaf(parent, key, bare) {
    var v = parent[key], input;
    if (typeof v === "boolean") {
      input = h("input", { type: "checkbox" });
      input.checked = v;
      input.addEventListener("change", function () { parent[key] = input.checked; markDirty(); });
      return h("label", { class: "ed-check" }, [input, h("span", {}, label(key))]);
    }
    var long = typeof v === "string" && !ONE_LINE[key] && (v.length > 40 || LONG[key]);
    input = h(long ? "textarea" : "input", long ? { rows: 3 } : { type: typeof v === "number" ? "number" : "text" });
    input.value = v;
    input.addEventListener("input", function () {
      parent[key] = typeof v === "number" ? Number(input.value) : input.value;
      markDirty();
    });
    if (bare) return input;
    return h("label", { class: "ed-field" + (long ? " wide" : "") }, [h("span", {}, label(key)), input]);
  }

  function objectEditor(obj, rerenderParent) {
    var box = h("div", { class: "ed-grid" });
    Object.keys(obj).forEach(function (k) {
      if (HIDE[k]) return;
      var v = obj[k];
      if (Array.isArray(v)) box.appendChild(h("fieldset", { class: "ed-set wide" }, [
        h("legend", {}, label(k)),
        SET_HINTS[k] ? h("p", { class: "field-hint" }, SET_HINTS[k]) : null,
        arrayEditor(obj, k),
      ]));
      else if (v && typeof v === "object") {
        box.appendChild(h("fieldset", { class: "ed-set wide" }, [
          h("legend", {}, label(k)),
          objectEditor(v),
          k === "assignment" ? button("과제 삭제", "ad-mini danger", function () { delete obj.assignment; markDirty(); rerenderParent(); }) : null,
        ]));
      } else box.appendChild(leaf(obj, k));
    });
    // 주차 항목에만 있는 선택 항목
    if ("topics" in obj && rerenderParent) {
      var extra = h("div", { class: "ed-extra wide" });
      if (!obj.assignment) extra.appendChild(button("＋ 과제 추가", "ad-mini", function () {
        obj.assignment = { title: "", text: "", due: today() + "T23:59" }; markDirty(); rerenderParent();
      }));
      if (!("date" in obj)) extra.appendChild(button("＋ 이 주만 날짜·시간·장소 따로 지정", "ad-mini", function () {
        obj.date = ""; obj.time = ""; obj.location = ""; markDirty(); rerenderParent();
      }));
      if (extra.children.length) box.appendChild(extra);
    }
    return box;
  }

  function arrayEditor(parent, key) {
    var arr = parent[key];
    var box = h("div", { class: "ed-array" });
    var openIdx = -1;
    function move(i, diff) {
      var j = i + diff;
      if (j < 0 || j >= arr.length) return;
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      if (openIdx === i) openIdx = j;
      markDirty(); render();
    }
    function controls(i) {
      return h("span", { class: "ed-ctrl" }, [
        button("↑", "ad-mini", function () { move(i, -1); }),
        button("↓", "ad-mini", function () { move(i, 1); }),
        button("삭제", "ad-mini danger", function () { arr.splice(i, 1); openIdx = -1; markDirty(); render(); }),
      ]);
    }
    function render() {
      box.textContent = "";
      arr.forEach(function (item, i) {
        if (item && typeof item === "object") {
          var det = h("details", { class: "ed-item" }, [
            h("summary", {}, [h("span", { class: "ed-sum" }, (i + 1) + ". " + summaryOf(item)), controls(i)]),
            objectEditor(item, function () { openIdx = i; render(); }),
          ]);
          det.open = i === openIdx;
          det.addEventListener("toggle", function () { if (det.open) openIdx = i; else if (openIdx === i) openIdx = -1; });
          box.appendChild(det);
        } else {
          box.appendChild(h("div", { class: "ed-row" }, [leaf(arr, i, true), controls(i)]));
        }
      });
      box.appendChild(button("＋ 추가", "ad-mini add", function () {
        var item = arr.length ? blank(arr[0]) : (TEMPLATES[key] ? clone(TEMPLATES[key]) : "");
        if (item && typeof item === "object") {
          if ("week" in item) item.week = arr.length + 1;
          if ("date" in item && (key === "items" || key === "events")) item.date = today();
          delete item.assignment;
        }
        arr.push(item);
        openIdx = arr.length - 1;
        markDirty(); render();
      }));
    }
    render();
    return box;
  }

  /* ── 탭: 내용 편집 ── */
  function tabEdit() {
    var area = h("div", { class: "card" });
    var select = h("select", { class: "ad-select", "aria-label": "편집할 영역" }, SECTIONS.filter(function (s) { return s[0] in draft; }).map(function (s) {
      return h("option", { value: s[0] }, s[1]);
    }));
    if (editSection && editSection in draft) select.value = editSection;
    function show() {
      editSection = select.value;
      area.textContent = "";
      var v = draft[select.value];
      area.appendChild(Array.isArray(v) ? arrayEditor(draft, select.value) : objectEditor(v));
    }
    select.addEventListener("change", show);
    show();
    return [
      note("고친 뒤 위쪽 '저장하고 적용'을 누르면 이 브라우저에서 바로 반영됩니다. 모든 방문자에게 보이게 하려면 '설정 파일·보안' 탭에서 config.js를 내려받아 교체하세요."),
      h("div", { class: "ad-row" }, [h("b", {}, "편집할 영역"), select]),
      area,
    ];
  }

  /* ── 달력 일정 편집 화면 (본문 달력의 '여기서 편집'에서 씁니다) ── */
  function tabEvents() {
    var cur = draft.curriculum;
    cur.events = cur.events || [];
    cur.events.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    return [
      note("달력에는 ① 매주 수업(첫 수업일부터 자동 계산) ② 과제 마감일 ③ 여기서 등록한 일정이 표시됩니다. 특정 주의 수업 날짜만 옮기려면 '내용 편집 → 커리큘럼·일정'에서 그 주차를 펼쳐 '이 주만 날짜·시간·장소 따로 지정'을 누르세요."),
      h("div", { class: "card ad-card" }, [
        h("h4", {}, "🗓️ 일정 추가"),
        makeForm([
          { name: "date", label: "날짜", type: "date", required: true },
          { name: "type", label: "종류", type: "select", required: true, options: EVENT_TYPES },
          { name: "title", label: "제목", type: "text", required: true, wide: true, placeholder: "예: 어린이날 휴강" },
          { name: "text", label: "내용", type: "textarea", required: false, placeholder: "달력에서 날짜를 눌렀을 때 보일 설명(선택)" },
        ].concat(ALSO_FIELDS), "일정 추가", function (v) {
          var ev = { date: v.date, title: v.title, type: v.type, text: v.text };
          cur.events.push(ev);
          alsoRegister(ev, v);
          markDirty(); rerender("events");
        }),
      ]),
      h("div", { class: "card ad-card" }, [
        h("h4", {}, "등록된 일정 (" + cur.events.length + "건)"),
        cur.events.length ? null : h("p", { class: "cal-empty" }, "아직 등록된 일정이 없습니다."),
        arrayEditor(cur, "events"),
        h("p", { class: "field-hint" }, "항목을 펼쳐 수정하거나 '삭제'로 지울 수 있습니다. 날짜는 2026-05-05 형식입니다."),
      ]),
      h("div", { class: "card ad-card" }, [
        h("h4", {}, "⏰ 수업 일정 기본값"),
        h("p", { class: "field-hint" }, "첫 수업일을 바꾸면 15주 수업 날짜가 모두 다시 계산됩니다."),
        objectEditor(cur.schedule),
      ]),
    ];
  }

  /* ── 탭: 팝업 (안내 팝업 추가·수정·삭제) ── */
  function applyPopups() {
    saveDraft(false);
    C.popups = clone(draft.popups); // 미리 보기와 다음 접속에 바로 반영
    if (panel && panel.parentNode && current === "popups") showTab("popups");
  }
  function popupIndex(id) {
    var found = -1;
    (draft.popups || []).forEach(function (p, i) { if (p.id === id) found = i; });
    return found;
  }
  // idx가 -1이면 새 팝업, 아니면 그 번호의 팝업 수정
  function popupDialog(idx) {
    var list = draft.popups = draft.popups || [];
    var cur = idx >= 0 ? list[idx] : null;
    var close;
    var form = makeForm([
      { name: "badge", label: "배지 (위쪽 작은 글자)", type: "text", required: false, wide: true, placeholder: "예: 수강 신청 안내" },
      { name: "title", label: "제목", type: "text", required: true, wide: true },
      { name: "text", label: "내용", type: "textarea", required: false },
      { name: "buttonLabel", label: "버튼 글자", type: "text", required: false, wide: true, placeholder: "비워 두면 버튼 없이 안내만 표시" },
      { name: "buttonHref", label: "버튼을 누르면 갈 곳", type: "text", required: false, wide: true, placeholder: "#apply 또는 https://…", hint: "페이지 안 이동: #about #curriculum #portfolio #guide #apply #classroom #faq" },
      { name: "enabled", label: "사용 (접속한 사람에게 띄우기)", type: "checkbox", required: false },
    ], cur ? "수정 내용 저장" : "팝업 만들기", function (v) {
      var item = { id: cur ? cur.id : "pop" + Date.now().toString(36), enabled: v.enabled, badge: v.badge, title: v.title, text: v.text, buttonLabel: v.buttonLabel, buttonHref: v.buttonHref };
      if (cur) list[idx] = item; else list.push(item);
      close();
      applyPopups();
    });
    form.setValue("enabled", cur ? cur.enabled !== false : true);
    if (cur) ["badge", "title", "text", "buttonLabel", "buttonHref"].forEach(function (k) { form.setValue(k, cur[k] || ""); });
    else form.setValue("buttonHref", "#apply");
    close = dialog(cur ? "팝업 수정" : "팝업 추가", "", form, "📣");
  }
  function tabPopups() {
    var list = draft.popups = draft.popups || [];
    draft.popup = draft.popup || { delaySeconds: 2, hideTodayLabel: "오늘 하루 보지 않기" };
    return [
      note("사이트에 접속하면 '사용' 중인 팝업이 차례로 뜹니다. 방문자가 '오늘 하루 보지 않기'를 누른 팝업은 그날 자정까지 그 사람에게 다시 뜨지 않습니다. 추가·수정·삭제는 바로 이 브라우저에 저장되며, 모든 방문자에게 적용하려면 config.js를 내려받아 교체하세요."),
      h("div", { class: "card ad-card" }, [
        h("div", { class: "ad-row between" }, [
          h("h4", {}, "📣 팝업 목록 (" + list.length + "개)"),
          button("＋ 팝업 추가", "btn btn-primary btn-sm", function () { popupDialog(-1); }),
        ]),
        list.length ? h("div", { class: "ad-table-wrap" }, [
          h("table", { class: "ad-table" }, [
            h("thead", {}, [h("tr", {}, ["제목", "배지", "상태", "미리 보기", "사용/중지", "수정", "삭제"].map(function (x) { return h("th", {}, x); }))]),
            h("tbody", {}, list.map(function (p, i) {
              var on = p.enabled !== false;
              return h("tr", {}, [
                h("td", { class: "poll-h-title" }, p.title),
                h("td", {}, p.badge || "—"),
                h("td", {}, [h("span", { class: "tag" + (on ? " tag-assign" : " tag-closed") }, on ? "사용 중" : "중지")]),
                h("td", {}, [button("미리 보기", "ad-mini", function () { KU.popups.show(p); })]),
                h("td", {}, [button(on ? "중지" : "사용", "ad-mini", function () { p.enabled = !on; applyPopups(); })]),
                h("td", {}, [button("수정", "ad-mini", function () { popupDialog(i); })]),
                h("td", {}, [deleteButton(function () { list.splice(i, 1); applyPopups(); })]),
              ]);
            })),
          ]),
        ]) : h("p", { class: "cal-empty" }, "등록된 팝업이 없습니다. 접속해도 팝업이 뜨지 않습니다."),
      ]),
      h("div", { class: "card ad-card" }, [
        h("h4", {}, "⚙️ 공통 설정"),
        h("p", { class: "field-hint" }, "여기를 고친 뒤에는 위쪽 '저장하고 적용'을 눌러 주세요."),
        objectEditor(draft.popup),
      ]),
    ];
  }
  // 팝업이 떠 있을 때 관리자에게는 그 안에 수정·삭제 버튼을 보여 줍니다.
  KU.onPopup = function (modal, p, close) {
    if (!isAdmin()) return;
    modal.appendChild(h("div", { class: "popup-admin" }, [
      h("span", {}, "🔧 관리자"),
      button("✏️ 수정", "ad-mini", function () { close(); popupDialog(popupIndex(p.id)); }),
      deleteButton(function () {
        var i = popupIndex(p.id);
        if (i >= 0) { draft.popups.splice(i, 1); applyPopups(); }
        close();
      }),
    ]));
  };

  /* ── 탭: 수강생 명단 ── */
  /* 수강생 명단 — 서버(DB)에 저장되는 경우
   * 수강 신청서를 내면 자동으로 등록되고, 관리자가 직접 추가·삭제할 수도 있습니다. */
  var rosterRows = null;   // 서버에서 받아 온 명단
  var rosterFresh = false; // 방금 받아 온 것인지
  var rosterMsg = "";
  var recAtt = {}, recSub = {}, recNames = {}; // 서버 기록: 학번 → {주차: 시각}, 학번 → [제출], 학번 → 이름
  function loadRoster() {
    return Promise.all([adminCall("GET", "admin/roster"), adminCall("GET", "admin/records")]).then(function (res) {
      rosterRows = res[0].roster;
      recAtt = {}; recSub = {}; recNames = {};
      res[1].attendance.forEach(function (r) { (recAtt[r.id] = recAtt[r.id] || {})[r.week] = r.at; recNames[r.id] = r.name; });
      res[1].submissions.forEach(function (r) { (recSub[r.id] = recSub[r.id] || []).push(r); recNames[r.id] = r.name; });
      rosterFresh = true;
      if (current === "roster" && panel && panel.parentNode) showTab("roster");
    }, function () {});
  }

  /* ── 탭: 강의 관리 = 수강생 현황 · 주차별 출석 현황 · 주차별 과제 제출 현황 ── */
  var manageView = "students";
  function manageNav() {
    return h("div", { class: "ad-subtabs", role: "tablist" }, [
      ["students", "👥 수강생 현황"], ["attendance", "✅ 주차별 출석 현황"], ["submissions", "📤 주차별 과제 제출 현황"],
    ].map(function (v) {
      var b = button(v[1], "ad-subtab" + (manageView === v[0] ? " active" : ""), function () {
        manageView = v[0];
        if (rosterRows) rosterFresh = true; // 이미 받아 온 내용으로 화면만 바꿉니다.
        showTab("roster");
      });
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(manageView === v[0]));
      return b;
    }));
  }
  // 출석·제출 표에 쓸 자료: 학생 목록과 기록
  function manageData() {
    var students, att, sub, names;
    if (REMOTE) {
      if (!rosterFresh) {
        loadRoster();
        if (!rosterRows) return null;
      }
      rosterFresh = false;
      students = rosterRows.map(function (r) { return { id: r.id, name: r.name }; });
      att = recAtt; sub = recSub; names = recNames;
    } else {
      students = store.get("roster", []).map(function (r) { return { id: r.id, name: r.name }; });
      att = store.get("attendance", {}); sub = store.get("submissions", {}); names = {};
    }
    // 명단에는 없지만 기록이 있는 학번도 함께 보여 줍니다.
    var known = {};
    students.forEach(function (st) { known[st.id] = 1; });
    Object.keys(att).concat(Object.keys(sub)).forEach(function (id) {
      if (known[id]) return;
      known[id] = 1;
      students.push({ id: id, name: names[id] || "", extra: true });
    });
    return { students: students, att: att, sub: sub };
  }
  function matrixCard(title, hintText, fileName, head, rows, csvRows, foot) {
    var dl = button("엑셀용 파일(CSV) 내려받기", "btn btn-ghost btn-sm", function () { download(fileName, toCsv(head, csvRows), "text/csv"); });
    dl.disabled = !rows.length;
    return h("div", { class: "card ad-card" }, [
      h("div", { class: "ad-row between" }, [
        h("h4", {}, title),
        h("span", { class: "ad-row" }, [
          REMOTE ? button("새로 고침", "btn btn-ghost btn-sm", function () { rosterFresh = false; showTab("roster"); }) : null,
          dl,
        ]),
      ]),
      h("p", { class: "field-hint" }, hintText),
      rows.length ? h("div", { class: "ad-table-wrap" }, [
        h("table", { class: "ad-table ad-matrix" }, [
          h("thead", {}, [h("tr", {}, head.map(function (x) { return h("th", {}, x); }))]),
          h("tbody", {}, rows),
          foot ? h("tfoot", {}, [foot]) : null,
        ]),
      ]) : h("p", { class: "cal-empty" }, "등록된 수강생이 없습니다. '수강생 현황'에서 수강생을 등록하거나 수강 신청을 받으면 여기에 나타납니다."),
    ]);
  }
  function attendanceView(d) {
    var weeks = KU.weeks;
    var head = ["번호", "학번", "이름"].concat(weeks.map(function (w) { return w.week + "주"; })).concat(["출석 수", "출석률"]);
    var perWeek = weeks.map(function () { return 0; });
    var csv = [];
    var rows = d.students.map(function (st, i) {
      var mine = d.att[st.id] || {};
      var n = 0;
      var cells = weeks.map(function (w, wi) {
        var on = !!mine[w.week];
        if (on) { n++; perWeek[wi]++; }
        return h("td", { class: "mx", title: on ? "출석 " + stamp(mine[w.week]) : KU.fmtShort(w._date) }, [h("span", { class: on ? "mx-yes" : "mx-no" }, on ? "O" : "·")]);
      });
      var rate = weeks.length ? Math.round((n / weeks.length) * 100) + "%" : "-";
      csv.push([i + 1, st.id, st.name].concat(weeks.map(function (w) { return mine[w.week] ? "O" : ""; })).concat([n, rate]));
      return h("tr", {}, [h("td", {}, i + 1), h("td", {}, st.id), h("td", {}, st.name || (st.extra ? "(명단에 없음)" : ""))].concat(cells).concat([h("td", { class: "mx" }, [h("b", {}, String(n))]), h("td", { class: "mx" }, rate)]));
    });
    var total = d.students.length;
    var foot = h("tr", {}, [h("td", { colspan: "3" }, "주차별 출석 인원")].concat(perWeek.map(function (n) {
      return h("td", { class: "mx" }, n + (total ? "/" + total : ""));
    })).concat([h("td", { colspan: "2" })]));
    csv.push(["", "", "주차별 출석 인원"].concat(perWeek).concat(["", ""]));
    return [matrixCard("✅ 주차별 출석 현황 (" + total + "명)",
      "O는 출석, ·은 미출석입니다. 칸에 마우스를 올리면 출석한 시각이 보입니다." + (C.classroom.testMode ? " 지금은 미리 보기 모드라 수업일이 아니어도 출석이 기록됩니다." : ""),
      "주차별_출석_현황.csv", head, rows, csv, total ? foot : null)];
  }
  function submissionsView(d) {
    // 과제가 있는 주차 + (과제는 없어졌지만) 제출 기록이 남아 있는 주차
    var cols = {};
    KU.weeks.forEach(function (w) { if (w.assignment) cols[w.week] = w.assignment.title; });
    Object.keys(d.sub).forEach(function (id) { d.sub[id].forEach(function (s) { if (!(s.week in cols)) cols[s.week] = s.title; }); });
    var weekNos = Object.keys(cols).map(Number).sort(function (x, y) { return x - y; });
    var head = ["번호", "학번", "이름"].concat(weekNos.map(function (n) { return n + "주 · " + cols[n]; })).concat(["제출 수"]);
    var perCol = weekNos.map(function () { return 0; });
    var csv = [];
    var rows = d.students.map(function (st, i) {
      var mine = d.sub[st.id] || [];
      var n = 0;
      var csvCells = [];
      var cells = weekNos.map(function (wk, ci) {
        // 같은 과제를 여러 번 냈으면 가장 최근 것을 표시
        var list = mine.filter(function (s) { return Number(s.week) === wk; }).sort(function (x, y) { return y.at - x.at; });
        var s = list[0];
        if (!s) { csvCells.push("미제출"); return h("td", { class: "mx" }, [h("span", { class: "mx-no" }, "미제출")]); }
        n++; perCol[ci]++;
        csvCells.push((s.late ? "지각 " : "제출 ") + stamp(s.at) + " " + s.file);
        return h("td", { class: "mx", title: s.file + (s.memo ? " · " + s.memo : "") + (list.length > 1 ? " · 총 " + list.length + "회 제출" : "") }, [
          h("span", { class: s.late ? "mx-late" : "mx-yes" }, s.late ? "지각" : "제출"),
          h("span", { class: "mx-time" }, stamp(s.at)),
        ]);
      });
      csv.push([i + 1, st.id, st.name].concat(csvCells).concat([n]));
      return h("tr", {}, [h("td", {}, i + 1), h("td", {}, st.id), h("td", {}, st.name || (st.extra ? "(명단에 없음)" : ""))].concat(cells).concat([h("td", { class: "mx" }, [h("b", {}, n + " / " + weekNos.length)])]));
    });
    var total = d.students.length;
    var foot = h("tr", {}, [h("td", { colspan: "3" }, "과제별 제출 인원")].concat(perCol.map(function (n) {
      return h("td", { class: "mx" }, n + (total ? "/" + total : ""));
    })).concat([h("td", {})]));
    csv.push(["", "", "과제별 제출 인원"].concat(perCol).concat([""]));
    if (!weekNos.length) {
      return [h("div", { class: "card ad-card" }, [
        h("h4", {}, "📤 주차별 과제 제출 현황"),
        h("p", { class: "cal-empty" }, "과제가 있는 주차가 없습니다. 커리큘럼의 주차 수정에서 '과제 추가'를 눌러 과제를 만들면 여기에 나타납니다."),
      ])];
    }
    return [matrixCard("📤 주차별 과제 제출 현황 (" + total + "명)",
      "제출·지각·미제출로 표시합니다. 칸에 마우스를 올리면 파일 이름과 메모가 보입니다. 과제 파일 자체는 저장되지 않습니다.",
      "주차별_과제_제출_현황.csv", head, rows, csv, total ? foot : null)];
  }
  function tabManage() {
    if (manageView === "students") return [manageNav()].concat(tabRoster());
    var d = manageData();
    if (!d) return [manageNav(), h("p", { class: "cal-empty" }, "서버에서 기록을 불러오는 중입니다…")];
    return [manageNav()].concat(manageView === "attendance" ? attendanceView(d) : submissionsView(d));
  }
  function tabRosterRemote() {
    if (!rosterFresh) {
      loadRoster();
      if (!rosterRows) return [h("p", { class: "cal-empty" }, "서버에서 수강생 명단을 불러오는 중입니다…")];
    }
    rosterFresh = false; // 다음에 탭을 열면 다시 받아 옵니다.
    var rows = rosterRows;
    var totalWeeks = KU.weeks.length;
    var byApply = rows.filter(function (r) { return r.source === "apply"; }).length;
    var msg = rosterMsg; rosterMsg = "";

    function parseLines(text) {
      var list = [];
      text.split(/\r?\n/).forEach(function (line) {
        var p = line.replace(/^\uFEFF/, "").split(/[,\t;]/).map(function (x) { return x.replace(/^["'\s]+|["'\s]+$/g, ""); });
        if (p[0] || p[1]) list.push({ id: p[0], name: p[1] });
      });
      return list;
    }
    function addMany(list) {
      if (!list.length) { rosterMsg = "추가할 내용이 없습니다."; return showTab("roster"); }
      adminCall("POST", "admin/roster", { students: list }).then(function (res) {
        rosterMsg = res.added + "명 추가" + (res.skipped ? ", " + res.skipped + "건 건너뜀(학번 10자리·이름 형식 또는 이미 등록됨)" : "");
        loadRoster();
      }, function () {});
    }
    var bulk = h("textarea", { rows: 4, placeholder: "2026000001, 홍길동\n2026000002, 김고려", "aria-label": "여러 명 붙여 넣기" });
    var file = h("input", { type: "file", accept: ".csv,.txt", "aria-label": "명단 CSV 파일" });
    file.addEventListener("change", function () {
      if (!file.files[0]) return;
      var reader = new FileReader();
      reader.onload = function () { addMany(parseLines(String(reader.result))); };
      reader.readAsText(file.files[0]);
    });

    var head = ["번호", "학번", "이름", "소속 학과", "학년", "이메일", "연락처", "등록 경로", "등록일", "출석", "과제 제출", "삭제"];
    return [
      note("수강 신청서를 낸 사람은 자동으로 이 명단에 등록됩니다. 명단에 한 명이라도 있으면 명단에 있는 학번·이름만 '내 강의실'에 로그인할 수 있습니다(수강 코드도 필요). 명단이 비어 있으면 수강 코드만 맞으면 됩니다."),
      msg ? h("p", { class: "also-done", role: "status" }, msg) : null,
      h("div", { class: "card ad-card" }, [
        h("div", { class: "ad-row between" }, [
          h("h4", {}, "👥 수강생 현황 (" + rows.length + "명)"),
          h("span", { class: "ad-row" }, [
            button("새로 고침", "btn btn-ghost btn-sm", function () { loadRoster(); }),
            button("엑셀용 파일(CSV) 내려받기", "btn btn-ghost btn-sm", function () {
              download("수강생_명단.csv", toCsv(head.slice(0, 11), rows.map(function (r, i) {
                return [i + 1, r.id, r.name, r.department, r.grade, r.email, r.phone, r.source === "apply" ? "수강 신청" : "관리자 등록", stamp(r.at), r.attendance + "/" + totalWeeks, r.submissions];
              })), "text/csv");
            }),
            confirmButton("명단 모두 지우기", "btn btn-ghost btn-sm", function () {
              adminCall("DELETE", "admin/roster").then(function () { rosterMsg = "명단을 모두 지웠습니다."; loadRoster(); }, function () {});
            }),
          ]),
        ]),
        h("p", { class: "field-hint" }, "수강 신청으로 등록 " + byApply + "명 · 관리자가 등록 " + (rows.length - byApply) + "명"),
        rows.length ? h("div", { class: "ad-table-wrap" }, [
          h("table", { class: "ad-table" }, [
            h("thead", {}, [h("tr", {}, head.map(function (x) { return h("th", {}, x); }))]),
            h("tbody", {}, rows.map(function (r, i) {
              return h("tr", {}, [
                h("td", {}, i + 1), h("td", {}, r.id), h("td", {}, r.name),
                h("td", {}, r.department || "—"), h("td", {}, r.grade || "—"), h("td", {}, r.email || "—"), h("td", {}, r.phone || "—"),
                h("td", {}, [h("span", { class: "tag" + (r.source === "apply" ? " tag-assign" : "") }, r.source === "apply" ? "수강 신청" : "관리자 등록")]),
                h("td", {}, stamp(r.at)),
                h("td", {}, r.attendance + " / " + totalWeeks),
                h("td", {}, r.submissions + "건"),
                h("td", {}, [deleteButton(function () {
                  adminCall("DELETE", "admin/roster/" + encodeURIComponent(r.id)).then(function () { rosterMsg = r.name + " 삭제"; loadRoster(); }, function () {});
                })]),
              ]);
            })),
          ]),
        ]) : h("p", { class: "cal-empty" }, "아직 등록된 수강생이 없습니다. 수강 신청서가 들어오면 여기에 나타납니다."),
      ]),
      h("div", { class: "grid grid-2 ad-grid" }, [
        h("div", { class: "card ad-card" }, [
          h("h4", {}, "한 명 추가"),
          makeForm([
            { name: "id", label: "학번", type: "text", required: true, pattern: "^\\d{10}$", patternMsg: "학번은 숫자 10자리로 입력해 주세요." },
            { name: "name", label: "이름", type: "text", required: true },
          ], "명단에 추가", function (v, api) {
            if (rows.some(function (r) { return r.id === v.id; })) return api.fail("id", "이미 등록된 학번입니다.");
            addMany([{ id: v.id, name: v.name }]);
          }),
        ]),
        h("div", { class: "card ad-card" }, [
          h("h4", {}, "여러 명 한꺼번에"),
          h("p", { class: "field-hint" }, "한 줄에 한 명씩 '학번, 이름'. 엑셀에서 두 열을 복사해 붙여도 됩니다."),
          bulk,
          h("div", { class: "ad-row" }, [
            button("붙여 넣은 명단 추가", "btn btn-primary btn-sm", function () { addMany(parseLines(bulk.value)); }),
            h("label", { class: "ad-file" }, ["CSV 파일로 추가 ", file]),
          ]),
        ]),
      ]),
      h("div", { class: "card ad-card" }, [
        h("h4", {}, "수강 코드 바꾸기"),
        h("p", { class: "field-hint" }, "수강생이 로그인할 때 쓰는 공용 코드입니다. 바꾼 뒤 위쪽 '저장하고 적용'을 눌러 주세요."),
        makeForm([
          { name: "code", label: "새 수강 코드", type: "text", required: true, pattern: "^.{4,}$", patternMsg: "4자 이상으로 입력해 주세요." },
        ], "수강 코드 변경", function (v) {
          draft.classroom.accessCodeHash = KU.hashSecret(v.code);
          delete draft.classroom.accessCode;
          rosterFresh = true;
          markDirty(); showTab("roster");
        }),
      ]),
    ];
  }

  function tabRoster() {
    if (REMOTE) return tabRosterRemote();
    var roster = store.get("roster", []);
    function sync() {
      store.set("roster", roster);
      draft.classroom.rosterHashes = roster.map(function (r) { return KU.rosterHash(r.id, r.name); });
      markDirty(); showTab("roster");
    }
    function addMany(text) {
      var added = 0, skipped = 0;
      text.split(/\r?\n/).forEach(function (line) {
        var p = line.replace(/^﻿/, "").split(/[,\t;]/).map(function (x) { return x.replace(/^["'\s]+|["'\s]+$/g, ""); });
        if (!p[0] && !p[1]) return;
        var dup = roster.some(function (r) { return r.id === p[0]; });
        if (/^\d{10}$/.test(p[0]) && p[1] && !dup) { roster.push({ id: p[0], name: p[1] }); added++; } else skipped++;
      });
      return { added: added, skipped: skipped };
    }
    var result = h("p", { class: "field-hint", role: "status" });
    var bulk = h("textarea", { rows: 5, placeholder: "2026000001, 홍길동\n2026000002, 김고려", "aria-label": "여러 명 붙여 넣기" });
    var file = h("input", { type: "file", accept: ".csv,.txt", "aria-label": "명단 CSV 파일" });
    function report(r) {
      if (r.added) { sync(); return; }
      result.textContent = "추가된 사람이 없습니다. (건너뜀 " + r.skipped + "줄 — 학번 10자리·이름 형식과 중복을 확인하세요)";
    }
    file.addEventListener("change", function () {
      if (!file.files[0]) return;
      var reader = new FileReader();
      reader.onload = function () { report(addMany(String(reader.result))); };
      reader.readAsText(file.files[0]);
    });
    var hashCount = draft.classroom.rosterHashes.length;

    return [
      note("명단을 등록하면 명단에 있는 학번·이름만 '내 강의실'에 로그인할 수 있습니다. 명단이 비어 있으면 수강 코드만 맞으면 됩니다. 설정 파일에는 이름·학번 대신 지문(해시)만 들어가고, 읽을 수 있는 명단은 이 브라우저에만 보관됩니다."),
      !roster.length && hashCount ? note("설정에는 " + hashCount + "명이 등록돼 있지만 이 브라우저에는 이름 목록이 없습니다. 보관해 둔 명단 CSV를 다시 불러오세요. (여기서 새로 추가하면 기존 등록은 대체됩니다.)") : null,
      h("div", { class: "grid grid-2 ad-grid" }, [
        h("div", { class: "card ad-card" }, [
          h("h4", {}, "한 명 추가"),
          makeForm([
            { name: "id", label: "학번", type: "text", required: true, pattern: "^\\d{10}$", patternMsg: "학번은 숫자 10자리로 입력해 주세요." },
            { name: "name", label: "이름", type: "text", required: true },
          ], "명단에 추가", function (v, api) {
            if (roster.some(function (r) { return r.id === v.id; })) return api.fail("id", "이미 등록된 학번입니다.");
            roster.push({ id: v.id, name: v.name });
            sync();
          }),
        ]),
        h("div", { class: "card ad-card" }, [
          h("h4", {}, "여러 명 한꺼번에"),
          h("p", { class: "field-hint" }, "한 줄에 한 명씩 '학번, 이름'. 엑셀에서 두 열을 복사해 붙여도 됩니다."),
          bulk,
          h("div", { class: "ad-row" }, [
            button("붙여 넣은 명단 추가", "btn btn-primary btn-sm", function () { report(addMany(bulk.value)); }),
            h("label", { class: "ad-file" }, ["CSV 파일로 추가 ", file]),
          ]),
          result,
        ]),
      ]),
      h("div", { class: "card ad-card" }, [
        h("div", { class: "ad-row between" }, [
          h("h4", {}, "등록된 수강생 (" + roster.length + "명)"),
          h("span", { class: "ad-row" }, [
            button("명단 CSV 내려받기", "btn btn-ghost btn-sm", function () {
              download("수강생_명단.csv", toCsv(["학번", "이름"], roster.map(function (r) { return [r.id, r.name]; })), "text/csv");
            }),
            confirmButton("명단 모두 지우기", "btn btn-ghost btn-sm", function () { roster = []; sync(); }),
          ]),
        ]),
        roster.length ? h("div", { class: "ad-table-wrap" }, [
          h("table", { class: "ad-table" }, [
            h("thead", {}, [h("tr", {}, [h("th", {}, "번호"), h("th", {}, "학번"), h("th", {}, "이름"), h("th", {}, "")])]),
            h("tbody", {}, roster.map(function (r, i) {
              return h("tr", {}, [
                h("td", {}, i + 1), h("td", {}, r.id), h("td", {}, r.name),
                h("td", {}, [button("삭제", "ad-mini danger", function () { roster.splice(i, 1); sync(); })]),
              ]);
            })),
          ]),
        ]) : h("p", { class: "cal-empty" }, "아직 등록된 수강생이 없습니다."),
      ]),
      h("div", { class: "card ad-card" }, [
        h("h4", {}, "수강 코드 바꾸기"),
        h("p", { class: "field-hint" }, "수강생이 로그인할 때 쓰는 공용 코드입니다. 설정 파일에는 지문(해시)만 저장됩니다."),
        makeForm([
          { name: "code", label: "새 수강 코드", type: "text", required: true, pattern: "^.{4,}$", patternMsg: "4자 이상으로 입력해 주세요." },
        ], "수강 코드 변경", function (v) {
          draft.classroom.accessCodeHash = KU.hashSecret(v.code);
          delete draft.classroom.accessCode;
          markDirty(); showTab("roster");
        }),
      ]),
    ];
  }

  /* ── 탭: 내역 확인 ── */
  var recordsLoaded = false; // 서버 기록을 받아 왔는지
  var serverNames = {};      // 학번 → 이름(서버 기록에 있는 이름)
  function tabRecords() {
    if (REMOTE && !recordsLoaded) {
      adminCall("GET", "admin/records").then(function (res) {
        var att = {}, sub = {};
        res.attendance.forEach(function (r) { (att[r.id] = att[r.id] || {})[r.week] = r.at; serverNames[r.id] = r.name; });
        res.submissions.forEach(function (r) { (sub[r.id] = sub[r.id] || []).push(r); serverNames[r.id] = r.name; });
        store.set("attendance", att);
        store.set("submissions", sub);
        store.set("applications", res.applications);
        recordsLoaded = true;
        if (current === "records" && panel && panel.parentNode) showTab("records");
        recordsLoaded = false; // 다음에 탭을 열면 다시 받아 옵니다.
      }, function () {});
      return [h("p", { class: "cal-empty" }, "서버에서 기록을 불러오는 중입니다…")];
    }
    var roster = store.get("roster", []);
    function nameOf(id) {
      var r = roster.filter(function (x) { return x.id === id; })[0];
      return r ? r.name : (serverNames[id] || "");
    }
    var weeks = KU.weeks;

    var att = store.get("attendance", {});
    var attHead = ["학번", "이름"].concat(weeks.map(function (w) { return w.week + "주"; })).concat(["출석 수"]);
    var attRows = Object.keys(att).map(function (id) {
      var n = 0;
      var cells = weeks.map(function (w) { if (att[id][w.week]) { n++; return "O"; } return ""; });
      return [id, nameOf(id)].concat(cells).concat([n]);
    });

    var sub = store.get("submissions", {});
    var subHead = ["학번", "이름", "주차", "과제", "파일", "크기(MB)", "제출 시각", "지각", "메모"];
    var subRows = [];
    Object.keys(sub).forEach(function (id) {
      sub[id].forEach(function (s) {
        subRows.push([id, nameOf(id), s.week, s.title, s.file, (s.size / 1024 / 1024).toFixed(2), stamp(s.at), s.late ? "지각" : "", s.memo || ""]);
      });
    });

    var apps = store.get("applications", []);
    var fields = C.participate.apply.fields.filter(function (f) { return f.type !== "checkbox"; });
    var appHead = fields.map(function (f) { return f.label; }).concat(["신청 시각"]);
    var appRows = apps.map(function (a) {
      return fields.map(function (f) { return a[f.name] || ""; }).concat([stamp(a.at)]);
    });

    function block(title, file, head, rows, empty) {
      var dl = button("엑셀용 파일(CSV) 내려받기", "btn btn-ghost btn-sm", function () { download(file, toCsv(head, rows), "text/csv"); });
      dl.disabled = !rows.length;
      return h("div", { class: "card ad-card" }, [
        h("div", { class: "ad-row between" }, [h("h4", {}, title + " (" + rows.length + "건)"), dl]),
        table(head, rows, empty),
      ]);
    }
    return [
      note("이 브라우저에 저장된 기록만 보입니다. 서버가 없어서 수강생이 각자 기기에서 남긴 기록은 여기로 모이지 않습니다."),
      block("출석", "출석_내역.csv", attHead, attRows, "출석 기록이 없습니다."),
      block("과제 제출", "과제_제출_내역.csv", subHead, subRows, "과제 제출 기록이 없습니다."),
      block("수강 신청", "수강_신청_내역.csv", appHead, appRows, "수강 신청 기록이 없습니다."),
    ];
  }

  /* ── 탭: 설정 파일·보안 ── */
  function parseConfig(text) {
    var at = text.indexOf("window.SITE_CONFIG");
    var from = text.indexOf("{", at < 0 ? 0 : at), to = text.lastIndexOf("}");
    var data = JSON.parse(text.slice(from, to + 1));
    if (!data.site || !data.hero || !data.curriculum) throw new Error("not a config");
    return data;
  }
  function tabSecurity() {
    var msg = h("p", { class: "field-hint", role: "status" });
    var file = h("input", { type: "file", accept: ".js,.json,.txt", "aria-label": "설정 파일 불러오기" });
    file.addEventListener("change", function () {
      if (!file.files[0]) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = parseConfig(String(reader.result));
          data.admin = data.admin || { passwordHash: "" };
          data.notices = data.notices || { title: "공지사항", items: [] };
          data.classroom.rosterHashes = data.classroom.rosterHashes || [];
          data.portfolio = data.portfolio || clone(C.portfolio);
          data.curriculum.events = data.curriculum.events || [];
          data.popups = data.popups || clone(C.popups || []);
          draft = data;
          markDirty();
          msg.textContent = "불러왔습니다. 위쪽 '저장하고 적용'을 누르면 반영됩니다.";
        } catch (e) {
          msg.textContent = "불러오지 못했습니다. 이 화면에서 내려받은 설정 파일만 불러올 수 있습니다.";
        }
      };
      reader.readAsText(file.files[0]);
    });

    return [
      h("div", { class: "card ad-card" }, [
        h("h4", {}, "💾 설정 파일 저장·불러오기"),
        h("p", {}, REMOTE
          ? "지금 편집 중인 내용을 config.js 파일로 내려받습니다(백업용). 내용은 이미 서버(DB)에 저장되므로 파일을 교체할 필요는 없습니다."
          : "지금 편집 중인 내용을 config.js 파일로 내려받습니다. 이 파일로 사이트 폴더의 config.js를 바꿔 다시 올리면 모든 방문자에게 반영됩니다."),
        h("div", { class: "ad-row" }, [
          button("설정 파일 내려받기 (config.js)", "btn btn-primary btn-sm", function () {
            download("config.js",
              "/* 관리자 화면에서 내려받은 설정 파일 (" + today() + "). 사이트 폴더의 config.js를 이 파일로 교체하세요. */\n" +
              "window.SITE_CONFIG = " + JSON.stringify(clone(draft), null, 2) + ";\n", "text/javascript");
          }),
          h("label", { class: "ad-file" }, ["설정 파일 불러오기 ", file]),
        ]),
        msg,
      ]),
      h("div", { class: "card ad-card" }, [
        h("h4", {}, REMOTE ? "↩️ 서버에 저장된 수정본" : "↩️ 이 브라우저의 수정본"),
        h("p", {}, REMOTE
          ? (KU.usingOverride
            ? "지금은 서버(DB)에 저장된 수정본을 모든 방문자에게 보여 주고 있습니다. 수정본이 있는 동안에는 config.js 파일을 고쳐도 화면에 반영되지 않습니다."
            : "지금은 config.js 원본 그대로 보여 주고 있습니다. 관리자 화면에서 무엇이든 저장하면 그때부터 서버(DB)의 수정본을 씁니다.")
          : (KU.usingOverride
            ? "지금 이 브라우저는 관리자 화면에서 고친 수정본을 보여 주고 있습니다. 다른 방문자는 서버의 config.js를 봅니다."
            : "지금은 config.js 원본 그대로 보여 주고 있습니다.")),
        confirmButton("수정본 지우고 config.js 원본으로 되돌리기", "btn btn-ghost btn-sm", function () {
          if (REMOTE) return adminCall("DELETE", "config").then(function () { location.reload(); }, function () {});
          store.set("config", null);
          location.reload();
        }),
      ]),
      h("div", { class: "card ad-card" }, [
        h("h4", {}, "🔑 관리자 비밀번호 바꾸기"),
        h("p", { class: "field-hint" }, "비밀번호 자체는 저장되지 않고 지문(해시)만 설정에 들어갑니다. 바꾼 뒤 '저장하고 적용' → 설정 파일을 내려받아 교체해야 다른 기기에도 적용됩니다."),
        makeForm(NEW_PW, "비밀번호 변경", function (v, api) {
          if (v.pw !== v.pw2) return api.fail("pw2", "두 비밀번호가 서로 다릅니다.");
          draft.admin.passwordHash = KU.hashSecret(v.pw);
          markDirty(); showTab("security");
        }),
      ]),
      note("참고: 서버 없는 사이트의 관리자 잠금은 화면을 가려 주는 수준입니다. 설정 파일은 누구나 내려받을 수 있으니 비밀번호는 길고 다른 곳에서 쓰지 않는 것으로 정하고, 민감한 개인정보는 사이트에 넣지 마세요."),
    ];
  }

  /* ── 관리자 화면 틀 ── */
  var TABS = [["edit", "내용 편집", tabEdit], ["popups", "팝업", tabPopups], ["roster", "강의 관리", tabManage],
    ["records", "내역 확인", tabRecords], ["security", "설정 파일·보안", tabSecurity]];
  var panel, body, status, saveBtn, tabBar, current = "edit";
  var editSection = ""; // '내용 편집' 탭에서 열어 둘 영역

  function updateStatus() {
    if (!status) return;
    status.textContent = dirty ? "저장하지 않은 변경이 있습니다" : "";
    saveBtn.disabled = !dirty;
  }
  function markDirty() { dirty = true; updateStatus(); }

  function showTab(id) {
    if (!TABS.some(function (t) { return t[0] === id; })) id = TABS[0][0]; // 없어진 탭을 기억하고 있으면 첫 탭으로
    current = id;
    rememberTab(id);
    [].forEach.call(tabBar.children, function (b) {
      var on = b.getAttribute("data-tab") === id;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
    });
    var tab = TABS.filter(function (t) { return t[0] === id; })[0] || TABS[0];
    body.textContent = "";
    tab[2]().forEach(function (el) { if (el) body.appendChild(el); });
    updateStatus();
  }

  function closePanel() {
    panel.remove();
    document.body.classList.remove("admin-open");
  }
  function openPanel(tab) {
    if (inline) inline.close(false); // 본문 편집 중이던 내용은 그대로 두고 편집 상자만 닫음
    if (!panel) {
      status = h("span", { class: "ad-status", role: "status" });
      saveBtn = button("저장하고 적용", "btn btn-primary btn-sm", function () { saveDraft(true); });
      tabBar = h("div", { class: "ad-tabs", role: "tablist" }, TABS.map(function (t) {
        var b = h("button", { class: "ad-tab", type: "button", role: "tab", "data-tab": t[0] }, t[1]);
        b.addEventListener("click", function () { showTab(t[0]); });
        return b;
      }));
      body = h("div", { class: "ad-body" });
      panel = h("div", { class: "admin", role: "dialog", "aria-modal": "true", "aria-label": "관리자 화면" }, [
        h("div", { class: "ad-top" }, [
          h("div", { class: "container ad-top-inner" }, [
            h("b", { class: "ad-title" }, "🔧 관리자 모드"),
            status,
            h("span", { class: "ad-row" }, [
              saveBtn,
              button("사이트 보기", "btn btn-ghost btn-sm", closePanel),
              button("로그아웃", "btn btn-ghost btn-sm", function () { setAdmin(false); closePanel(); }),
            ]),
          ]),
          h("div", { class: "container" }, [tabBar]),
        ]),
        h("div", { class: "container" }, [body]),
      ]);
    }
    document.body.appendChild(panel);
    document.body.classList.add("admin-open");
    showTab(tab || lastTab() || current);
  }

  /* ── 본문에서 바로 편집 (관리자 로그인 중에만) ──
   * '편집' 버튼을 누르면 그 자리의 내용이 편집 상자로 바뀝니다. 관리자 창을 열지 않습니다. */
  var inline = null;        // 지금 열려 있는 본문 편집 상자
  var inlineRefresh = null; // 편집 상자 다시 그리기
  function rerender(tab) { if (inlineRefresh) inlineRefresh(); else showTab(tab); }

  function openInline(cfg, btn) {
    if (inline) inline.close(false);
    var hidden = cfg.hide().filter(Boolean);
    if (!hidden.length) return;
    var body = h("div", { class: "inline-body" });
    function render() {
      body.textContent = "";
      cfg.build().forEach(function (el) { if (el) body.appendChild(el); });
    }
    var box = h("div", { class: "inline-editor" }, [
      h("div", { class: "inline-head" }, "✏️ " + cfg.label + " — 여기서 바로 수정합니다"),
      body,
      h("div", { class: "inline-bar" }, [
        button("저장하고 적용", "btn btn-primary btn-sm", function () { saveDraft(true, cfg.anchor); }),
        button("취소", "btn btn-ghost btn-sm", function () { inline.close(true); }),
        h("span", { class: "field-hint" }, "저장하면 이 브라우저에 바로 반영됩니다. 모든 방문자에게 보이게 하려면 자물쇠 → 설정 파일·보안에서 config.js를 내려받아 교체하세요."),
      ]),
    ]);
    hidden[0].parentNode.insertBefore(box, hidden[0]);
    hidden.forEach(function (el) { el.style.display = "none"; });
    btn.style.display = "none";
    inlineRefresh = render;
    inline = {
      close: function (revert) {
        box.remove();
        hidden.forEach(function (el) { el.style.display = ""; });
        btn.style.display = "";
        inlineRefresh = null;
        inline = null;
        if (revert) { draft = clone(C); dirty = false; updateStatus(); } // 취소: 고치던 내용 버림
      },
    };
    render();
  }
  function all(sel) { return [].slice.call(document.querySelectorAll(sel)); }

  [
    {
      at: "#weeks-title", label: "주차별 학습", anchor: "weeks-title",
      hide: function () { return all("#curriculum .week-list"); },
      build: function () {
        return [
          h("p", { class: "field-hint" }, "주차를 펼쳐 제목·학습 내용·참고 영상·과제를 고칩니다. ↑ ↓ 로 순서를 바꾸고, 맨 아래 '＋ 추가'로 주차를 늘립니다."),
          arrayEditor(draft.curriculum, "weeks"),
        ];
      },
    },
    {
      at: "#calendar", label: "월간 수업 달력", anchor: "calendar",
      hide: function () { return all("#curriculum .cal-wrap"); },
      build: function () { return tabEvents().slice(1); },
    },
    // 포트폴리오는 카드의 수정·삭제 버튼과 '과제물 추가' 칸으로 편집합니다(위 KU.onFolioCard).
    {
      at: "#participate .section-head", label: "참여하기", anchor: "participate",
      hide: function () { return all("#participate .container > *:not(.section-head)"); },
      build: function () { return [objectEditor(draft.participate)]; },
    },
    {
      at: "#faq .section-head", label: "자주 묻는 질문", anchor: "faq",
      hide: function () { return all("#faq .faq-list"); },
      build: function () {
        return [
          h("p", { class: "field-hint" }, "질문을 펼쳐 질문·답변을 고칩니다. '＋ 추가'로 새 질문을 만들고 '삭제'로 지웁니다."),
          arrayEditor(draft.faq, "items"),
        ];
      },
    },
  ].forEach(function (cfg) {
    var target = document.querySelector(cfg.at);
    if (!target) return;
    target.appendChild(button("✏️ 여기서 편집", "edit-here", function (btn) {
      if (!isAdmin()) return onLock();
      openInline(cfg, btn);
    }));
  });

  // 수강 안내는 관리자 창에서 편집
  (function () {
    var target = document.querySelector("#guide .section-head");
    if (!target) return;
    target.appendChild(button("✏️ 수강 안내 편집", "edit-here", function () {
      if (!isAdmin()) return onLock();
      editSection = "guide";
      openPanel("edit");
    }));
  })();
  showAdminState();

  // 본문 편집을 저장한 뒤에는 그 섹션으로 돌아옵니다.
  try {
    var backTo = sessionStorage.getItem(SESSION_KEY + ":goto");
    sessionStorage.removeItem(SESSION_KEY + ":goto");
    if (backTo && document.getElementById(backTo)) {
      setTimeout(function () { document.getElementById(backTo).scrollIntoView(); }, 60);
    }
  } catch (e) { /* 무시 */ }

  document.getElementById("adminBtn").addEventListener("click", onLock);
  // '저장하고 적용' 뒤 새로고침되어도 관리자 화면으로 돌아오도록
  var reopen = false;
  try {
    reopen = sessionStorage.getItem(SESSION_KEY + ":open") === "1";
    sessionStorage.removeItem(SESSION_KEY + ":open");
  } catch (e) { /* 무시 */ }
  if (reopen && isAdmin()) openPanel();
  } // startAdmin 끝
})();

/* config.js의 내용을 읽어 화면을 그립니다. 내용 수정은 config.js에서 하세요. */
(function () {
  "use strict";

  var BASE = window.SITE_CONFIG;
  if (!BASE) {
    document.getElementById("main").textContent = "config.js를 불러오지 못했습니다.";
    return;
  }

  // 브라우저 저장소(localStorage). 쓸 수 없는 환경에서는 새로고침 전까지만 기억합니다.
  var memory = {};
  var store = {
    get: function (k, def) {
      try {
        var v = localStorage.getItem("kucourse:" + k);
        if (v !== null) { v = JSON.parse(v); return v === null ? def : v; }
      } catch (e) { /* 아래 memory 사용 */ }
      return k in memory && memory[k] !== null ? memory[k] : def;
    },
    set: function (k, v) {
      memory[k] = v;
      try { localStorage.setItem("kucourse:" + k, JSON.stringify(v)); } catch (e) { /* memory에만 저장 */ }
    },
  };

  // SHA-256: 비밀번호·수강 코드·명단을 원문 대신 지문(해시)으로 저장하고 비교합니다.
  function sha256(text) {
    function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
    var K = [], H = [], found = 0, cand = 2, d, t;
    while (found < 64) {
      var prime = true;
      for (d = 2; d * d <= cand; d++) if (cand % d === 0) { prime = false; break; }
      if (prime) {
        if (found < 8) H[found] = (Math.pow(cand, 0.5) * 4294967296) | 0;
        K[found] = (Math.pow(cand, 1 / 3) * 4294967296) | 0;
        found++;
      }
      cand++;
    }
    var data = Array.prototype.slice.call(new TextEncoder().encode(text));
    var bits = data.length * 8;
    data.push(0x80);
    while (data.length % 64 !== 56) data.push(0);
    for (d = 7; d >= 0; d--) data.push(d >= 4 ? 0 : (bits >>> (d * 8)) & 255);
    for (var off = 0; off < data.length; off += 64) {
      var w = [];
      for (t = 0; t < 64; t++) {
        if (t < 16) {
          w[t] = (data[off + t * 4] << 24) | (data[off + t * 4 + 1] << 16) | (data[off + t * 4 + 2] << 8) | data[off + t * 4 + 3];
        } else {
          var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
          var s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
          w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
        }
      }
      var a = H[0], b = H[1], c = H[2], dd = H[3], e = H[4], f = H[5], g = H[6], hh = H[7];
      for (t = 0; t < 64; t++) {
        var t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0;
        var t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        hh = g; g = f; f = e; e = (dd + t1) | 0; dd = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + dd) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + hh) | 0;
    }
    return H.map(function (x) { return ("00000000" + (x >>> 0).toString(16)).slice(-8); }).join("");
  }
  function hashSecret(s) { return sha256("kucourse|" + s); }
  function rosterHash(id, name) { return sha256("kucourse|roster|" + id + "|" + name); }

  /* 관리자 화면에서 고친 내용(이 브라우저에 저장)이 있으면 그것을 씁니다.
   * config.js 파일이 바뀌면 예전 수정본은 자동으로 버립니다. 주소 끝에 ?reset 을 붙여도 버립니다. */
  var baseStamp = sha256(JSON.stringify(BASE));
  if (/[?&]reset\b/.test(location.search)) store.set("config", null);
  var override = store.get("config", null);
  var usingOverride = !!(override && override.base === baseStamp && override.data);
  var C = usingOverride ? override.data : BASE;
  C.notices = C.notices || { title: "공지사항", items: [] };
  C.admin = C.admin || { passwordHash: "" };
  C.portfolio = C.portfolio || { id: "portfolio", eyebrow: "Portfolio", title: "우수 과제 포트폴리오", lead: "", buttonLabel: "과제물 보기", emptyText: "", items: [] };
  C.classroom.rosterHashes = C.classroom.rosterHashes || [];

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 요소 생성 도우미: h("div", {class: "card"}, [자식...])
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined || attrs[k] === "") return;
      if (k === "class") el.className = attrs[k];
      else if (k === "style") el.style.cssText = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    [].concat(children || []).forEach(function (c) {
      if (c === null || c === undefined || c === "") return;
      el.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
    });
    return el;
  }

  function sectionHead(cfg) {
    return h("div", { class: "section-head reveal" }, [
      h("span", { class: "eyebrow" }, cfg.eyebrow),
      h("h2", {}, cfg.title),
      cfg.lead ? h("p", { class: "lead" }, cfg.lead) : null,
    ]);
  }

  function section(cfg, body) {
    return h("section", { class: "section", id: cfg.id }, [
      h("div", { class: "container" }, [sectionHead(cfg)].concat(body)),
    ]);
  }

  function iconBubble(icon) {
    return h("div", { class: "icon-bubble", "aria-hidden": "true" }, icon);
  }

  var site = C.site;
  var courseName = "「" + site.courseTitle + "」";
  // 제목 옆·위에 붙는 소속 줄: brandSub가 있으면 그것을, 없으면 "대학교 학과"
  var orgLine = site.brandSub || site.university + " " + site.department;
  document.title = courseName + " | " + orgLine;

  /* ── 헤더 ── */
  var brand = document.getElementById("brand");
  // 로고: 이미지가 있으면 이미지, 없으면 이모지
  function logoMark(cls) {
    return h("span", { class: cls + (site.logoImage ? " has-img" : ""), "aria-hidden": "true" },
      site.logoImage ? h("img", { src: site.logoImage, alt: "" }) : site.logoEmoji);
  }
  brand.appendChild(logoMark("brand-logo"));
  if (site.logoImage) document.head.appendChild(h("link", { rel: "icon", href: site.logoImage }));
  brand.appendChild(h("span", { class: "brand-text" }, [
    h("span", { class: "brand-sub" }, site.headerSub || orgLine),
    h("span", { class: "brand-title" }, courseName),
  ]));

  var nav = document.getElementById("siteNav");
  C.nav.forEach(function (item) {
    nav.appendChild(h("a", { href: "#" + item.id, "data-target": item.id }, item.label));
  });

  /* ── 첫 화면 ── */
  var hero = C.hero;
  var heroEl = h("section", { class: "hero" }, [
    h("div", { class: "container" }, [
      h("span", { class: "hero-badge" }, hero.badge),
      h("p", { class: "hero-dept" }, orgLine),
      h("h1", {}, courseName),
      h("p", { class: "hero-subtitle" }, hero.subtitle),
      h("p", { class: "hero-desc" }, hero.description),
      h("div", { class: "hero-actions" }, hero.buttons.map(function (b) {
        var external = b.href.charAt(0) !== "#";
        return h("a", {
          class: "btn " + (b.primary ? "btn-primary" : "btn-ghost"),
          href: b.href,
          target: external ? "_blank" : "",
          rel: external ? "noopener" : "",
        }, b.label);
      })),
      h("div", { class: "card quick" }, hero.quickInfo.map(function (it) {
        return h("div", { class: "quick-item" }, [
          iconBubble(it.icon),
          h("div", {}, [
            h("div", { class: "quick-label" }, it.label),
            h("div", { class: "quick-value" }, it.value),
          ]),
        ]);
      })),
    ]),
  ]);
  // 벚꽃잎
  for (var i = 0; i < 12; i++) {
    var size = 10 + Math.random() * 10;
    heroEl.appendChild(h("span", {
      class: "petal",
      "aria-hidden": "true",
      style: "left:" + (Math.random() * 100) + "%;width:" + size + "px;height:" + size + "px;" +
        "animation-duration:" + (9 + Math.random() * 9) + "s;animation-delay:-" + (Math.random() * 18) + "s;",
    }));
  }

  /* ── 통계 ── */
  var statsEl = h("section", { class: "stats", "aria-label": "숫자로 보는 강의" }, [
    h("div", { class: "container grid grid-4 stats-grid" }, C.stats.map(function (s) {
      return h("div", { class: "card lift stat reveal" }, [
        h("div", { class: "stat-value" }, [
          h("span", { class: "stat-num", "data-value": s.value }, s.value),
          h("span", { class: "stat-suffix" }, s.suffix),
        ]),
        h("div", { class: "stat-label" }, s.label),
      ]);
    })),
  ]);

  /* ── 강의 소개: 장점 슬라이드 ── */
  var about = C.about;
  var track = h("div", { class: "slider-track", tabindex: "0", role: "group", "aria-label": "강의의 장점 (좌우로 넘겨 보기)" },
    about.slides.map(function (s, idx) {
      return h("article", { class: "card lift slide" }, [
        h("div", { class: "slide-top" }, [
          iconBubble(s.icon),
          h("span", { class: "slide-no" }, (idx < 9 ? "0" : "") + (idx + 1)),
        ]),
        h("h3", {}, s.title),
        h("p", {}, s.text),
      ]);
    }));
  var prevBtn = h("button", { class: "slider-btn", type: "button", "aria-label": "이전 장점" }, "‹");
  var nextBtn = h("button", { class: "slider-btn", type: "button", "aria-label": "다음 장점" }, "›");
  var dots = h("div", { class: "slider-dots" });
  var aboutEl = section(about, [
    about.intro && about.intro.length
      ? h("div", { class: "card about-text reveal" }, about.intro.map(function (p) { return h("p", {}, p); })) : null,
    about.slidesTitle ? h("h3", { class: "sub-title gap-top reveal" }, about.slidesTitle) : null,
    h("div", { class: "slider reveal" }, [
      track,
      h("div", { class: "slider-controls" }, [prevBtn, dots, nextBtn]),
    ]),
    about.goals && about.goals.length ? h("h3", { class: "sub-title gap-top reveal" }, about.goalsTitle) : null,
    about.goals && about.goals.length ? h("div", { class: "card reveal" }, [
      about.goalsLead ? h("p", { class: "goals-lead" }, about.goalsLead) : null,
      h("ol", { class: "goal-list" }, about.goals.map(function (g) { return h("li", {}, g); })),
    ]) : null,
    infographic(about.infographic),
  ]);

  /* 인포그래픽: 활용하는 것 → 만드는 것 / 제작 과정 / 학습 흐름 / 도구 */
  function infographic(ig) {
    if (!ig) return null;
    function block(title, body) {
      return h("div", { class: "ig-block" }, [h("div", { class: "ig-label" }, title), body]);
    }
    return h("figure", { class: "card ig reveal", "aria-label": ig.title }, [
      h("figcaption", { class: "ig-title" }, ig.title),

      h("div", { class: "ig-io" }, [
        block(ig.inputsTitle, h("ul", { class: "ig-inputs" }, ig.inputs.map(function (x) {
          return h("li", {}, [
            h("span", { class: "ig-icon", "aria-hidden": "true" }, x.icon),
            h("div", {}, [h("b", {}, x.title), h("span", {}, x.text)]),
          ]);
        }))),
        h("div", { class: "ig-arrow", "aria-hidden": "true" }, "➜"),
        block(ig.outputsTitle, h("ul", { class: "ig-outputs" }, ig.outputs.map(function (x) {
          return h("li", {}, [h("span", { class: "ig-icon", "aria-hidden": "true" }, x.icon), h("b", {}, x.label)]);
        }))),
      ]),

      block(ig.stepsTitle, h("ol", { class: "ig-steps" }, ig.steps.map(function (s, idx) {
        return h("li", {}, [
          h("span", { class: "ig-num" }, idx + 1),
          h("span", { class: "ig-step-icon", "aria-hidden": "true" }, s.icon),
          h("b", {}, s.title),
          h("span", {}, s.text),
        ]);
      }))),

      block(ig.roadmapTitle, h("div", {}, [
        h("div", { class: "ig-bar", "aria-hidden": "true" }, ig.roadmap.map(function (r) {
          return h("span", { style: "flex-grow:" + (Number(r.span) || 1) }, r.weeks);
        })),
        h("ol", { class: "ig-road" }, ig.roadmap.map(function (r) {
          return h("li", {}, [h("em", {}, r.weeks), h("b", {}, r.title), h("span", {}, r.text)]);
        })),
      ])),

      block(ig.toolsTitle, h("ul", { class: "ig-tools" }, ig.toolGroups.map(function (g) {
        return h("li", {}, [
          h("b", {}, g.title),
          h("div", {}, g.items.map(function (t) { return h("span", {}, t); })),
        ]);
      }))),
    ]);
  }

  /* ── 커리큘럼 ── */
  var cur = C.curriculum;
  var sched = cur.schedule;
  var DOW = ["일", "월", "화", "수", "목", "금", "토"];

  // "2026-03-03" 또는 "2026-03-17T23:59" → 날짜(내 컴퓨터 시간 기준)
  function parseDate(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T(\d{1,2}):(\d{2}))?/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null; // 형식이 틀리면 null
  }
  function dateKey(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function fmtDate(d) { return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate() + " (" + DOW[d.getDay()] + ")"; }
  function fmtShort(d) { return (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + DOW[d.getDay()] + ")"; }
  function fmtDateTime(d) {
    return fmtDate(d) + " " + (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
  }

  // 수업 날짜 자동 계산: 첫 수업일부터 7일 간격. 주차에 date를 적으면 그 날짜가 우선합니다.
  var firstClass = parseDate(sched.firstClass) || new Date();
  var weeks = cur.weeks;
  var classMap = {}; // 날짜 → 주차
  var dueMap = {};   // 날짜 → 과제 마감인 주차들
  weeks.forEach(function (w, idx) {
    w._date = parseDate(w.date)
      || new Date(firstClass.getFullYear(), firstClass.getMonth(), firstClass.getDate() + 7 * idx);
    w._time = w.time || sched.time;
    w._place = w.location || sched.location;
    classMap[dateKey(w._date)] = w;
    if (w.assignment) {
      w._due = parseDate(w.assignment.due) || w._date;
      (dueMap[dateKey(w._due)] = dueMap[dateKey(w._due)] || []).push(w);
    }
  });

  // 달력에만 표시되는 일정(휴강·보강·행사 등). 관리자 로그인 뒤 달력에서 날짜를 눌러 관리합니다.
  cur.events = cur.events || [];
  var eventMap = {}; // 날짜 → 일정들
  function buildEventMap() {
    eventMap = {};
    cur.events.forEach(function (ev) {
      var d = parseDate(ev.date);
      if (d) (eventMap[dateKey(d)] = eventMap[dateKey(d)] || []).push(ev);
    });
  }
  buildEventMap();

  function dotList(items) {
    return h("ul", { class: "dot-list" }, items.map(function (t) { return h("li", {}, t); }));
  }

  function assignmentBox(w) {
    var a = w.assignment;
    return h("div", { class: "assign" }, [
      h("div", { class: "assign-head" }, [
        h("h4", {}, "📝 " + a.title),
        h("span", { class: "countdown", "data-due": String(w._due.getTime()) }),
      ]),
      h("p", {}, a.text),
      h("p", { class: "assign-due" }, [h("b", {}, "마감 "), fmtDateTime(w._due)]),
      (function () {
        var url = a.submitUrl || sched.submitUrl;
        var external = url.charAt(0) !== "#";
        return h("a", {
          class: "btn btn-primary btn-sm", href: url, "data-assign": w.week,
          target: external ? "_blank" : "", rel: external ? "noopener" : "",
        }, "과제 제출하기");
      })(),
    ]);
  }

  var weekList = h("div", { class: "week-list" }, weeks.map(function (w) {
    return h("details", { class: "card week-item reveal", id: "week-" + w.week }, [
      h("summary", {}, [
        h("div", { class: "week-num" }, [h("span", {}, [h("b", {}, w.week), "주차"])]),
        h("div", { class: "week-sum" }, [
          h("h3", {}, [
            w.title,
            w.tag ? h("span", { class: "tag" }, w.tag) : null,
            w.assignment ? h("span", { class: "tag tag-assign" }, "과제") : null,
          ]),
          h("div", { class: "week-when" }, fmtShort(w._date) + " · " + w._time),
        ]),
      ]),
      h("div", { class: "week-detail" }, [
        h("div", { class: "meta-row" }, [
          h("span", { class: "contact" }, [h("span", { "aria-hidden": "true" }, "🗓️"), h("b", {}, "날짜·시간"), fmtDate(w._date) + " " + w._time]),
          h("span", { class: "contact" }, [h("span", { "aria-hidden": "true" }, "📍"), h("b", {}, "장소"), w._place]),
        ]),
        h("div", {}, [h("h4", {}, "학습 내용"), dotList(w.topics)]),
        w.videos && w.videos.length ? h("div", {}, [
          h("h4", {}, "참고 영상"),
          h("div", { class: "meta-row" }, w.videos.map(function (v) {
            return h("a", { class: "contact video-link", href: v.url, target: "_blank", rel: "noopener" }, [
              h("span", { "aria-hidden": "true" }, "▶"), v.label,
            ]);
          })),
        ]) : null,
        w.assignment ? assignmentBox(w) : null,
      ]),
    ]);
  }));

  /* 월간 달력 */
  var calTitle = h("h4", { class: "cal-title", "aria-live": "polite" });
  var calGrid = h("div", { class: "cal-grid" });
  var calDetail = h("div", { class: "card cal-detail", "aria-live": "polite" });
  var calPrev = h("button", { class: "slider-btn cal-btn", type: "button", "aria-label": "이전 달" }, "‹");
  var calNext = h("button", { class: "slider-btn cal-btn", type: "button", "aria-label": "다음 달" }, "›");
  var calToday = h("button", { class: "cal-today", type: "button" }, "오늘");

  var curEl = section(cur, [
    h("h3", { class: "sub-title reveal", id: "weeks-title" }, cur.weeksTitle),
    weekList,
    h("h3", { class: "sub-title gap-top reveal", id: "calendar" }, cur.calendarTitle),
    h("div", { class: "cal-wrap reveal" }, [
      h("div", { class: "card cal" }, [
        h("div", { class: "cal-head" }, [calPrev, h("div", { class: "cal-head-mid" }, [calTitle, calToday]), calNext]),
        calGrid,
        h("div", { class: "cal-legend" }, [
          h("span", {}, [h("i", { class: "lg lg-class" }), "수업"]),
          h("span", {}, [h("i", { class: "lg lg-due" }), "과제 마감"]),
          h("span", {}, [h("i", { class: "lg lg-event" }), "일정"]),
          h("span", {}, [h("i", { class: "lg lg-today" }), "오늘"]),
        ]),
      ]),
      calDetail,
    ]),
    cur.projects && cur.projects.length ? h("h3", { class: "sub-title gap-top reveal" }, cur.projectsTitle) : null,
    cur.projects && cur.projects.length ? h("div", { class: "card reveal" }, [
      cur.projectsLead ? h("p", { class: "goals-lead" }, cur.projectsLead) : null,
      h("ul", { class: "chip-list" }, cur.projects.map(function (p) { return h("li", {}, p); })),
      cur.projectsNote ? h("p", { class: "card-note" }, cur.projectsNote) : null,
    ]) : null,
  ]);

  var now = new Date();
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // 처음 보여 줄 날: 다가오는 가장 가까운 수업(없으면 1주차)
  var focusWeek = weeks.filter(function (w) { return w._date >= todayStart; })[0] || weeks[0];
  var selected = focusWeek._date;
  var viewY = selected.getFullYear();
  var viewM = selected.getMonth();

  function openWeek(w) {
    var el = document.getElementById("week-" + w.week);
    el.open = true;
    el.classList.add("in");
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  function renderDetail() {
    var w = classMap[dateKey(selected)];
    var dues = dueMap[dateKey(selected)] || [];
    var events = eventMap[dateKey(selected)] || [];
    calDetail.textContent = "";
    calDetail.appendChild(h("div", { class: "cal-detail-date" }, fmtDate(selected)));
    events.forEach(function (ev) {
      calDetail.appendChild(h("div", { class: "cal-event" }, [
        h("div", { class: "board-head" }, [ev.type ? h("span", { class: "tag tag-event" }, ev.type) : null, h("b", {}, ev.title)]),
        ev.text ? h("p", {}, ev.text) : null,
      ]));
    });
    if (w) {
      var more = h("button", { class: "btn btn-ghost btn-sm", type: "button" }, "커리큘럼에서 자세히 보기");
      more.addEventListener("click", function () { openWeek(w); });
      [
        h("h4", {}, w.week + "주차 · " + w.title),
        h("div", { class: "meta-row" }, [
          h("span", { class: "contact" }, [h("span", { "aria-hidden": "true" }, "⏰"), w._time]),
          h("span", { class: "contact" }, [h("span", { "aria-hidden": "true" }, "📍"), w._place]),
        ]),
        dotList(w.topics),
        w.assignment ? h("p", { class: "cal-note" }, "📝 과제: " + w.assignment.title + " (마감 " + fmtDateTime(w._due) + ")") : null,
        more,
      ].forEach(function (el) { if (el) calDetail.appendChild(el); });
    } else if (!dues.length && !events.length) {
      calDetail.appendChild(h("p", { class: "cal-empty" }, "수업이 없는 날입니다. 색이 칠해진 날짜를 눌러 보세요."));
    }
    dues.forEach(function (dw) {
      var go = h("button", { class: "btn btn-ghost btn-sm", type: "button" }, dw.week + "주차 과제 보기");
      go.addEventListener("click", function () { openWeek(dw); });
      calDetail.appendChild(h("div", { class: "assign" }, [
        h("div", { class: "assign-head" }, [
          h("h4", {}, "📝 과제 마감일"),
          h("span", { class: "countdown", "data-due": String(dw._due.getTime()) }),
        ]),
        h("p", {}, dw.week + "주차 · " + dw.assignment.title),
        h("p", { class: "assign-due" }, [h("b", {}, "마감 "), fmtDateTime(dw._due)]),
        go,
      ]));
    });
    // 관리자 로그인 중이면 이 자리에 일정 추가·수정·삭제 도구가 붙습니다(admin.js).
    if (window.KU && window.KU.onCalDetail) window.KU.onCalDetail(calDetail, selected);
    updateCountdowns();
  }

  function renderCalendar() {
    calTitle.textContent = viewY + "년 " + (viewM + 1) + "월";
    calGrid.textContent = "";
    DOW.forEach(function (d) { calGrid.appendChild(h("div", { class: "cal-dow" }, d)); });
    var lead = new Date(viewY, viewM, 1).getDay();
    for (var b = 0; b < lead; b++) calGrid.appendChild(h("div", {}));
    var last = new Date(viewY, viewM + 1, 0).getDate();
    for (var day = 1; day <= last; day++) {
      (function (d) {
        var k = dateKey(d);
        var w = classMap[k];
        var evs = eventMap[k];
        var cls = "cal-day" + (w ? " has-class" : "") + (dueMap[k] ? " has-due" : "") + (evs ? " has-event" : "") +
          (k === dateKey(todayStart) ? " today" : "") + (k === dateKey(selected) ? " selected" : "");
        var label = fmtShort(d) + (w ? ", " + w.week + "주차 수업" : "") + (dueMap[k] ? ", 과제 마감" : "") +
          (evs ? ", 일정: " + evs.map(function (ev) { return ev.title; }).join(", ") : "");
        var btn = h("button", { class: cls, type: "button", "aria-label": label, "aria-pressed": String(k === dateKey(selected)) }, [
          h("span", {}, d.getDate()),
          w ? h("span", { class: "cal-wk" }, w.week + "주차") : null,
          evs ? h("i", { class: "cal-ev-dot", "aria-hidden": "true" }) : null,
        ]);
        btn.addEventListener("click", function () { selected = d; renderCalendar(); renderDetail(); });
        calGrid.appendChild(btn);
      })(new Date(viewY, viewM, day));
    }
  }
  function moveMonth(diff) {
    var d = new Date(viewY, viewM + diff, 1);
    viewY = d.getFullYear(); viewM = d.getMonth();
    renderCalendar();
  }
  calPrev.addEventListener("click", function () { moveMonth(-1); });
  calNext.addEventListener("click", function () { moveMonth(1); });
  calToday.addEventListener("click", function () {
    selected = todayStart; viewY = todayStart.getFullYear(); viewM = todayStart.getMonth();
    renderCalendar(); renderDetail();
  });

  /* 마감까지 남은 시간 */
  function updateCountdowns() {
    var t = Date.now();
    [].forEach.call(document.querySelectorAll("[data-due]"), function (el) {
      var left = Number(el.getAttribute("data-due")) - t;
      var mins = Math.floor(left / 60000);
      var days = Math.floor(mins / 1440);
      var hours = Math.floor((mins % 1440) / 60);
      var text;
      if (left <= 0) text = "마감되었습니다";
      else if (days >= 1) text = "D-" + days + " · " + days + "일 " + hours + "시간 남음";
      else if (mins >= 60) text = "오늘 마감 · " + hours + "시간 " + (mins % 60) + "분 남음";
      else text = "곧 마감 · " + Math.max(1, mins) + "분 남음";
      el.textContent = text;
      el.classList.toggle("closed", left <= 0);
      el.classList.toggle("urgent", left > 0 && days < 3);
    });
  }

  /* ── 포트폴리오: 우수 과제물 (구글 드라이브 주소로 등록) ── */
  // 드라이브 주소에서 파일(폴더) ID를 꺼냅니다. 드라이브 주소가 아니면 "".
  function driveId(url) {
    var m = /^https:\/\/(?:drive|docs)\.google\.com\/.*?(?:\/d\/|\/folders\/|[?&]id=)([\w-]{10,})/.exec(url || "");
    return m ? m[1] : "";
  }
  var folio = C.portfolio;
  var COVER_ICON = { "웹앱": "📱", "대시보드": "📈", "웹페이지": "📄" };
  var folioBox = h("div", { class: "folio-box" });
  var folioDrawn = false;
  // 카드 목록 그리기. 관리자가 추가·수정·삭제하면 다시 불립니다.
  function renderFolio() {
    folioBox.textContent = "";
    var grid = h("div", { class: "grid grid-3" }, folio.items.map(function (it, idx) {
      var id = driveId(it.driveUrl);
      var sample = id.indexOf("SAMPLE") === 0;
      var isFolder = /\/folders\//.test(it.driveUrl);
      var cover = h("div", { class: "folio-cover" }, [
        h("span", { class: "folio-icon", "aria-hidden": "true" }, COVER_ICON[it.category] || "🗂️"),
        it.category ? h("span", { class: "tag folio-cat" }, it.category) : null,
        sample ? h("span", { class: "tag folio-sample" }, "샘플") : null,
      ]);
      if (id && !sample && !isFolder) {
        var img = h("img", { src: "https://drive.google.com/thumbnail?id=" + id + "&sz=w640", alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
        img.addEventListener("error", function () { img.remove(); }); // 미리 보기 그림이 없으면 아이콘만
        cover.insertBefore(img, cover.firstChild);
      }
      var card = h("article", { class: "card lift folio reveal" + (folioDrawn ? " in" : "") }, [
        cover,
        h("div", { class: "folio-body" }, [
          h("h3", {}, it.title),
          h("p", { class: "sub-meta" }, [it.student, it.term].filter(Boolean).join(" · ")),
          it.description ? h("p", { class: "folio-desc" }, it.description) : null,
          id && !sample
            ? h("a", { class: "btn btn-ghost btn-sm", href: it.driveUrl, target: "_blank", rel: "noopener" }, folio.buttonLabel + " ↗")
            : h("span", { class: "btn btn-ghost btn-sm folio-off" }, sample ? "샘플 자료 (링크 없음)" : "주소를 확인해 주세요"),
        ]),
      ]);
      // 관리자 로그인 중이면 카드에 수정·삭제 버튼이 붙습니다(admin.js).
      if (window.KU && window.KU.onFolioCard) window.KU.onFolioCard(cover, idx);
      return card;
    }));
    // 관리자 로그인 중이면 맨 끝에 '추가' 칸이 붙습니다(admin.js).
    var extra = window.KU && window.KU.onFolioGrid && window.KU.onFolioGrid(grid);
    folioBox.appendChild(folio.items.length || extra ? grid : h("p", { class: "cal-empty folio-empty" }, folio.emptyText));
    folioDrawn = true;
  }
  renderFolio();
  var folioEl = section(folio, [folioBox]);

  /* ── 수강 안내: 도구 · 평가 · 참고자료 · 준비물 ── */
  var guide = C.guide;
  var guideBox = h("div", { class: "guide-box" });
  var guideDrawn = false;
  // 관리자가 카드를 추가·수정·삭제하면 다시 불립니다. 관리자용 버튼은 admin.js가 붙입니다.
  function renderGuide() {
    var K = window.KU || {};
    var adminOn = !!(K.adminOn && K.adminOn());
    var rv = " reveal" + (guideDrawn ? " in" : "");
    function hook(name, el, kind, idx) { if (K[name]) K[name](el, kind, idx); return el; }

    var toolGrid = h("div", { class: "grid grid-3" }, guide.tools.map(function (t, idx) {
      return hook("onGuideCard", h("div", { class: "card lift tool" + rv }, [
        h("div", { class: "tool-top" }, [
          iconBubble(t.icon),
          h("div", {}, [
            h("h4", {}, t.name),
            t.category ? h("span", { class: "tag" }, t.category) : null,
          ]),
        ]),
        h("p", {}, t.text),
      ]), "tools", idx);
    }));
    hook("onGuideGrid", toolGrid, "tools");

    var grading = guide.grading || [];
    var refs = guide.references || [];
    var extraGrid = h("div", { class: "grid grid-2 guide-extra" }, [
      grading.length || adminOn ? hook("onGuideBox", h("div", { class: "card guide-card" + rv }, [
        h("h3", { class: "card-title" }, "📊 " + guide.gradingTitle),
      ].concat(grading.map(function (g) {
        return h("div", { class: "bar-row" }, [
          h("div", { class: "bar-top" }, [h("span", {}, g.label), h("b", {}, g.percent + "%")]),
          h("div", { class: "bar" }, [h("div", { class: "bar-fill", style: "width:" + Math.max(0, Math.min(100, g.percent)) + "%" })]),
        ]);
      })).concat([guide.gradingNote ? h("p", { class: "card-note" }, guide.gradingNote) : null])), "grading") : null,
      refs.length || adminOn ? hook("onGuideBox", h("div", { class: "card guide-card" + rv }, [
        h("h3", { class: "card-title" }, "📚 " + guide.referencesTitle),
        guide.referencesLead ? h("p", { class: "goals-lead" }, guide.referencesLead) : null,
        h("ul", { class: "chip-list" }, refs.map(function (r) {
          return h("li", {}, r.href ? h("a", { href: r.href, target: "_blank", rel: "noopener" }, r.label) : r.label);
        })),
        guide.referencesNote ? h("p", { class: "card-note" }, guide.referencesNote) : null,
      ]), "references") : null,
    ]);

    var prepGrid = h("div", { class: "grid grid-2" }, guide.prep.map(function (p, idx) {
      return hook("onGuideCard", h("div", { class: "card lift prep" + rv }, [
        iconBubble(p.icon),
        h("div", {}, [
          h("h4", {}, p.title),
          h("p", {}, p.text),
        ]),
      ]), "prep", idx);
    }));
    hook("onGuideGrid", prepGrid, "prep");

    guideBox.textContent = "";
    [
      h("h3", { class: "sub-title" + rv }, guide.toolsTitle),
      toolGrid,
      extraGrid,
      h("h3", { class: "sub-title gap-top" + rv }, guide.prepTitle),
      prepGrid,
    ].forEach(function (el) { guideBox.appendChild(el); });
    guideDrawn = true;
  }
  renderGuide();
  var guideEl = section(guide, [guideBox]);

  /* ── FAQ ── */
  var faq = C.faq;
  var faqEl = section(faq, [
    h("div", { class: "faq-list" }, faq.items.map(function (it) {
      return h("details", { class: "card faq-item reveal" }, [
        h("summary", {}, it.q),
        h("div", { class: "faq-answer" }, it.a),
      ]);
    })),
  ]);

  /* ── 참여 기능 공통: 입력 폼(빠진 항목 검사 포함) ── */
  var uid = 0;
  function makeForm(fieldCfgs, submitLabel, onValid) {
    var alertBox = h("div", { class: "form-alert", role: "alert", hidden: "hidden" });
    var fields = fieldCfgs.map(function (f) {
      var id = "f" + (++uid);
      var attrs = { id: id, name: f.name, placeholder: f.placeholder, "aria-describedby": id + "-err" };
      var input, wrap;
      var err = h("p", { class: "field-error", id: id + "-err" });
      var star = f.required ? h("span", { class: "req", title: "필수" }, " *") : null;

      if (f.type === "checkbox") {
        attrs.type = "checkbox";
        input = h("input", attrs);
        wrap = h("div", { class: "field field-check" }, [h("label", { for: id }, [input, h("span", {}, [f.label, star])]), err]);
      } else {
        if (f.type === "select") {
          var blank = h("option", {}, f.placeholder || "선택해 주세요");
          blank.value = "";
          input = h("select", attrs, [blank].concat(f.options.map(function (o) {
            var opt = typeof o === "string" ? { value: o, label: o } : o;
            return h("option", { value: opt.value }, opt.label);
          })));
        } else if (f.type === "textarea") {
          attrs.rows = 4;
          input = h("textarea", attrs);
        } else {
          attrs.type = f.type || "text";
          attrs.accept = f.accept;
          attrs.autocomplete = f.type === "password" ? "off" : "";
          input = h("input", attrs);
        }
        wrap = h("div", { class: "field" + (f.wide || f.type === "textarea" || f.type === "file" ? " wide" : "") }, [
          h("label", { for: id }, [f.label, star]),
          input,
          f.hint ? h("p", { class: "field-hint" }, f.hint) : null,
          err,
        ]);
      }
      var field = { cfg: f, input: input, wrap: wrap, err: err };
      input.addEventListener(f.type === "checkbox" || f.type === "select" || f.type === "file" ? "change" : "input", function () {
        if (wrap.classList.contains("invalid")) setError(field, check(field));
      });
      return field;
    });

    function value(field) {
      var t = field.cfg.type;
      if (t === "checkbox") return field.input.checked;
      if (t === "file") return field.input.files[0] || null;
      return field.input.value.trim();
    }
    function check(field) {
      var f = field.cfg, v = value(field), quoted = "'" + f.label + "'";
      if (f.type === "checkbox") return f.required && !v ? "동의가 필요합니다." : "";
      if (f.type === "file") {
        if (!v) return f.required ? "파일을 선택해 주세요." : "";
        if (f.maxMB && v.size > f.maxMB * 1024 * 1024) return "파일이 너무 큽니다. " + f.maxMB + "MB 이하만 제출할 수 있습니다.";
        if (f.accept) {
          var ext = v.name.slice(v.name.lastIndexOf(".")).toLowerCase();
          if (f.accept.toLowerCase().split(",").indexOf(ext) < 0) return "제출할 수 없는 형식입니다. (" + f.accept + ")";
        }
        return "";
      }
      if (v === "") return f.required ? quoted + " 항목을 " + (f.type === "select" ? "선택" : "입력") + "해 주세요." : "";
      if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "이메일 형식을 확인해 주세요.";
      if (f.pattern && !new RegExp(f.pattern).test(v)) return f.patternMsg || quoted + " 형식을 확인해 주세요.";
      return "";
    }
    function setError(field, msg) {
      field.err.textContent = msg;
      field.wrap.classList.toggle("invalid", !!msg);
      field.input.setAttribute("aria-invalid", String(!!msg));
    }
    function showAlert(bad) {
      alertBox.hidden = !bad.length;
      if (!bad.length) return;
      alertBox.textContent = "빠지거나 잘못된 항목이 있습니다: " +
        bad.map(function (b) { return b.cfg.type === "checkbox" ? "동의" : b.cfg.label; }).join(", ");
      bad[0].input.focus();
    }

    var form = h("form", { class: "form", novalidate: "novalidate" }, [
      alertBox,
      h("div", { class: "form-grid" }, fields.map(function (f) { return f.wrap; })),
      h("button", { class: "btn btn-primary", type: "submit" }, submitLabel),
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var values = {};
      var bad = fields.filter(function (field) {
        var msg = check(field);
        setError(field, msg);
        values[field.cfg.name] = value(field);
        return !!msg;
      });
      showAlert(bad);
      if (bad.length) return;
      onValid(values, {
        // 제출 뒤에 특정 항목을 오류로 표시(예: 수강 코드 불일치)
        fail: function (name, msg) {
          var field = fields.filter(function (x) { return x.cfg.name === name; })[0];
          setError(field, msg);
          showAlert([field]);
        },
        error: function (msg) { alertBox.hidden = false; alertBox.textContent = msg; },
      });
    });
    form.setValue = function (name, v) {
      fields.forEach(function (x) {
        if (x.cfg.name !== name) return;
        if (x.cfg.type === "checkbox") x.input.checked = !!v; else x.input.value = v;
      });
    };
    return form;
  }

  function notice(text) {
    return text ? h("p", { class: "notice" }, [h("span", { "aria-hidden": "true" }, "ℹ️ "), text]) : null;
  }
  function fmtStamp(ms) { return fmtDateTime(new Date(ms)); }

  /* ── 참여하기: 설문 ── 여러 개를 둘 수 있고, '진행 중'인 설문만 화면에 보입니다. */
  var join = C.participate;
  // 예전 설정(poll 하나)은 새 형식(polls 목록)으로 바꿔 읽습니다.
  if (!join.polls) {
    join.polls = join.poll
      ? [{ id: "p1", title: join.poll.title, help: join.poll.help, options: join.poll.options, createdAt: "", open: true }] : [];
  }
  join.pollsTitle = join.pollsTitle || "설문";

  // 응답 저장 모양: { 설문 id: { 참여자: 고른 보기 번호 } }
  var oldVotes = store.get("poll", null);
  if (oldVotes && !store.get("pollVotes", null) && join.polls[0]) {
    var moved = {};
    moved[join.polls[0].id] = oldVotes;
    store.set("pollVotes", moved);
  }

  function voterId() {
    var s = store.get("session", null);
    if (s) return "s:" + s.id;
    var g = store.get("guest", null);
    if (!g) { g = "g:" + Math.random().toString(36).slice(2); store.set("guest", g); }
    return g;
  }
  function pollStats(p) {
    var votes = store.get("pollVotes", {})[p.id] || {};
    var counts = p.options.map(function () { return 0; });
    var total = 0;
    Object.keys(votes).forEach(function (k) {
      if (votes[k] >= 0 && votes[k] < counts.length) { counts[votes[k]]++; total++; }
    });
    return { counts: counts, total: total, mine: votes[voterId()] };
  }
  // 설문 하나를 막대그래프 카드로 그립니다. readOnly면 결과만 보여 줍니다.
  function pollCard(p, readOnly) {
    var st = pollStats(p);
    var top = Math.max.apply(null, st.counts.concat([0]));
    var voted = st.mine !== undefined && st.mine < p.options.length;
    return h("div", { class: "card poll" }, [
      h("h4", { class: "poll-title" }, p.title),
      p.help && !readOnly ? h("p", { class: "poll-help" }, p.help) : null,
      h("div", { class: "poll-rows" }, p.options.map(function (label, idx) {
        var pct = st.total ? Math.round((st.counts[idx] / st.total) * 100) : 0;
        var row = h(readOnly ? "div" : "button", {
          class: "poll-row" + (!readOnly && st.mine === idx ? " mine" : "") + (st.total > 0 && st.counts[idx] === top ? " top" : "") + (readOnly ? " static" : ""),
          type: readOnly ? "" : "button",
          "aria-pressed": readOnly ? "" : String(st.mine === idx),
        }, [
          h("span", { class: "poll-fill", style: "width:" + pct + "%" }),
          h("span", { class: "poll-label" }, label),
          h("span", { class: "poll-val" }, st.counts[idx] + "표 · " + pct + "%"),
        ]);
        if (!readOnly) row.addEventListener("click", function () {
          var all = store.get("pollVotes", {});
          (all[p.id] = all[p.id] || {})[voterId()] = idx;
          store.set("pollVotes", all);
          updatePoll();
        });
        return row;
      })),
      h("p", { class: "poll-total", "aria-live": "polite" }, "총 " + st.total + "표" + (voted && !readOnly ? " · 내 선택: " + p.options[st.mine] : "")),
    ]);
  }
  var pollBox = h("div", { class: "poll-box" });
  var pollAdminBox = h("div", { class: "poll-admin-box" }); // 관리자용 설문 히스토리(설문 추가 칸 바로 아래)
  function updatePoll() {
    pollBox.textContent = "";
    var open = join.polls.filter(function (p) { return p.open !== false; });
    open.forEach(function (p) {
      var card = pollCard(p);
      // 관리자 로그인 중이면 카드에 숨기기·수정 버튼이 붙습니다(admin.js).
      if (window.KU && window.KU.onPollCard) window.KU.onPollCard(card, p);
      pollBox.appendChild(card);
    });
    if (!open.length) pollBox.appendChild(h("p", { class: "cal-empty" }, "진행 중인 설문이 없습니다."));
    // 관리자 로그인 중이면 '설문 추가' 칸과 히스토리 표가 붙습니다(admin.js).
    if (window.KU && window.KU.onPollsRender) window.KU.onPollsRender(pollBox, pollAdminBox);
  }
  // 다른 탭에서 투표해도 바로 반영
  window.addEventListener("storage", function (e) { if (e.key === "kucourse:pollVotes") updatePoll(); });

  /* ── 참여하기: 수강 신청서 ── */
  var apply = join.apply;
  var applyBox = h("div", { class: "card", id: "apply-box" });
  function renderApply() {
    applyBox.textContent = "";
    var saved = store.get("application", null);
    if (saved) {
      var again = h("button", { class: "btn btn-ghost btn-sm", type: "button" }, "다시 작성하기");
      again.addEventListener("click", function () { store.set("application", null); renderApply(); });
      applyBox.appendChild(h("div", { class: "done", role: "status" }, [
        h("div", { class: "done-icon", "aria-hidden": "true" }, "✓"),
        h("h4", {}, apply.successTitle),
        h("p", {}, apply.successText),
        h("p", { class: "done-meta" }, saved.name + " (" + saved.studentId + ") · " + fmtStamp(saved.at)),
        again,
      ]));
      return;
    }
    applyBox.appendChild(makeForm(apply.fields, apply.submitLabel, function (values, api) {
      values.at = Date.now();
      function done() {
        store.set("application", values);
        store.set("applications", store.get("applications", []).concat([values])); // 관리자 화면의 신청 내역
        renderApply();
        applyBox.scrollIntoView({ block: "center" });
      }
      if (!apply.endpoint) return done();
      fetch(apply.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) })
        .then(function (res) { if (!res.ok) throw new Error(res.status); done(); })
        .catch(function () { api.error("전송하지 못했습니다. 잠시 뒤 다시 시도해 주세요."); });
    }));
  }

  var joinEl = section(join, [
    h("h3", { class: "sub-title reveal" }, join.pollsTitle),
    pollBox,
    pollAdminBox,
    h("h3", { class: "sub-title gap-top reveal", id: "apply" }, apply.title),
    notice(apply.notice),
    applyBox,
  ]);

  /* ── 내 강의실: 로그인 · 출석 · 과제 제출 ── */
  var room = C.classroom;
  var roomBox = h("div", { class: "room" });
  var pendingAssign = ""; // 커리큘럼의 '과제 제출하기'로 들어왔을 때 미리 고를 주차
  var assignWeeks = weeks.filter(function (w) { return w.assignment; });
  var todayWeek = classMap[dateKey(todayStart)];

  function renderRoom() {
    roomBox.textContent = "";
    var me = store.get("session", null);

    if (!me) {
      roomBox.appendChild(h("div", { class: "card login" }, [
        h("h4", {}, "🔐 수강생 로그인"),
        makeForm([
          { name: "id", label: "학번", type: "text", required: true, placeholder: "숫자 10자리", pattern: "^\\d{10}$", patternMsg: "학번은 숫자 10자리로 입력해 주세요." },
          { name: "name", label: "이름", type: "text", required: true, placeholder: "홍길동" },
          { name: "code", label: "수강 코드", type: "password", required: true, wide: true, hint: "첫 수업에서 안내받은 코드를 입력하세요." },
        ], "로그인", function (values, api) {
          var codeOk = room.accessCodeHash ? hashSecret(values.code) === room.accessCodeHash : values.code === room.accessCode;
          if (!codeOk) return api.fail("code", "수강 코드가 맞지 않습니다.");
          // 관리자가 명단을 등록했다면 명단에 있는 학번·이름만 들어올 수 있습니다.
          if (room.rosterHashes.length && room.rosterHashes.indexOf(rosterHash(values.id, values.name)) < 0) {
            return api.fail("id", "수강생 명단에 없는 학번·이름입니다.");
          }
          // 로그인 전에 한 투표는 내 학번으로 옮겨 한 사람이 두 번 투표하지 않게 합니다.
          var allVotes = store.get("pollVotes", {});
          var guest = voterId();
          Object.keys(allVotes).forEach(function (pid) {
            var votes = allVotes[pid];
            if (!(guest in votes)) return;
            if (!(("s:" + values.id) in votes)) votes["s:" + values.id] = votes[guest];
            delete votes[guest];
          });
          store.set("pollVotes", allVotes);
          store.set("session", { id: values.id, name: values.name });
          renderRoom(); updatePoll();
        }),
      ]));
      return;
    }

    var logout = h("button", { class: "btn btn-ghost btn-sm", type: "button" }, "로그아웃");
    logout.addEventListener("click", function () { store.set("session", null); renderRoom(); updatePoll(); });

    /* 출석 */
    var allAtt = store.get("attendance", {});
    var myAtt = allAtt[me.id] || {};
    function checkIn(w) {
      myAtt[w.week] = Date.now();
      allAtt[me.id] = myAtt;
      store.set("attendance", allAtt);
      renderRoom();
    }
    var attended = weeks.filter(function (w) { return myAtt[w.week]; }).length;
    var todayBtn = h("button", { class: "btn btn-primary btn-sm", type: "button" },
      todayWeek ? (myAtt[todayWeek.week] ? "오늘 출석 완료 ✓" : "오늘(" + todayWeek.week + "주차) 출석 체크") : "오늘은 수업일이 아닙니다");
    todayBtn.disabled = !todayWeek || !!myAtt[todayWeek.week];
    if (todayWeek) todayBtn.addEventListener("click", function () { checkIn(todayWeek); });

    var attCard = h("div", { class: "card" }, [
      h("h4", {}, "✅ 출석 체크"),
      h("div", { class: "att-top" }, [
        h("span", {}, [h("b", { class: "att-count" }, attended), " / " + weeks.length + "회 출석"]),
        todayBtn,
      ]),
      h("div", { class: "bar" }, [h("div", { class: "bar-fill", style: "width:" + Math.round((attended / weeks.length) * 100) + "%" })]),
      h("div", { class: "att-grid" }, weeks.map(function (w) {
        var done = !!myAtt[w.week];
        var canCheck = !done && room.testMode;
        var chip = h(canCheck ? "button" : "div", {
          class: "att-chip" + (done ? " done" : "") + (w === todayWeek ? " today" : ""),
          type: canCheck ? "button" : "",
          title: done ? "출석 " + fmtStamp(myAtt[w.week]) : fmtShort(w._date),
          "aria-label": w.week + "주차 " + fmtShort(w._date) + (done ? " 출석함" : " 미출석"),
        }, [h("b", {}, w.week + "주"), h("span", {}, done ? "✓" : (w._date.getMonth() + 1) + "/" + w._date.getDate())]);
        if (canCheck) chip.addEventListener("click", function () { checkIn(w); });
        return chip;
      })),
      room.testMode ? h("p", { class: "field-hint" }, "미리 보기 모드: 주차를 누르면 출석으로 표시됩니다.") : null,
    ]);

    /* 과제 제출 */
    var allSub = store.get("submissions", {});
    var mySub = allSub[me.id] || [];
    var subForm = makeForm([
      {
        name: "week", label: "과제 선택", type: "select", required: true, wide: true,
        options: assignWeeks.map(function (w) {
          return { value: String(w.week), label: w.week + "주차 · " + w.assignment.title + " (마감 " + fmtDateTime(w._due) + ")" };
        }),
      },
      { name: "file", label: "과제 파일", type: "file", required: true, accept: room.fileAccept, maxMB: room.fileMaxMB, hint: room.fileAccept + " · 최대 " + room.fileMaxMB + "MB" },
      { name: "memo", label: "메모", type: "textarea", required: false, placeholder: "교수자에게 남길 말(선택)" },
    ], "과제 제출하기", function (values) {
      var w = weeks.filter(function (x) { return String(x.week) === values.week; })[0];
      var at = Date.now();
      mySub.unshift({ week: w.week, title: w.assignment.title, file: values.file.name, size: values.file.size, memo: values.memo, at: at, late: at > w._due.getTime() });
      allSub[me.id] = mySub;
      store.set("submissions", allSub);
      renderRoom();
    });
    if (pendingAssign) { subForm.setValue("week", pendingAssign); pendingAssign = ""; }

    var subCard = h("div", { class: "card" }, [
      h("h4", {}, "📤 과제 제출"),
      subForm,
      h("h4", { class: "sub-list-title" }, "제출 내역"),
      mySub.length ? h("ul", { class: "sub-list" }, mySub.map(function (s) {
        return h("li", {}, [
          h("div", {}, [
            h("b", {}, s.week + "주차 · " + s.title),
            h("span", { class: "tag" + (s.late ? "" : " tag-assign") }, s.late ? "지각 제출" : "제출 완료"),
          ]),
          h("div", { class: "sub-meta" }, "📎 " + s.file + " (" + (s.size / 1024 / 1024).toFixed(2) + "MB) · " + fmtStamp(s.at)),
        ]);
      })) : h("p", { class: "cal-empty" }, "아직 제출한 과제가 없습니다."),
    ]);

    roomBox.appendChild(h("div", { class: "card room-bar" }, [
      h("div", {}, [h("b", {}, me.name + "님"), h("span", { class: "sub-meta" }, " · 학번 " + me.id)]),
      logout,
    ]));
    roomBox.appendChild(h("div", { class: "grid grid-2 room-grid" }, [attCard, subCard]));
  }

  var roomEl = section(room, [notice(room.notice), roomBox]);

  // 커리큘럼의 '과제 제출하기' → 내 강의실에서 해당 과제를 미리 선택
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[data-assign]") : null;
    if (!a || a.getAttribute("href") !== "#" + room.id) return;
    pendingAssign = a.getAttribute("data-assign");
    renderRoom();
  });

  /* ── 공지사항 ── 자주 묻는 질문 아래. 카드를 누르면 내용이 펼쳐집니다. */
  var noticeCfg = C.notices;
  noticeCfg.id = noticeCfg.id || "notices";
  noticeCfg.eyebrow = noticeCfg.eyebrow || "Notice";
  noticeCfg.items = noticeCfg.items || [];
  var noticeBox = h("div", { class: "faq-list notice-list" });
  var noticeDrawn = false;
  // 관리자가 공지를 추가·수정·삭제하면 다시 불립니다.
  function renderNotices() {
    noticeBox.textContent = "";
    // 중요 공지가 먼저, 그다음 최근 날짜순. idx는 설정 안에서의 원래 순서(수정·삭제에 씀)
    var list = noticeCfg.items.map(function (n, idx) { return { n: n, idx: idx }; }).sort(function (x, y) {
      return ((y.n.pinned ? 1 : 0) - (x.n.pinned ? 1 : 0)) || String(y.n.date || "").localeCompare(String(x.n.date || "")) || y.idx - x.idx;
    });
    list.forEach(function (it) {
      var n = it.n;
      var summary = h("summary", {}, [
        h("span", { class: "notice-sum" }, [
          n.pinned ? h("span", { class: "tag" }, "중요") : null,
          h("span", { class: "notice-title" }, n.title),
        ]),
        n.date ? h("span", { class: "notice-date" }, n.date) : null,
      ]);
      // 관리자 로그인 중이면 카드에 수정·삭제 버튼이 붙습니다(admin.js).
      if (window.KU && window.KU.onNoticeCard) window.KU.onNoticeCard(summary, it.idx);
      noticeBox.appendChild(h("details", { class: "card faq-item notice-item reveal" + (noticeDrawn ? " in" : "") }, [
        summary,
        h("div", { class: "faq-answer notice-text" }, n.text || "내용이 없습니다."),
      ]));
    });
    // 관리자 로그인 중이면 맨 끝에 '공지 추가' 칸이 붙습니다(admin.js).
    var extra = window.KU && window.KU.onNoticeList && window.KU.onNoticeList(noticeBox);
    if (!list.length && !extra) noticeBox.appendChild(h("p", { class: "cal-empty folio-empty" }, "등록된 공지가 없습니다."));
    noticeDrawn = true;
  }
  renderNotices();
  var noticeEl = section(noticeCfg, [noticeBox]);

  var main = document.getElementById("main");
  [heroEl, statsEl, aboutEl, curEl, folioEl, guideEl, joinEl, roomEl, faqEl, noticeEl].forEach(function (el) { if (el) main.appendChild(el); });
  updatePoll();
  renderApply();
  renderRoom();

  /* ── 푸터: 교수자 사진·소개·연락처 ── */
  var ins = C.instructor;
  var footer = document.getElementById("footer");
  footer.appendChild(h("div", { class: "container", id: ins.id }, [
    sectionHead(ins),
    h("div", { class: "card instructor reveal" }, [
      h("div", { class: "avatar" }, ins.photo
        ? h("img", { src: ins.photo, alt: ins.name + " 사진" })
        : ins.name.charAt(0)),
      h("div", {}, [
        h("div", { class: "instructor-head" }, [
          h("h3", { class: "instructor-name" }, [ins.name, ins.nameSub ? h("span", { class: "instructor-name-sub" }, ins.nameSub) : null]),
          h("p", { class: "instructor-role" }, ins.role),
          ins.roleSub ? h("p", { class: "instructor-role-sub" }, ins.roleSub) : null,
        ]),
        ins.bio.length ? h("div", { class: "instructor-bio" }, ins.bio.map(function (p) { return h("p", {}, p); })) : null,
        ins.career.length ? h("ul", { class: "career" }, ins.career.map(function (c) { return h("li", {}, c); })) : null,
        ins.works && ins.works.length ? h("div", { class: "works" }, [
          h("h4", {}, "📚 " + ins.worksTitle),
          h("ul", { class: "works-list" }, ins.works.map(function (wk) {
            return h("li", {}, [
              h("a", { href: wk.href, target: "_blank", rel: "noopener" }, [wk.title, h("span", { "aria-hidden": "true" }, " ↗")]),
            ]);
          })),
        ]) : null,
        h("div", { class: "contacts" }, ins.contacts.map(function (c) {
          var external = /^https?:/.test(c.href || "");
          return h(c.href ? "a" : "span", { class: "contact", href: c.href, target: external ? "_blank" : "", rel: external ? "noopener" : "" }, [
            h("span", { "aria-hidden": "true" }, c.icon), h("b", {}, c.label), c.value,
          ]);
        })),
      ]),
    ]),
    h("div", { class: "footer-bottom" }, [
      h("div", {}, C.footer.copyright),
      h("div", { class: "footer-links" }, (C.footer.links || []).map(function (l) {
        return h("span", {}, [
          l.icon + " " + l.label + ": ",
          h("a", { href: l.href, target: "_blank", rel: "noopener" }, l.text),
        ]);
      })),
    ]),
  ]));

  /* ── 동작: 달력·마감 카운트다운 ── */
  renderCalendar();
  renderDetail();
  setInterval(updateCountdowns, 30000);

  /* ── 동작: 슬라이드 ── */
  var slides = [].slice.call(track.children);
  function slideStep() {
    return slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth;
  }
  function slideMax() {
    return Math.max(0, Math.round((track.scrollWidth - track.clientWidth) / slideStep()));
  }
  function slideIndex() {
    return Math.min(slideMax(), Math.round(track.scrollLeft / slideStep()));
  }
  function slideTo(idx) {
    idx = Math.max(0, Math.min(slideMax(), idx));
    track.scrollTo({ left: idx * slideStep(), behavior: reduceMotion ? "auto" : "smooth" });
  }
  function buildDots() {
    var count = slideMax() + 1;
    if (dots.children.length !== count) {
      dots.textContent = "";
      for (var d = 0; d < count; d++) {
        (function (n) {
          var dot = h("button", { class: "slider-dot", type: "button", "aria-label": (n + 1) + "번째로 이동" });
          dot.addEventListener("click", function () { slideTo(n); });
          dots.appendChild(dot);
        })(d);
      }
    }
    updateSlider();
  }
  function updateSlider() {
    var idx = slideIndex();
    [].forEach.call(dots.children, function (dot, n) { dot.classList.toggle("active", n === idx); });
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx >= slideMax();
  }
  prevBtn.addEventListener("click", function () { slideTo(slideIndex() - 1); });
  nextBtn.addEventListener("click", function () { slideTo(slideIndex() + 1); });
  track.addEventListener("scroll", updateSlider, { passive: true });
  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); slideTo(slideIndex() + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); slideTo(slideIndex() - 1); }
  });
  window.addEventListener("resize", buildDots);
  buildDots();

  /* ── 동작: 모바일 메뉴 ── */
  var toggle = document.getElementById("navToggle");
  function setMenu(open) {
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  }
  toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
  nav.addEventListener("click", function (e) { if (e.target.tagName === "A") setMenu(false); });
  document.addEventListener("click", function (e) {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* ── 동작: 스크롤(헤더 그림자, 맨 위로 버튼, 현재 메뉴 표시) ── */
  var header = document.querySelector(".site-header");
  var toTop = document.getElementById("toTop");
  var links = [].slice.call(nav.querySelectorAll("a"));
  var sections = links.map(function (a) { return document.getElementById(a.getAttribute("data-target")); });

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle("scrolled", y > 8);
    toTop.classList.toggle("show", y > 400);

    var line = header.offsetHeight + 80;
    var current = -1;
    sections.forEach(function (s, idx) { if (s && s.getBoundingClientRect().top <= line) current = idx; });
    // 페이지 끝에 닿으면 마지막 메뉴를 활성화
    if (window.innerHeight + y >= document.documentElement.scrollHeight - 4) current = sections.length - 1;
    links.forEach(function (a, idx) { a.classList.toggle("active", idx === current); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });

  /* ── 동작: 첫 방문 폭죽 ── */
  function fireworks() {
    var canvas = h("canvas", { class: "fireworks", "aria-hidden": "true" });
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    var colors = ["#f58fb8", "#e96a9f", "#a98be6", "#7a55c7", "#ffd0e2", "#ffd76a", "#ffffff"];
    var parts = [];
    var bursts = 7, launched = 0;

    function burst() {
      var x = W * (0.15 + Math.random() * 0.7), y = H * (0.15 + Math.random() * 0.35);
      for (var n = 0; n < 70; n++) {
        var ang = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 5.5;
        var life = 55 + Math.random() * 45;
        parts.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: life, max: life,
          r: 1.5 + Math.random() * 2, c: colors[Math.floor(Math.random() * colors.length)] });
      }
      launched++;
      if (launched < bursts) setTimeout(burst, 320);
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      parts = parts.filter(function (p) { return p.life > 0; });
      parts.forEach(function (p) {
        p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.07;
        p.x += p.vx; p.y += p.vy; p.life--;
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      if (parts.length || launched < bursts) requestAnimationFrame(frame);
      else canvas.remove();
    }
    burst();
    requestAnimationFrame(frame);
  }

  // 주소 끝에 ?welcome 을 붙이면 첫 방문 효과와 팝업을 다시 볼 수 있습니다(확인용).
  var forceWelcome = /[?&]welcome\b/.test(location.search);
  var welcome = C.welcome;
  if (!store.get("visited", false) || forceWelcome) {
    store.set("visited", true);
    if (welcome.fireworks && !reduceMotion) fireworks();
    if (welcome.message) {
      var toast = h("div", { class: "toast", role: "status" }, welcome.message);
      document.body.appendChild(toast);
      setTimeout(function () { toast.classList.add("show"); }, 100);
      setTimeout(function () { toast.classList.remove("show"); }, 4200);
      setTimeout(function () { toast.remove(); }, 4800);
    }
  }

  /* ── 동작: 안내 팝업 ── 여러 개를 둘 수 있고, '사용' 중인 팝업이 차례로 뜹니다. */
  var popupSet = C.popup = C.popup || {};
  // 예전 설정(팝업 하나)은 새 형식(popups 목록)으로 바꿔 읽습니다.
  if (!C.popups) {
    C.popups = popupSet.title ? [{
      id: "pop1", enabled: popupSet.enabled !== false, badge: popupSet.badge, title: popupSet.title,
      text: popupSet.text, buttonLabel: popupSet.buttonLabel, buttonHref: popupSet.buttonHref,
    }] : [];
  }
  if (popupSet.delaySeconds === undefined) popupSet.delaySeconds = 2;
  popupSet.hideTodayLabel = popupSet.hideTodayLabel || "오늘 하루 보지 않기";

  // preview면 미리 보기(숨김 기록을 남기지 않음), onClosed는 닫힌 뒤 할 일
  function showPopup(p, preview, onClosed) {
    var lastFocus = document.activeElement;
    var go = p.buttonLabel ? h("a", { class: "btn btn-primary", href: p.buttonHref || "#" }, p.buttonLabel) : null;
    var hideToday = h("button", { class: "modal-link", type: "button" }, popupSet.hideTodayLabel);
    var closeBtn = h("button", { class: "modal-close", type: "button", "aria-label": "닫기" }, "×");
    var later = h("button", { class: "modal-link", type: "button" }, "닫기");
    var modal = h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "popup-title" }, [
      closeBtn,
      logoMark("modal-emoji"),
      p.badge ? h("span", { class: "eyebrow" }, p.badge) : null,
      h("h2", { id: "popup-title" }, p.title),
      p.text ? h("p", { class: "popup-text" }, p.text) : null,
      go,
      h("div", { class: "modal-foot" }, [hideToday, later]),
    ]);
    var backdrop = h("div", { class: "modal-backdrop" }, [modal]);
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      backdrop.classList.remove("show");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () { backdrop.remove(); if (onClosed) onClosed(); }, 250);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") close();
      if (e.key !== "Tab") return;
      // 팝업 안에서만 초점이 돌도록
      var items = backdrop.querySelectorAll("a, button");
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    closeBtn.addEventListener("click", close);
    later.addEventListener("click", close);
    if (go) go.addEventListener("click", close);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) close(); });
    hideToday.addEventListener("click", function () {
      if (!preview) {
        var n = new Date();
        var hidden = store.get("popupHide", {});
        hidden[p.id] = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime(); // 오늘 자정까지
        store.set("popupHide", hidden);
      }
      close();
    });
    // 관리자 로그인 중이면 팝업 안에 수정·삭제 버튼이 붙습니다(admin.js).
    if (window.KU && window.KU.onPopup) window.KU.onPopup(modal, p, close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add("show"); (go || later).focus(); });
  }
  // 접속 뒤 잠시 있다가, 사용 중이고 오늘 숨기지 않은 팝업을 하나씩 차례로 띄웁니다.
  setTimeout(function () {
    var hidden = store.get("popupHide", {});
    var allHidden = Date.now() < store.get("popupHideUntil", 0); // 예전 방식의 숨김 기록
    var queue = C.popups.filter(function (p) {
      return p.enabled !== false && (forceWelcome || (!allHidden && !(Date.now() < (hidden[p.id] || 0))));
    });
    (function next() {
      var p = queue.shift();
      if (p) showPopup(p, false, function () { setTimeout(next, 200); });
    })();
  }, popupSet.delaySeconds * 1000);

  /* ── 관리자 모드(admin.js)와 함께 쓰는 것들 ── */
  window.KU = {
    h: h, store: store, makeForm: makeForm, config: C, baseStamp: baseStamp, usingOverride: usingOverride,
    hashSecret: hashSecret, rosterHash: rosterHash, sha256: sha256, weeks: weeks,
    fmtDateTime: fmtDateTime, fmtShort: fmtShort, driveId: driveId,
    // 공지를 바꾼 뒤 새로고침 없이 다시 그립니다.
    notices: {
      refresh: function (items) {
        if (items) noticeCfg.items = items;
        renderNotices();
      },
    },
    // 팝업 미리 보기
    popups: { show: function (p) { showPopup(p, true); } },
    // 설문을 바꾼 뒤 새로고침 없이 다시 그립니다. stats·card는 관리자 히스토리에서 씁니다.
    polls: {
      refresh: function (polls) {
        if (polls) join.polls = polls;
        updatePoll();
      },
      stats: pollStats,
      card: pollCard,
    },
    // 수강 안내를 바꾼 뒤 새로고침 없이 카드를 다시 그립니다.
    guide: {
      refresh: function (data) {
        if (data) ["tools", "prep", "grading", "gradingNote", "references", "referencesLead", "referencesNote"].forEach(function (k) { guide[k] = data[k]; });
        renderGuide();
      },
    },
    // 포트폴리오를 바꾼 뒤 새로고침 없이 카드를 다시 그립니다.
    portfolio: {
      refresh: function (items) {
        if (items) folio.items = items;
        renderFolio();
      },
    },
    // 달력 일정을 바꾼 뒤 새로고침 없이 달력을 다시 그립니다.
    calendar: {
      refresh: function (events) {
        if (events) { cur.events = events; buildEventMap(); }
        renderCalendar();
        renderDetail();
      },
    },
  };

  /* ── 동작: 등장 효과 + 숫자 올라가기 ── */
  function countUp(el) {
    var target = Number(el.getAttribute("data-value"));
    if (reduceMotion || !isFinite(target)) return;
    var start = null;
    function tick(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / 1200);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    }
    el.textContent = "0";
    requestAnimationFrame(tick);
  }

  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        var num = en.target.querySelector(".stat-num");
        if (num) countUp(num);
        io.unobserve(en.target);
      });
    }, { threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }
})();

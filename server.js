/* AI WEB 사이트 서버
 * - 사이트 파일(index.html, config.js, app.js, admin.js, styles.css, images/)을 내보냅니다.
 * - /api/* 로 들어온 데이터를 PostgreSQL에 저장합니다.
 *
 * 환경 변수
 *   DATABASE_URL    PostgreSQL 연결 주소 (없으면 사이트는 열리지만 저장은 각자 브라우저에만 됩니다)
 *   ADMIN_PASSWORD  (선택) 관리자 비밀번호. 넣으면 config의 비밀번호 지문 대신 이 값으로 검사합니다.
 *   SESSION_SECRET  (선택) 로그인 토큰 서명용 비밀값. 없으면 서버가 만들어 DB에 보관하므로
 *                   재배포 뒤에도 로그인이 유지됩니다.
 *   PGSSL=1         (선택) DB 연결에 SSL이 필요할 때
 */
"use strict";

const path = require("path");
const fs = require("fs");
const vm = require("vm");
const crypto = require("crypto");
const express = require("express");

const ROOT = __dirname;
const PORT = process.env.PORT || 5173;
// 로그인 토큰 서명용 비밀값. SESSION_SECRET 변수가 없으면 DB에 한 번 만들어 두고 계속 씁니다.
// (서버가 다시 켜지거나 새로 배포되어도 로그인이 유지되도록)
let SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const DAY = 86400000;

/* ── DB ── */
let pool = null;

async function initDb() {
  if (process.env.USE_PGMEM || process.argv.includes("--mem")) {
    // 내 컴퓨터에서 시험할 때만 쓰는 메모리 DB
    const { newDb } = require("pg-mem");
    const mem = newDb();
    pool = new (mem.adapters.createPg().Pool)();
  } else if (process.env.DATABASE_URL) {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === "1" ? { rejectUnauthorized: false } : undefined,
    });
  } else {
    console.warn("DATABASE_URL이 없어 DB 저장 없이 실행합니다.");
    return;
  }
  const tables = [
    // 관리자가 고친 사이트 내용(공지·설문·일정·포트폴리오·팝업 등)을 통째로 보관
    "CREATE TABLE IF NOT EXISTS site_kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at BIGINT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS poll_votes (poll_id TEXT NOT NULL, voter TEXT NOT NULL, choice INTEGER NOT NULL, updated_at BIGINT NOT NULL, PRIMARY KEY (poll_id, voter))",
    "CREATE TABLE IF NOT EXISTS applications (id SERIAL PRIMARY KEY, data TEXT NOT NULL, created_at BIGINT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS attendance (student_id TEXT NOT NULL, week INTEGER NOT NULL, name TEXT NOT NULL, at BIGINT NOT NULL, PRIMARY KEY (student_id, week))",
    "CREATE TABLE IF NOT EXISTS submissions (id SERIAL PRIMARY KEY, student_id TEXT NOT NULL, name TEXT NOT NULL, week INTEGER NOT NULL, title TEXT NOT NULL, file_name TEXT NOT NULL, size INTEGER NOT NULL, memo TEXT NOT NULL, late BOOLEAN NOT NULL, at BIGINT NOT NULL)",
  ];
  tables.push(
    // 수강생 명단: 수강 신청서를 내면 자동으로 들어가고, 관리자가 직접 넣을 수도 있습니다.
    "CREATE TABLE IF NOT EXISTS roster (student_id TEXT PRIMARY KEY, name TEXT NOT NULL, department TEXT NOT NULL, grade TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, source TEXT NOT NULL, created_at BIGINT NOT NULL, approved BOOLEAN NOT NULL DEFAULT FALSE)"
  );
  for (const sql of tables) await pool.query(sql);
  // 과제를 구글 드라이브 공유 주소로 내기 전에 만든 제출 표에는 주소 열을 덧붙입니다(이미 있으면 그대로)
  try { await pool.query("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS drive_url TEXT NOT NULL DEFAULT ''"); } catch (e) { console.warn("drive_url 열 추가 건너뜀:", e.message); }
  // 승인 기능이 생기기 전에 만든 명단 표에는 승인 열을 덧붙입니다(이미 있으면 그대로).
  try { await pool.query("ALTER TABLE roster ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE"); } catch (e) { /* 이미 있음 */ }

  // 명단 기능이 생기기 전에 들어온 신청서를 한 번만 명단으로 옮깁니다.
  if (!process.env.SESSION_SECRET) {
    // 여러 서버가 동시에 켜져도 같은 값을 쓰도록: 없을 때만 넣고, 저장된 값을 다시 읽어 옵니다.
    await pool.query("INSERT INTO site_kv (key, value, updated_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING", ["session_secret", SECRET, Date.now()]);
    const kept = await pool.query("SELECT value FROM site_kv WHERE key = $1", ["session_secret"]);
    if (kept.rows.length) SECRET = kept.rows[0].value;
  }
  const done = await pool.query("SELECT value FROM site_kv WHERE key = $1", ["roster_backfilled"]);
  if (!done.rows.length) {
    const apps = await pool.query("SELECT data, created_at FROM applications ORDER BY created_at");
    for (const row of apps.rows) {
      try { await enroll(JSON.parse(row.data), "apply", Number(row.created_at)); } catch (e) { /* 형식이 맞지 않는 신청서는 건너뜀 */ }
    }
    await pool.query("INSERT INTO site_kv (key, value, updated_at) VALUES ($1, $2, $3)", ["roster_backfilled", "1", Date.now()]);
  }
}

// 수강생 명단에 넣기(이미 있으면 정보만 고침). 학번·이름이 맞지 않으면 false
async function enroll(d, source, at) {
  const id = str(d.studentId || d.id, 20).trim(), name = str(d.name, 40).trim();
  if (!/^\d{10}$/.test(id) || !name) return false;
  await pool.query(
    "INSERT INTO roster (student_id, name, department, grade, email, phone, source, created_at, approved) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) " +
    "ON CONFLICT (student_id) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department, grade = EXCLUDED.grade, email = EXCLUDED.email, phone = EXCLUDED.phone",
    [id, name, str(d.department, 60), str(d.grade, 20), str(d.email, 120), str(d.phone, 30), source, at || Date.now(), source === "admin"]);
  return true;
}

/* ── 설정 ── */
// config.js는 브라우저용 파일이라, 가짜 window를 만들어 읽어 옵니다.
function loadBaseConfig() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "config.js"), "utf8"), sandbox);
  return sandbox.window.SITE_CONFIG;
}
const BASE_CONFIG = loadBaseConfig();
// 사이트 버전: package.json의 version이 기준입니다. (제목 옆에 표시)
const VERSION = "v" + require("./package.json").version;

async function getOverride() {
  const r = await pool.query("SELECT value FROM site_kv WHERE key = $1", ["config"]);
  return r.rows.length ? JSON.parse(r.rows[0].value) : null;
}
async function effectiveConfig() {
  return (pool && (await getOverride())) || BASE_CONFIG;
}

/* ── 승인과 공개 범위 ──
 * '주차별 학습'의 내용(학습 내용·강의 자료·참고 영상·과제 설명)은 관리자와 승인된 수강생에게만 보냅니다.
 * 그 밖의 방문자에게는 주차 제목과 날짜만 남긴 설정을 보냅니다. */
function publicConfig(cfg) {
  const out = JSON.parse(JSON.stringify(cfg));
  if (out.curriculum && Array.isArray(out.curriculum.weeks)) {
    out.curriculum.weeks = out.curriculum.weeks.map(function (w) {
      const slim = { week: w.week, title: w.title, tag: w.tag, locked: true };
      ["date", "time", "location"].forEach(function (k) { if (w[k]) slim[k] = w[k]; });
      if (w.assignment) slim.assignment = { title: w.assignment.title, due: w.assignment.due };
      return slim;
    });
  }
  return out;
}
// 승인된 수강생인지: 명단에 있고 승인됨. (예전 방식의 명단 지문에 있는 사람도 승인된 것으로 봅니다.)
async function isApproved(id, name, cfg) {
  const r = await pool.query("SELECT name, approved FROM roster WHERE student_id = $1", [id]);
  if (r.rows.length && r.rows[0].name === name) return !!r.rows[0].approved;
  const hashes = (cfg.classroom && cfg.classroom.rosterHashes) || [];
  return hashes.indexOf(rosterHash(id, name)) >= 0;
}
// 요청을 보낸 사람이 누구인지
async function whoIs(req, cfg) {
  const t = bearer(req);
  if (t && t.role === "admin") return { role: "admin", full: true, approved: true };
  if (t && t.role === "student") {
    const approved = await isApproved(t.id, t.name, cfg);
    return { role: "student", full: approved, approved: approved };
  }
  return { role: null, full: false, approved: false };
}

/* ── 도우미 ── */
function sha256(s) { return crypto.createHash("sha256").update(s, "utf8").digest("hex"); }
function hashSecret(s) { return sha256("kucourse|" + s); }
function rosterHash(id, name) { return sha256("kucourse|roster|" + id + "|" + name); }
function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function str(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max); }

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return body + "." + crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
}
function verify(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const mac = crypto.createHmac("sha256", SECRET).update(parts[0]).digest("base64url");
  if (!same(mac, parts[1])) return null;
  try {
    const p = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return p.exp > Date.now() ? p : null;
  } catch (e) { return null; }
}
function bearer(req) { return verify((req.headers.authorization || "").replace(/^Bearer\s+/i, "")); }

// 한국 시간 기준 오늘 날짜 "YYYY-MM-DD"
function todayKst() { return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); }
function normDate(s) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s || "");
  return m ? m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0") : "";
}
// 주차의 수업 날짜(따로 지정했으면 그 날짜, 아니면 첫 수업일 + 7일씩)
function weekDate(cfg, idx) {
  const w = cfg.curriculum.weeks[idx];
  if (normDate(w.date)) return normDate(w.date);
  const first = normDate(cfg.curriculum.schedule.firstClass);
  if (!first) return "";
  return new Date(Date.parse(first + "T00:00:00Z") + idx * 7 * DAY).toISOString().slice(0, 10);
}
// "2026-10-20T23:59"(한국 시간) → 시각(ms)
function dueMs(s) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T(\d{1,2}):(\d{2}))?/.exec(s || "");
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0) - 9, +(m[5] || 0)) : NaN;
}

// 로그인 시도 제한: 같은 주소에서 10분에 10번까지
const attempts = new Map();
function tooMany(req) {
  const key = req.ip + "|" + req.path;
  const now = Date.now();
  const list = (attempts.get(key) || []).filter(function (t) { return now - t < 600000; });
  list.push(now);
  attempts.set(key, list);
  return list.length > 10;
}

/* ── 앱 ── */
const app = express();
app.set("trust proxy", true);
// 사이트 내용 저장(HTML 코드 embed 포함)은 크기가 클 수 있어 한도를 넉넉히 둡니다. 그 밖의 요청은 1MB.
app.use("/api/config", express.json({ limit: "15mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(function (err, req, res, next) {
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ error: "내용이 너무 큽니다(한도 " + Math.round(err.limit / 1048576) + "MB)." + (req.path === "/api/config" ? " HTML 코드에 넣은 이미지·파일은 구글 드라이브 등에 올리고 주소로 연결해 주세요." : "") });
  }
  if (err && err.type === "entity.parse.failed") return res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
  next(err);
});

const api = express.Router();
const wrap = (fn) => (req, res) => fn(req, res).catch(function (err) {
  console.error(err);
  res.status(500).json({ error: "서버 오류가 발생했습니다." });
});
function needDb(req, res, next) {
  if (!pool) return res.status(503).json({ error: "DB가 연결되어 있지 않습니다." });
  next();
}
function needAdmin(req, res, next) {
  const t = bearer(req);
  if (!t || t.role !== "admin") return res.status(401).json({ error: "관리자 로그인이 필요합니다." });
  next();
}
function needStudent(req, res, next) {
  const t = bearer(req);
  if (!t || t.role !== "student") return res.status(401).json({ error: "로그인이 필요합니다." });
  req.student = t;
  next();
}

async function pollCounts() {
  const r = await pool.query("SELECT poll_id, choice, COUNT(*) AS n FROM poll_votes GROUP BY poll_id, choice");
  const out = {};
  r.rows.forEach(function (row) {
    (out[row.poll_id] = out[row.poll_id] || {})[row.choice] = Number(row.n);
  });
  return out;
}

// 사이트가 처음 열릴 때 한 번 읽어 가는 정보
api.get("/state", wrap(async function (req, res) {
  if (!pool) return res.json({ db: false });
  const override = await getOverride();
  const cfg = override || BASE_CONFIG;
  const who = await whoIs(req, cfg);
  res.json({
    db: true, version: VERSION, override: !!override, role: who.role, approved: who.approved, full: who.full,
    config: who.full ? cfg : publicConfig(cfg), // 승인되지 않은 사람에게는 주차 내용을 뺀 설정
    polls: await pollCounts(),
  });
}));

/* 설문 */
api.get("/polls", needDb, wrap(async function (req, res) { res.json({ polls: await pollCounts() }); }));
api.post("/poll/vote", needDb, wrap(async function (req, res) {
  const cfg = await effectiveConfig();
  const pollId = str(req.body.pollId, 60), voter = str(req.body.voter, 80), choice = Number(req.body.choice);
  const poll = ((cfg.participate && cfg.participate.polls) || []).filter(function (p) { return p.id === pollId; })[0];
  if (!poll || poll.open === false) return res.status(400).json({ error: "진행 중인 설문이 아닙니다." });
  if (!voter || !Number.isInteger(choice) || choice < 0 || choice >= poll.options.length) return res.status(400).json({ error: "잘못된 응답입니다." });
  await pool.query(
    "INSERT INTO poll_votes (poll_id, voter, choice, updated_at) VALUES ($1, $2, $3, $4) " +
    "ON CONFLICT (poll_id, voter) DO UPDATE SET choice = EXCLUDED.choice, updated_at = EXCLUDED.updated_at",
    [pollId, voter, choice, Date.now()]);
  res.json({ polls: await pollCounts() });
}));

/* 수강 신청서 */
api.post("/applications", needDb, wrap(async function (req, res) {
  const data = req.body && req.body.data;
  if (!data || typeof data !== "object") return res.status(400).json({ error: "신청서 내용이 없습니다." });
  const text = JSON.stringify(data);
  if (text.length > 20000) return res.status(400).json({ error: "내용이 너무 깁니다." });
  await pool.query("INSERT INTO applications (data, created_at) VALUES ($1, $2)", [text, Date.now()]);
  const enrolled = await enroll(data, "apply"); // 수강생 명단에 자동 등록
  res.json({ ok: true, enrolled: enrolled });
}));

/* 수강생 */
api.post("/student/login", needDb, wrap(async function (req, res) {
  if (tooMany(req)) return res.status(429).json({ error: "여러 번 시도했습니다. 잠시 뒤 다시 해 주세요." });
  const cfg = await effectiveConfig();
  const room = cfg.classroom || {};
  const id = str(req.body.id, 20).trim(), name = str(req.body.name, 40).trim(), code = str(req.body.code, 100);
  if (!/^\d{10}$/.test(id) || !name) return res.status(400).json({ error: "학번과 이름을 확인해 주세요.", field: "id" });
  const codeOk = room.accessCodeHash ? same(hashSecret(code), room.accessCodeHash) : (!!room.accessCode && same(code, room.accessCode));
  if (!codeOk) return res.status(401).json({ error: "수강 코드가 맞지 않습니다.", field: "code" });
  // 수강 신청서를 내서 명단에 있는 학번·이름만 로그인할 수 있습니다.
  const hashes = room.rosterHashes || [];
  const row = await pool.query("SELECT name FROM roster WHERE student_id = $1", [id]);
  const inTable = row.rows.length && row.rows[0].name === name;
  if (!inTable && hashes.indexOf(rosterHash(id, name)) < 0) {
    return res.status(403).json({ error: "수강생 명단에 없는 학번·이름입니다. 수강 신청서를 먼저 내 주세요.", field: "id" });
  }
  res.json({
    token: sign({ role: "student", id: id, name: name, exp: Date.now() + 30 * DAY }), id: id, name: name,
    approved: await isApproved(id, name, cfg),
  });
}));

async function myRecords(id) {
  const att = await pool.query("SELECT week, at FROM attendance WHERE student_id = $1", [id]);
  const sub = await pool.query("SELECT week, title, file_name, drive_url, size, memo, late, at FROM submissions WHERE student_id = $1 ORDER BY at DESC", [id]);
  const attendance = {};
  att.rows.forEach(function (r) { attendance[r.week] = Number(r.at); });
  return {
    attendance: attendance,
    submissions: sub.rows.map(function (r) {
      return { week: r.week, title: r.title, file: r.file_name, url: r.drive_url || "", size: r.size, memo: r.memo, late: r.late, at: Number(r.at) };
    }),
  };
}
api.get("/me", needDb, needStudent, wrap(async function (req, res) {
  const out = await myRecords(req.student.id);
  out.approved = await isApproved(req.student.id, req.student.name, await effectiveConfig());
  // 과제 제출 창에 보여 줄 내 인적사항(수강 신청서에 적은 내용)
  const me = await pool.query("SELECT department, grade, email FROM roster WHERE student_id = $1", [req.student.id]);
  if (me.rows.length) out.profile = { department: me.rows[0].department, grade: me.rows[0].grade, email: me.rows[0].email };
  res.json(out);
}));
// 출석·과제 제출은 승인된 수강생만
const needApproved = (fn) => async function (req, res) {
  if (!(await isApproved(req.student.id, req.student.name, await effectiveConfig()))) {
    return res.status(403).json({ error: "관리자 승인 후 이용할 수 있습니다." });
  }
  return fn(req, res);
};

api.post("/attendance", needDb, needStudent, wrap(needApproved(async function (req, res) {
  const cfg = await effectiveConfig();
  const week = Number(req.body.week);
  const idx = cfg.curriculum.weeks.findIndex(function (w) { return Number(w.week) === week; });
  if (idx < 0) return res.status(400).json({ error: "없는 주차입니다." });
  // 미리 보기 모드가 아니면 수업 당일에만 출석할 수 있습니다.
  if (!cfg.classroom.testMode && weekDate(cfg, idx) !== todayKst()) return res.status(400).json({ error: "수업 당일에만 출석할 수 있습니다." });
  await pool.query(
    "INSERT INTO attendance (student_id, week, name, at) VALUES ($1, $2, $3, $4) ON CONFLICT (student_id, week) DO NOTHING",
    [req.student.id, week, req.student.name, Date.now()]);
  res.json(Object.assign(await myRecords(req.student.id), { approved: true }));
})));

const DRIVE_URL = /^https:\/\/(?:drive|docs)\.google\.com\/.*?(?:\/d\/|\/folders\/|[?&]id=)[\w-]{10,}/;
api.post("/submissions", needDb, needStudent, wrap(needApproved(async function (req, res) {
  const cfg = await effectiveConfig();
  const week = Number(req.body.week);
  const w = cfg.curriculum.weeks.filter(function (x) { return Number(x.week) === week; })[0];
  if (!w || !w.assignment) return res.status(400).json({ error: "과제가 없는 주차입니다." });
  // 과제는 구글 드라이브 공유 주소로 냅니다(파일 자체는 받지 않습니다).
  const driveUrl = str(req.body.driveUrl, 500).trim();
  if (!DRIVE_URL.test(driveUrl)) return res.status(400).json({ error: "구글 드라이브 공유 주소를 입력해 주세요." });
  const fileName = "구글 드라이브 링크";
  const size = 0;
  const now = Date.now();
  const due = dueMs(w.assignment.due);
  await pool.query(
    "INSERT INTO submissions (student_id, name, week, title, file_name, size, memo, late, at, drive_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    [req.student.id, req.student.name, week, str(w.assignment.title, 200), fileName, size, str(req.body.memo, 2000), !isNaN(due) && now > due, now, driveUrl]);
  res.json(Object.assign(await myRecords(req.student.id), { approved: true }));
})));

/* 관리자 */
async function adminPasswordOk(password) {
  if (process.env.ADMIN_PASSWORD) return same(password, process.env.ADMIN_PASSWORD);
  const cfg = await effectiveConfig();
  const hash = cfg.admin && cfg.admin.passwordHash;
  return !!hash && same(hashSecret(password), hash);
}
function adminToken() { return { token: sign({ role: "admin", exp: Date.now() + 7 * DAY }), days: 7 }; }

api.post("/admin/login", needDb, wrap(async function (req, res) {
  if (tooMany(req)) return res.status(429).json({ error: "여러 번 틀렸습니다. 잠시 뒤 다시 해 주세요." });
  if (!(await adminPasswordOk(str(req.body.password, 200)))) return res.status(401).json({ error: "비밀번호가 맞지 않습니다." });
  res.json(adminToken());
}));

// 비밀번호가 아직 없을 때만: 처음 한 번 만들기
api.post("/admin/setup", needDb, wrap(async function (req, res) {
  const cfg = await effectiveConfig();
  if (process.env.ADMIN_PASSWORD || (cfg.admin && cfg.admin.passwordHash)) return res.status(409).json({ error: "이미 비밀번호가 있습니다." });
  const password = str(req.body.password, 200);
  if (password.length < 8) return res.status(400).json({ error: "8자 이상으로 입력해 주세요." });
  const next = JSON.parse(JSON.stringify(cfg));
  next.admin = { passwordHash: hashSecret(password) };
  await saveOverride(next);
  res.json(Object.assign({ passwordHash: next.admin.passwordHash }, adminToken()));
}));

async function saveOverride(config) {
  await pool.query(
    "INSERT INTO site_kv (key, value, updated_at) VALUES ($1, $2, $3) " +
    "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at",
    ["config", JSON.stringify(config), Date.now()]);
}
api.put("/config", needDb, needAdmin, wrap(async function (req, res) {
  const config = req.body && req.body.config;
  if (!config || !config.site || !config.hero || !config.curriculum || !Array.isArray(config.curriculum.weeks)) {
    return res.status(400).json({ error: "설정 내용이 올바르지 않습니다." });
  }
  if (config.curriculum.weeks.some(function (w) { return w && w.locked; })) {
    return res.status(409).json({ error: "주차 내용을 불러오지 못한 상태입니다. 새로 고친 뒤 다시 저장해 주세요." });
  }
  await saveOverride(config);
  res.json({ ok: true });
}));
// 저장된 수정본을 지우고 config.js 원본으로
api.delete("/config", needDb, needAdmin, wrap(async function (req, res) {
  await pool.query("DELETE FROM site_kv WHERE key = $1", ["config"]);
  res.json({ ok: true });
}));

api.post("/admin/poll/clear", needDb, needAdmin, wrap(async function (req, res) {
  await pool.query("DELETE FROM poll_votes WHERE poll_id = $1", [str(req.body.pollId, 60)]);
  res.json({ polls: await pollCounts() });
}));

/* 수강생 명단 */
api.get("/admin/roster", needDb, needAdmin, wrap(async function (req, res) {
  const r = await pool.query("SELECT student_id, name, department, grade, email, phone, source, created_at, approved FROM roster ORDER BY created_at, student_id");
  const att = await pool.query("SELECT student_id, COUNT(*) AS n FROM attendance GROUP BY student_id");
  const sub = await pool.query("SELECT student_id, COUNT(*) AS n FROM submissions GROUP BY student_id");
  const attN = {}, subN = {};
  att.rows.forEach(function (x) { attN[x.student_id] = Number(x.n); });
  sub.rows.forEach(function (x) { subN[x.student_id] = Number(x.n); });
  res.json({
    roster: r.rows.map(function (x) {
      return {
        id: x.student_id, name: x.name, department: x.department, grade: x.grade, email: x.email, phone: x.phone,
        source: x.source, at: Number(x.created_at), approved: !!x.approved, attendance: attN[x.student_id] || 0, submissions: subN[x.student_id] || 0,
      };
    }),
  });
}));
api.post("/admin/roster", needDb, needAdmin, wrap(async function (req, res) {
  const list = Array.isArray(req.body.students) ? req.body.students.slice(0, 1000) : [];
  let added = 0, skipped = 0;
  for (const st of list) {
    const id = str(st && st.id, 20).trim();
    const exists = /^\d{10}$/.test(id) && (await pool.query("SELECT 1 FROM roster WHERE student_id = $1", [id])).rows.length;
    if (!exists && (await enroll(st || {}, "admin"))) added++; else skipped++;
  }
  res.json({ added: added, skipped: skipped });
}));
// 승인 / 승인 취소
api.post("/admin/roster/:id/approve", needDb, needAdmin, wrap(async function (req, res) {
  await pool.query("UPDATE roster SET approved = $1 WHERE student_id = $2", [req.body.approved !== false, str(req.params.id, 20)]);
  res.json({ ok: true });
}));
api.post("/admin/roster-approve-all", needDb, needAdmin, wrap(async function (req, res) {
  await pool.query("UPDATE roster SET approved = $1", [true]);
  res.json({ ok: true });
}));
api.delete("/admin/roster/:id", needDb, needAdmin, wrap(async function (req, res) {
  await pool.query("DELETE FROM roster WHERE student_id = $1", [str(req.params.id, 20)]);
  res.json({ ok: true });
}));
api.delete("/admin/roster", needDb, needAdmin, wrap(async function (req, res) {
  await pool.query("DELETE FROM roster");
  res.json({ ok: true });
}));

api.get("/admin/records", needDb, needAdmin, wrap(async function (req, res) {
  const att = await pool.query("SELECT student_id, week, name, at FROM attendance ORDER BY student_id, week");
  const sub = await pool.query("SELECT student_id, name, week, title, file_name, drive_url, size, memo, late, at FROM submissions ORDER BY at DESC");
  const apps = await pool.query("SELECT data, created_at FROM applications ORDER BY created_at");
  res.json({
    attendance: att.rows.map(function (r) { return { id: r.student_id, name: r.name, week: r.week, at: Number(r.at) }; }),
    submissions: sub.rows.map(function (r) {
      return { id: r.student_id, name: r.name, week: r.week, title: r.title, file: r.file_name, url: r.drive_url || "", size: r.size, memo: r.memo, late: r.late, at: Number(r.at) };
    }),
    applications: apps.rows.map(function (r) { return Object.assign(JSON.parse(r.data), { at: Number(r.created_at) }); }),
  });
}));

api.use(function (req, res) { res.status(404).json({ error: "없는 주소입니다." }); });
app.use("/api", function (req, res, next) { res.set("Cache-Control", "no-store"); next(); }, api);

/* ── 사이트 파일: 정해 둔 파일만 내보냅니다(서버 코드·설정은 내보내지 않음) ── */
const PUBLIC_FILES = ["index.html", "config.js", "app.js", "admin.js", "styles.css", "AI_WEB_매뉴얼.html"];
const noCache = function (res) { res.set("Cache-Control", "no-cache"); }; // 고친 파일이 바로 보이도록 매번 확인
app.get("/", function (req, res) { noCache(res); res.sendFile(path.join(ROOT, "index.html")); });
app.get("/config.js", function (req, res, next) {
  if (!pool) return next(); // DB가 없으면(승인 기능 없음) 원본 그대로
  noCache(res);
  res.type("application/javascript; charset=utf-8")
    .send("/* 주차별 학습 내용은 승인된 수강생에게만 서버가 따로 보냅니다. */\nwindow.SITE_CONFIG = " + JSON.stringify(publicConfig(BASE_CONFIG)) + ";\n");
});
PUBLIC_FILES.forEach(function (name) {
  app.get("/" + encodeURI(name), function (req, res) { noCache(res); res.sendFile(path.join(ROOT, name)); });
});
app.use("/images", express.static(path.join(ROOT, "images"), { maxAge: "1h" }));
app.use(function (req, res) { res.status(404).type("text/plain; charset=utf-8").send("찾을 수 없는 페이지입니다."); });

if (require.main === module) {
  initDb().then(function () {
    app.listen(PORT, function () { console.log("AI WEB 서버 시작: 포트 " + PORT + (pool ? " (DB 연결됨)" : " (DB 없음)")); });
  }).catch(function (err) {
    console.error("DB 연결에 실패했습니다.", err);
    process.exit(1);
  });
}

module.exports = { app, initDb };

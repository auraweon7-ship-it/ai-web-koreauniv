/* AI WEB 사이트 서버
 * - 사이트 파일(index.html, config.js, app.js, admin.js, styles.css, images/)을 내보냅니다.
 * - /api/* 로 들어온 데이터를 PostgreSQL에 저장합니다.
 *
 * 환경 변수
 *   DATABASE_URL    PostgreSQL 연결 주소 (없으면 사이트는 열리지만 저장은 각자 브라우저에만 됩니다)
 *   ADMIN_PASSWORD  (선택) 관리자 비밀번호. 넣으면 config의 비밀번호 지문 대신 이 값으로 검사합니다.
 *   SESSION_SECRET  (선택) 로그인 토큰 서명용 비밀값. 없으면 서버가 켜질 때마다 새로 만들어
 *                   재배포 뒤 다시 로그인해야 합니다.
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
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
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
  for (const sql of tables) await pool.query(sql);
}

/* ── 설정 ── */
// config.js는 브라우저용 파일이라, 가짜 window를 만들어 읽어 옵니다.
function loadBaseConfig() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "config.js"), "utf8"), sandbox);
  return sandbox.window.SITE_CONFIG;
}
const BASE_CONFIG = loadBaseConfig();

async function getOverride() {
  const r = await pool.query("SELECT value FROM site_kv WHERE key = $1", ["config"]);
  return r.rows.length ? JSON.parse(r.rows[0].value) : null;
}
async function effectiveConfig() {
  return (pool && (await getOverride())) || BASE_CONFIG;
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
app.use(express.json({ limit: "1mb" }));

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
  res.json({ db: true, config: await getOverride(), polls: await pollCounts() });
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
  res.json({ ok: true });
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
  const roster = room.rosterHashes || [];
  if (roster.length && roster.indexOf(rosterHash(id, name)) < 0) return res.status(403).json({ error: "수강생 명단에 없는 학번·이름입니다.", field: "id" });
  res.json({ token: sign({ role: "student", id: id, name: name, exp: Date.now() + 30 * DAY }), id: id, name: name });
}));

async function myRecords(id) {
  const att = await pool.query("SELECT week, at FROM attendance WHERE student_id = $1", [id]);
  const sub = await pool.query("SELECT week, title, file_name, size, memo, late, at FROM submissions WHERE student_id = $1 ORDER BY at DESC", [id]);
  const attendance = {};
  att.rows.forEach(function (r) { attendance[r.week] = Number(r.at); });
  return {
    attendance: attendance,
    submissions: sub.rows.map(function (r) {
      return { week: r.week, title: r.title, file: r.file_name, size: r.size, memo: r.memo, late: r.late, at: Number(r.at) };
    }),
  };
}
api.get("/me", needDb, needStudent, wrap(async function (req, res) { res.json(await myRecords(req.student.id)); }));

api.post("/attendance", needDb, needStudent, wrap(async function (req, res) {
  const cfg = await effectiveConfig();
  const week = Number(req.body.week);
  const idx = cfg.curriculum.weeks.findIndex(function (w) { return Number(w.week) === week; });
  if (idx < 0) return res.status(400).json({ error: "없는 주차입니다." });
  // 미리 보기 모드가 아니면 수업 당일에만 출석할 수 있습니다.
  if (!cfg.classroom.testMode && weekDate(cfg, idx) !== todayKst()) return res.status(400).json({ error: "수업 당일에만 출석할 수 있습니다." });
  await pool.query(
    "INSERT INTO attendance (student_id, week, name, at) VALUES ($1, $2, $3, $4) ON CONFLICT (student_id, week) DO NOTHING",
    [req.student.id, week, req.student.name, Date.now()]);
  res.json(await myRecords(req.student.id));
}));

api.post("/submissions", needDb, needStudent, wrap(async function (req, res) {
  const cfg = await effectiveConfig();
  const week = Number(req.body.week);
  const w = cfg.curriculum.weeks.filter(function (x) { return Number(x.week) === week; })[0];
  if (!w || !w.assignment) return res.status(400).json({ error: "과제가 없는 주차입니다." });
  const fileName = str(req.body.fileName, 200).trim();
  const size = Math.max(0, Math.min(2147483647, Number(req.body.size) || 0));
  if (!fileName) return res.status(400).json({ error: "파일을 선택해 주세요." });
  const now = Date.now();
  const due = dueMs(w.assignment.due);
  await pool.query(
    "INSERT INTO submissions (student_id, name, week, title, file_name, size, memo, late, at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [req.student.id, req.student.name, week, str(w.assignment.title, 200), fileName, size, str(req.body.memo, 2000), !isNaN(due) && now > due, now]);
  res.json(await myRecords(req.student.id));
}));

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

api.get("/admin/records", needDb, needAdmin, wrap(async function (req, res) {
  const att = await pool.query("SELECT student_id, week, name, at FROM attendance ORDER BY student_id, week");
  const sub = await pool.query("SELECT student_id, name, week, title, file_name, size, memo, late, at FROM submissions ORDER BY at DESC");
  const apps = await pool.query("SELECT data, created_at FROM applications ORDER BY created_at");
  res.json({
    attendance: att.rows.map(function (r) { return { id: r.student_id, name: r.name, week: r.week, at: Number(r.at) }; }),
    submissions: sub.rows.map(function (r) {
      return { id: r.student_id, name: r.name, week: r.week, title: r.title, file: r.file_name, size: r.size, memo: r.memo, late: r.late, at: Number(r.at) };
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

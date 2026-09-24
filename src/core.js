// ---------- Tiện ích ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v; // chỉ dùng cho icon tĩnh
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : String(kid));
  }
  return e;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const plain = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

let toastTimer = null;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

// ---------- Ngày tháng (theo giờ máy người học) ----------
function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}
function daysBetween(a, b) {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
function prettyDate(d = new Date()) {
  return WEEKDAYS[d.getDay()] + ", " + d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
}
function inDaysText(n) {
  if (n <= 0) return "hôm nay";
  if (n === 1) return "ngày mai";
  if (n < 30) return n + " ngày nữa";
  return Math.round(n / 30) + " tháng nữa";
}

// ---------- Trạng thái & lưu trữ ----------
const LS_KEY = "vo-tu-vung:v1";
const defaults = () => ({ v: 1, updatedAt: 0, goal: 10, rate: 0.9, voice: "", auto: true, topic: TOPICS[0].id, cards: {}, days: {}, custom: [] });

function normalize(s) {
  const d = defaults();
  const out = Object.assign(d, s && typeof s === "object" ? s : {});
  if (![5, 10, 15, 20].includes(Number(out.goal))) out.goal = 10;
  out.goal = Number(out.goal);
  if (![0.7, 0.9, 1].includes(Number(out.rate))) out.rate = 0.9;
  out.rate = Number(out.rate);
  if (typeof out.cards !== "object" || !out.cards || Array.isArray(out.cards)) out.cards = {};
  if (typeof out.days !== "object" || !out.days || Array.isArray(out.days)) out.days = {};
  if (!Array.isArray(out.custom)) out.custom = [];
  out.custom = out.custom.filter((w) => w && typeof w.id === "string" && typeof w.w === "string" && w.w.trim());
  if (!TOPICS.some((t) => t.id === out.topic)) out.topic = TOPICS[0].id;
  return out;
}

function loadLocal() {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveLocal() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* chế độ ẩn danh */ }
}

let state = normalize(loadLocal());
let cloud = null;
let cloudTimer = null, cloudBusy = false, cloudAgain = false;

function setSaveStatus(msg) { const el = $("#save-status"); if (el) el.textContent = msg; }

function commit() {
  state.updatedAt = Date.now();
  pruneDays();
  saveLocal();
  if (cloud) { clearTimeout(cloudTimer); cloudTimer = setTimeout(flushCloud, 1200); }
}

async function flushCloud() {
  if (!cloud) return;
  if (cloudBusy) { cloudAgain = true; return; }
  cloudBusy = true;
  try {
    await cloud.ref.set(JSON.parse(JSON.stringify(state)));
  } catch (e) {
    const code = e && e.code;
    if (code === "unavailable" || code === "resource_exhausted") {
      cloudAgain = true;
    } else {
      cloud = null;
      setSaveStatus("Không lưu được vào tài khoản, tiến độ vẫn được lưu trên trình duyệt này.");
    }
  } finally {
    cloudBusy = false;
    if (cloudAgain && cloud) { cloudAgain = false; setTimeout(flushCloud, 2500 + Math.random() * 1500); }
  }
}

async function initCloud() {
  if (!window.claude || typeof window.claude.use !== "function") return;
  try {
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    const ref = db.doc("data/users/" + uid + "/progress");
    const snap = await ref.get();
    const remote = snap.exists ? JSON.parse(JSON.stringify(snap.data())) : null;
    cloud = { ref };
    if (remote && (remote.updatedAt || 0) > (state.updatedAt || 0)) {
      state = normalize(remote);
      saveLocal();
      buildIndex();
      renderCurrent();
    } else if (state.updatedAt > 0) {
      await flushCloud();
    }
    setSaveStatus("Tiến độ được lưu vào tài khoản claude.ai của bạn, mở trên máy khác vẫn còn.");
  } catch {
    cloud = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && cloud && cloudTimer) { clearTimeout(cloudTimer); cloudTimer = null; flushCloud(); }
});

// ---------- Kho từ ----------
let WORDS = {};
function buildIndex() {
  WORDS = {};
  for (const t of TOPICS) {
    for (const [w, p, ipa, vi, ex, exVi] of t.words) WORDS[w] = { id: w, w, p, ipa, vi, ex, exVi, topic: t.id };
  }
  for (const c of state.custom) WORDS[c.id] = { ...c, topic: "mine" };
  for (const id of Object.keys(state.cards)) if (!WORDS[id]) delete state.cards[id];
}
buildIndex();

const topicName = (id) => (id === "mine" ? "Từ của tôi" : (TOPICS.find((t) => t.id === id) || {}).name || "");
const topicWords = (id) => Object.values(WORDS).filter((w) => w.topic === id);

function status(id) {
  const c = state.cards[id];
  if (!c) return "new";
  return c.b >= 4 ? "known" : "learning";
}

function todayLog() {
  const k = dayKey();
  if (!state.days[k]) state.days[k] = { n: 0, r: 0, q: 0, s: 0 };
  return state.days[k];
}
function pruneDays() {
  const keys = Object.keys(state.days).sort();
  while (keys.length > 400) delete state.days[keys.shift()];
}
function streak() {
  const active = (k) => { const d = state.days[k]; return d && (d.n + d.r + d.q + d.s) > 0; };
  let k = dayKey();
  if (!active(k)) k = addDays(k, -1);
  let n = 0;
  while (active(k)) { n++; k = addDays(k, -1); }
  return n;
}
function dueIds() {
  const today = dayKey();
  return Object.entries(state.cards)
    .filter(([id, c]) => WORDS[id] && c.d <= today)
    .sort((a, b) => (a[1].d < b[1].d ? -1 : a[1].d > b[1].d ? 1 : a[1].b - b[1].b))
    .map(([id]) => id);
}
function counts() {
  let learning = 0, known = 0;
  for (const id of Object.keys(state.cards)) status(id) === "known" ? known++ : learning++;
  return { learning, known, due: dueIds().length };
}

// ---------- Lặp lại ngắt quãng (hộp Leitner) ----------
const INTERVALS = [0, 1, 3, 7, 14, 30, 60]; // số ngày chờ theo hộp 1..6

function nextSchedule(card, grade, lapsed) {
  let b = card ? card.b : 1;
  let wait;
  if (grade === "again") { b = 1; wait = 1; }
  else if (grade === "hard") { b = Math.max(1, b); wait = Math.max(1, Math.round(INTERVALS[b] / 2)); }
  else if (grade === "good") { b = lapsed ? 1 : Math.min(6, b + 1); wait = INTERVALS[b]; }
  else { b = lapsed ? 2 : Math.min(6, b + 2); wait = INTERVALS[b]; }
  return { b, wait };
}

function applyGrade(id, grade, lapsed) {
  const c = state.cards[id] || { b: 1, n: 0, l: 0, a: dayKey() };
  const { b, wait } = nextSchedule(c, grade, lapsed);
  c.b = b;
  c.d = addDays(dayKey(), wait);
  c.n = (c.n || 0) + 1;
  if (grade === "again") c.l = (c.l || 0) + 1;
  state.cards[id] = c;
}

function addCard(id, known) {
  const today = dayKey();
  state.cards[id] = known
    ? { b: 4, d: addDays(today, INTERVALS[4]), n: 0, l: 0, a: today }
    : { b: 1, d: addDays(today, 1), n: 0, l: 0, a: today };
}

// ---------- Phát âm ----------
const speech = { ok: "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined", voices: [] };
const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';

function loadVoices() {
  if (!speech.ok) return;
  try { speech.voices = speechSynthesis.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang)); } catch { speech.voices = []; }
  const sel = $("#set-voice");
  if (!sel) return;
  sel.replaceChildren(h("option", { value: "" , text: "Mặc định của máy" }));
  for (const v of speech.voices) sel.append(h("option", { value: v.voiceURI, text: v.name + " (" + v.lang + ")" }));
  sel.value = speech.voices.some((v) => v.voiceURI === state.voice) ? state.voice : "";
}
function defaultVoice() {
  const vs = speech.voices;
  return vs.find((v) => /en[-_]US/i.test(v.lang) && /google|samantha|aria|jenny/i.test(v.name))
    || vs.find((v) => /en[-_]US/i.test(v.lang)) || vs[0] || null;
}
function speak(text, slow) {
  if (!speech.ok || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = speech.voices.find((x) => x.voiceURI === state.voice) || defaultVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-US";
    u.rate = state.rate * (slow ? 0.8 : 1);
    speechSynthesis.speak(u);
  } catch { /* trình duyệt không hỗ trợ */ }
}
function speakBtn(text, label) {
  if (!speech.ok) return null;
  return h("button", { class: "icon-btn", type: "button", "aria-label": label || "Nghe phát âm", title: "Nghe", html: SPEAKER, onclick: (e) => { e.stopPropagation(); speak(text); } });
}

// Thẻ từ kiểu trang vở ô ly
function wordSheet(word, opts = {}) {
  const { reveal = true, meta = "", onReveal } = opts;
  const sheet = h("article", { class: "sheet stack pop" },
    h("div", { class: "sheet-meta" }, h("span", { text: topicName(word.topic) }), h("span", { text: meta })),
    h("div", { class: "headword en" + (word.w.length > 16 ? " long" : ""), lang: "en", text: word.w }),
    h("div", { class: "pron" },
      word.ipa ? h("span", { class: "ipa", lang: "en", text: "/" + word.ipa + "/" }) : null,
      h("span", { class: "pos", text: POS_VI[word.p] || word.p }),
      speakBtn(word.w, "Nghe từ " + word.w)));
  if (reveal) {
    sheet.append(h("div", { class: "meaning", text: word.vi }));
    if (word.ex) {
      sheet.append(h("div", { class: "example" },
        h("div", { class: "row", style: "flex-wrap:nowrap;align-items:flex-start;justify-content:space-between" },
          h("span", { class: "en", lang: "en", text: word.ex.replace(/ (B:)/, "\n$1") }), speakBtn(word.ex, "Nghe câu ví dụ")),
        word.exVi ? h("span", { class: "vi", text: word.exVi.replace(/ (B:)/, "\n$1") }) : null));
    }
  } else {
    sheet.append(h("button", { class: "hidden-side", type: "button", onclick: onReveal, text: "Nhớ nghĩa của từ này chưa? Chạm để lật thẻ" }));
  }
  return sheet;
}

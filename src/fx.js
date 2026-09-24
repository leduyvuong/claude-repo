// ---------- Hiệu ứng: âm thanh, pháo giấy, rung ----------
let audioCtx = null;
function tone(freq, dur, when = 0, type = "sine", vol = 0.08) {
  if (!state.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime + when;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  } catch { /* không có âm thanh */ }
}
const sfx = {
  good(combo = 1) { const b = 520 + Math.min(combo, 8) * 40; tone(b, 0.12); tone(b * 1.5, 0.16, 0.08); },
  bad() { tone(180, 0.22, 0, "triangle", 0.1); },
  flip() { tone(760, 0.05, 0, "square", 0.03); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, i * 0.1)); },
  tick() { tone(1200, 0.03, 0, "square", 0.02); },
};
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* bỏ qua */ } }

function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = h("canvas", { class: "confetti", "aria-hidden": "true" });
  document.body.append(c);
  const ctx = c.getContext("2d");
  const W = (c.width = innerWidth), H = (c.height = innerHeight);
  const colors = ["#5b3cc4", "#d2455e", "#1e8757", "#e9b04d", "#3b82f6", "#ec4899"];
  const parts = Array.from({ length: 140 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    r: Math.random() * 6 + 3, c: colors[(Math.random() * colors.length) | 0], a: Math.random() * 6, s: (Math.random() - 0.5) * 0.3,
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.s;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
    }
    if (t - t0 < 2200) requestAnimationFrame(frame); else c.remove();
  })(t0);
}

function floatText(target, text, cls = "") {
  const r = target.getBoundingClientRect();
  const f = h("div", { class: "float-pts " + cls, text, style: "left:" + (r.left + r.width / 2) + "px;top:" + (r.top + window.scrollY) + "px" });
  document.body.append(f);
  setTimeout(() => f.remove(), 900);
}
function shake(el) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }

// ---------- Điểm kinh nghiệm & cấp độ ----------
function levelInfo(xp = state.xp) {
  let level = 1, need = 100, rest = xp;
  while (rest >= need) { rest -= need; level++; need = 100 + (level - 1) * 50; }
  return { level, into: rest, need };
}
const RANKS = ["Mầm non", "Tập sự", "Chăm chỉ", "Tiến bộ", "Vững vàng", "Tự tin", "Lưu loát", "Cao thủ", "Bậc thầy", "Huyền thoại"];
const rankName = (lv) => RANKS[Math.min(RANKS.length - 1, Math.floor((lv - 1) / 3))];

function gainXP(n) {
  if (!n) return;
  const before = levelInfo().level;
  state.xp += n;
  const after = levelInfo().level;
  if (after > before) setTimeout(() => { toast("Lên cấp " + after + "! Danh hiệu: " + rankName(after)); sfx.win(); confetti(); }, 300);
}

// Cộng XP cho các hoạt động sẵn có
{
  const _applyGrade = applyGrade;
  applyGrade = function (id, grade, lapsed) { _applyGrade(id, grade, lapsed); gainXP(grade === "again" ? 1 : 4); };
  const _addCard = addCard;
  addCard = function (id, known) { _addCard(id, known); gainXP(known ? 2 : 6); };
  const _finish = finishQuestion;
  finishQuestion = function (ok, w) { _finish(ok, w); if (ok) { gainXP(5); sfx.good(); } else { sfx.bad(); buzz(60); } };
}

// ---------- Trang Hôm nay: thẻ cấp độ & nhiệm vụ ----------
{
  const _today = RENDER.today;
  RENDER.today = () => {
    _today();
    const L = levelInfo();
    const pct = L.into / L.need;
    const R = 34, C = 2 * Math.PI * R;
    $("#hero").innerHTML = "";
    $("#hero").append(
      h("div", { class: "ring", html:
        '<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="' + R + '" class="ring-bg"/><circle cx="40" cy="40" r="' + R +
        '" class="ring-fg" stroke-dasharray="' + C + '" stroke-dashoffset="' + C * (1 - pct) + '"/></svg>' },
        h("div", { class: "ring-num" }, h("b", { text: L.level }), h("span", { text: "cấp" }))),
      h("div", { class: "hero-body" },
        h("p", { class: "eyebrow hero-eyebrow", text: rankName(L.level) }),
        h("p", { class: "hero-xp", text: state.xp.toLocaleString("vi-VN") + " XP" }),
        h("p", { class: "small", text: "Còn " + (L.need - L.into) + " XP nữa để lên cấp " + (L.level + 1) })),
      h("button", { class: "btn hero-play", type: "button", text: "Chơi ngay", onclick: () => { game = null; show("practice"); } }));

    const log = todayLog();
    const due = dueIds().length;
    const quests = [
      { done: log.n >= Math.min(5, state.goal), text: "Học 5 từ mới", prog: Math.min(log.n, 5) + "/5" },
      { done: due === 0 && Object.keys(state.cards).length > 0, text: "Ôn hết các từ đến hạn", prog: due ? "còn " + due : Object.keys(state.cards).length ? "xong" : "chưa có từ" },
      { done: (log.g || 0) >= 2, text: "Chơi 2 trò chơi", prog: Math.min(log.g || 0, 2) + "/2" },
    ];
    const doneN = quests.filter((q) => q.done).length;
    $("#quests").replaceChildren(
      h("div", { class: "spread" }, h("h3", { text: "Nhiệm vụ hôm nay" }), h("span", { class: "small muted", text: doneN + "/3 hoàn thành" })),
      h("ul", { class: "quests" }, quests.map((q) => h("li", { class: q.done ? "done" : "" },
        h("span", { class: "check", "aria-hidden": "true", text: q.done ? "✓" : "" }),
        h("span", { class: "q-text", text: q.text }), h("span", { class: "small muted", text: q.prog })))));
    $("#set-sound").checked = !!state.sound;
  };
  $("#set-sound").addEventListener("change", (e) => { state.sound = e.target.checked; commit(); if (state.sound) sfx.good(); });
}

// ---------- Khung trò chơi ----------
let game = null;
const GAMES = [];

function gamePool(min = 8, filter = () => true) {
  const learned = Object.keys(state.cards).map((id) => WORDS[id]).filter((w) => w && filter(w));
  if (learned.length >= min) return learned;
  const topic = topicWords(state.topic).filter(filter);
  const extra = shuffle(Object.values(WORDS).filter(filter));
  const seen = new Set();
  return [...learned, ...topic, ...extra].filter((w) => !seen.has(w.id) && seen.add(w.id)).slice(0, Math.max(min, 40));
}
const isWord = (w) => w.p !== "s";

function startGame(id) {
  game = id;
  const g = GAMES.find((x) => x.id === id);
  if (g && g.start) g.start();
  renderCurrent();
}

function finishGame(id, score, lines = []) {
  const g = GAMES.find((x) => x.id === id);
  const prev = state.best[id] || 0;
  const record = score > prev;
  if (record) state.best[id] = score;
  const log = todayLog(); log.g = (log.g || 0) + 1;
  gainXP(Math.round(score / 10) + 10);
  commit();
  if (record && score > 0) { confetti(); sfx.win(); } else sfx.good(3);
  const root = $("#quiz");
  root.replaceChildren(h("div", { class: "sheet stack pop result" },
    h("p", { class: "eyebrow", text: g.name + (record && score > 0 ? " · Kỷ lục mới!" : "") }),
    h("div", { class: "score", text: score.toLocaleString("vi-VN") }),
    h("p", { class: "muted", text: "Điểm cao nhất: " + Math.max(prev, score).toLocaleString("vi-VN") + " · +" + (Math.round(score / 10) + 10) + " XP" }),
    lines.map((l) => (typeof l === "string" ? h("p", { text: l }) : l)),
    h("div", { class: "grid-2" },
      h("button", { class: "btn", type: "button", text: "Chơi lại", onclick: () => startGame(id) }),
      h("button", { class: "btn ghost", type: "button", text: "Trò khác", onclick: () => { game = null; renderCurrent(); } }))));
}

function missedList(words) {
  if (!words.length) return null;
  return h("div", { class: "stack", style: "gap:6px" }, h("p", { class: "eyebrow", text: "Từ cần xem lại" }),
    words.slice(0, 8).map((w) => h("div", { class: "row" }, h("b", { class: "en", lang: "en", text: w.w }), h("span", { class: "muted", text: "· " + w.vi }), speakBtn(w.w))));
}

{
  const renderQuiz = RENDER.practice;
  RENDER.practice = () => {
    const back = $("#pr-back"), modes = $("#modes");
    back.hidden = !game;
    modes.hidden = game !== "quiz";
    const g = GAMES.find((x) => x.id === game);
    $("#pr-eyebrow").textContent = g ? "Trò chơi" : "Trò chơi · " + GAMES.length + " trò";
    $("#pr-title").textContent = g ? g.name : "Chơi mà học";
    if (game === "quiz") { renderQuiz(); return; }
    if (g) { g.render($("#quiz")); return; }
    renderHub();
  };
  $("#pr-back").addEventListener("click", () => { if (GAMES.find((x) => x.id === game)?.stop) GAMES.find((x) => x.id === game).stop(); game = null; renderCurrent(); });
}

function renderHub() {
  const root = $("#quiz");
  root.replaceChildren(
    h("p", { class: "muted", text: "Trò chơi lấy từ bạn đã học. Chưa học đủ thì lấy thêm từ chủ đề đang chọn." }),
    h("div", { class: "games" }, GAMES.map((g) => h("button", {
      class: "game-card", type: "button", style: "--g:" + g.color, onclick: () => startGame(g.id),
    },
      h("span", { class: "game-icon", html: g.icon }),
      h("span", { class: "game-meta" },
        h("strong", { text: g.name }),
        h("span", { class: "small muted", text: g.desc }),
        h("span", { class: "game-best", text: state.best[g.id] ? "Kỷ lục " + state.best[g.id].toLocaleString("vi-VN") : "Chưa chơi" }))))));
}

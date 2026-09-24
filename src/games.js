// ---------- Các trò chơi (phần 1) ----------
const ICON = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";

function timerBar(total, left) {
  return h("div", { class: "timer", "aria-label": "Còn " + Math.ceil(left) + " giây" },
    h("i", { style: "width:" + Math.max(0, (left / total) * 100) + "%" }), h("span", { text: Math.ceil(left) + "s" }));
}
function hud(items) {
  return h("div", { class: "hud" }, items.map(([k, v, cls]) => h("div", { class: "hud-item " + (cls || "") }, h("b", { text: v }), h("span", { text: k }))));
}

// 1. Trắc nghiệm (bài luyện tập cũ)
GAMES.push({
  id: "quiz", name: "Trắc nghiệm", desc: "10 câu: chọn nghĩa, chọn từ, nghe và viết", color: "#5b3cc4",
  icon: ICON('<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>'),
  start() { quiz = null; },
});
{
  const _next = nextQuestion;
  nextQuestion = function () {
    _next();
    if (quiz && quiz.i >= quiz.list.length && !quiz.counted) {
      quiz.counted = true;
      const score = quiz.right * 100;
      if (score > (state.best.quiz || 0)) state.best.quiz = score;
      const log = todayLog(); log.g = (log.g || 0) + 1;
      gainXP(10); commit();
      if (quiz.right === quiz.list.length) { confetti(); sfx.win(); }
    }
  };
}

// 2. Lật thẻ ghép đôi
let mem = null;
GAMES.push({
  id: "memory", name: "Lật thẻ ghép đôi", desc: "Lật 2 thẻ, ghép từ tiếng Anh với nghĩa", color: "#e0567a",
  icon: ICON('<rect x="3" y="4" width="8" height="11" rx="2"/><rect x="13" y="9" width="8" height="11" rx="2"/>'),
  start() {
    const words = shuffle(gamePool(6, isWord)).slice(0, 6);
    const cards = shuffle(words.flatMap((w) => [{ id: w.id, side: "en", text: w.w }, { id: w.id, side: "vi", text: w.vi }]));
    mem = { words, cards, open: [], done: new Set(), moves: 0, t0: Date.now(), lock: false };
  },
  render(root) {
    root.replaceChildren(hud([["lượt lật", mem.moves], ["cặp đúng", mem.done.size + "/6"]]));
    const grid = h("div", { class: "mem-grid" }, mem.cards.map((c, i) => {
      const up = mem.open.includes(i) || mem.done.has(c.id);
      return h("button", {
        class: "mem-card" + (up ? " up" : "") + (mem.done.has(c.id) ? " matched" : ""), type: "button",
        "aria-label": up ? c.text : "Thẻ úp",
        onclick: () => flipMem(i),
      }, h("span", { class: "mem-back", "aria-hidden": "true", text: "?" }), h("span", { class: "mem-front " + (c.side === "en" ? "en" : ""), lang: c.side === "en" ? "en" : null, text: c.text }));
    }));
    root.append(grid);
  },
});
function flipMem(i) {
  if (mem.lock || mem.open.includes(i) || mem.done.has(mem.cards[i].id)) return;
  sfx.flip();
  mem.open.push(i);
  if (mem.cards[i].side === "en") speak(mem.cards[i].text);
  if (mem.open.length === 2) {
    mem.moves++;
    const [a, b] = mem.open.map((k) => mem.cards[k]);
    if (a.id === b.id) {
      mem.done.add(a.id); mem.open = []; sfx.good(mem.done.size);
      if (mem.done.size === 6) {
        const sec = Math.round((Date.now() - mem.t0) / 1000);
        renderCurrent();
        setTimeout(() => finishGame("memory", Math.max(100, 1200 - mem.moves * 25 - sec * 5),
          ["Hoàn thành trong " + sec + " giây với " + mem.moves + " lượt lật."]), 500);
        return;
      }
    } else {
      mem.lock = true; sfx.bad();
      renderCurrent();
      setTimeout(() => { mem.open = []; mem.lock = false; renderCurrent(); }, 850);
      return;
    }
  }
  renderCurrent();
}

// 3. Nối nhanh 60 giây
let rush = null;
GAMES.push({
  id: "rush", name: "Nối nhanh", desc: "60 giây nối từ với nghĩa, nối liền để nhân combo", color: "#0f9d8a",
  icon: ICON('<circle cx="6" cy="7" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M8.5 7h3a3 3 0 0 1 3 3v4a3 3 0 0 0 3 3"/><path d="M13 3l-2 5h4l-2 5"/>'),
  start() {
    const pool = shuffle(gamePool(10, isWord));
    rush = { pool, next: 0, left: [], right: [], sel: null, score: 0, combo: 0, best: 0, total: 60, end: Date.now() + 60000, missed: [], timer: null };
    for (let i = 0; i < 5; i++) addRushPair();
    rush.right = shuffle(rush.right);
    clearInterval(rush.timer);
    rush.timer = setInterval(() => {
      if (current !== "practice" || game !== "rush") return;
      const t = $(".timer", $("#quiz"));
      const left = (rush.end - Date.now()) / 1000;
      if (left <= 0) { clearInterval(rush.timer); finishGame("rush", rush.score, ["Combo dài nhất: x" + rush.best], ); const m = missedList(rush.missed); if (m) $(".result").insertBefore(m, $(".result .grid-2")); return; }
      if (t) t.replaceWith(timerBar(rush.total, left));
    }, 250);
  },
  stop() { if (rush) clearInterval(rush.timer); },
  render(root) {
    const left = (rush.end - Date.now()) / 1000;
    root.replaceChildren(timerBar(rush.total, left), hud([["điểm", rush.score], ["combo", "x" + Math.max(1, rush.combo), rush.combo >= 3 ? "hot" : ""]]));
    const col = (items, side) => h("div", { class: "rush-col" }, items.map((w) => h("button", {
      class: "rush-item " + (side === "en" ? "en" : "") + (rush.sel && rush.sel.side === side && rush.sel.id === w.id ? " sel" : ""),
      type: "button", lang: side === "en" ? "en" : null, "data-id": w.id, text: side === "en" ? w.w : w.vi,
      onclick: (e) => pickRush(side, w, e.currentTarget),
    })));
    root.append(h("div", { class: "rush" }, col(rush.left, "en"), col(rush.right, "vi")));
  },
});
function addRushPair() {
  const used = new Set([...rush.left, ...rush.right].map((w) => w.id));
  let w = null;
  for (let k = 0; k < rush.pool.length; k++) { const c = rush.pool[(rush.next + k) % rush.pool.length]; if (!used.has(c.id)) { w = c; rush.next += k + 1; break; } }
  if (!w) return;
  rush.left.push(w); rush.right.push(w);
}
function pickRush(side, w, el) {
  if (!rush.sel || rush.sel.side === side) { rush.sel = { side, id: w.id }; if (side === "en") speak(w.w); sfx.flip(); renderCurrent(); return; }
  if (rush.sel.id === w.id) {
    rush.combo++; rush.best = Math.max(rush.best, rush.combo);
    const pts = 10 * Math.min(rush.combo, 5);
    rush.score += pts; floatText(el, "+" + pts); sfx.good(rush.combo);
    const li = rush.left.findIndex((x) => x.id === w.id), ri = rush.right.findIndex((x) => x.id === w.id);
    rush.left.splice(li, 1); rush.right.splice(ri, 1);
    addRushPair();
    const nw = rush.left[rush.left.length - 1];
    if (nw && !rush.right.includes(nw)) rush.right.push(nw);
    // chèn nghĩa mới vào vị trí ngẫu nhiên để không đoán theo thứ tự
    if (nw) { rush.right.splice(rush.right.indexOf(nw), 1); rush.right.splice(Math.floor(Math.random() * (rush.right.length + 1)), 0, nw); }
  } else {
    rush.combo = 0; rush.end -= 3000; sfx.bad(); buzz(80);
    const miss = WORDS[rush.sel.side === "en" ? rush.sel.id : w.id];
    if (miss && !rush.missed.includes(miss)) rush.missed.push(miss);
    floatText(el, "−3s", "bad");
  }
  rush.sel = null;
  renderCurrent();
}

// 4. Đúng hay Sai
let tf = null;
GAMES.push({
  id: "truefalse", name: "Đúng hay Sai", desc: "45 giây phản xạ: nghĩa này có đúng không?", color: "#f08c2e",
  icon: ICON('<path d="M4 12l4 4 8-9"/><path d="M15 15l5 5M20 15l-5 5"/>'),
  start() {
    tf = { pool: shuffle(gamePool(10, isWord)), i: 0, score: 0, combo: 0, best: 0, right: 0, total: 45, end: Date.now() + 45000, missed: [], q: null, timer: null };
    nextTF();
    clearInterval(tf.timer);
    tf.timer = setInterval(() => {
      if (current !== "practice" || game !== "truefalse") return;
      const left = (tf.end - Date.now()) / 1000;
      if (left <= 0) { clearInterval(tf.timer); endTF(); return; }
      const t = $(".timer", $("#quiz")); if (t) t.replaceWith(timerBar(tf.total, left));
    }, 250);
  },
  stop() { if (tf) clearInterval(tf.timer); },
  render(root) {
    const q = tf.q;
    root.replaceChildren(timerBar(tf.total, (tf.end - Date.now()) / 1000),
      hud([["điểm", tf.score], ["đúng", tf.right], ["combo", "x" + Math.max(1, tf.combo), tf.combo >= 3 ? "hot" : ""]]),
      h("div", { class: "sheet tf-card pop" },
        h("div", { class: "row" }, h("span", { class: "headword en", lang: "en", text: q.w.w }), speakBtn(q.w.w)),
        h("p", { class: "tf-eq", text: "nghĩa là" }),
        h("p", { class: "meaning", text: q.shown })),
      h("div", { class: "tf-btns" },
        h("button", { class: "tf-no", type: "button", onclick: (e) => answerTF(false, e.currentTarget) }, "✗ Sai", h("small", { text: "phím ←" })),
        h("button", { class: "tf-yes", type: "button", onclick: (e) => answerTF(true, e.currentTarget) }, "✓ Đúng", h("small", { text: "phím →" }))));
  },
});
function nextTF() {
  const w = tf.pool[tf.i++ % tf.pool.length];
  const truth = Math.random() < 0.5;
  let shown = w.vi;
  if (!truth) { const o = shuffle(Object.values(WORDS).filter((x) => x.vi !== w.vi && x.p === w.p))[0] || shuffle(Object.values(WORDS))[0]; shown = o.vi; }
  tf.q = { w, truth, shown };
}
function answerTF(yes, el) {
  if (!tf || !tf.q) return;
  const ok = yes === tf.q.truth;
  if (ok) { tf.combo++; tf.right++; tf.best = Math.max(tf.best, tf.combo); const p = 10 * Math.min(tf.combo, 5); tf.score += p; floatText(el, "+" + p); sfx.good(tf.combo); }
  else { tf.combo = 0; sfx.bad(); buzz(80); shake($(".tf-card")); if (!tf.missed.includes(tf.q.w)) tf.missed.push(tf.q.w); floatText(el, tf.q.truth ? "Đúng mà!" : "Sai mà!", "bad"); }
  nextTF();
  setTimeout(renderCurrent, ok ? 0 : 350);
}
function endTF() {
  finishGame("truefalse", tf.score, ["Trả lời đúng " + tf.right + " câu, combo dài nhất x" + tf.best + "."]);
  const m = missedList(tf.missed); if (m) $(".result").insertBefore(m, $(".result .grid-2"));
  tf.q = null;
}
document.addEventListener("keydown", (e) => {
  if (current !== "practice" || game !== "truefalse" || !tf || !tf.q) return;
  if (e.key === "ArrowLeft") answerTF(false, $(".tf-no"));
  if (e.key === "ArrowRight") answerTF(true, $(".tf-yes"));
});

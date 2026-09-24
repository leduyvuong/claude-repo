// ---------- Các trò chơi (phần 2) ----------

// 5. Mưa từ
let rain = null;
GAMES.push({
  id: "rain", name: "Mưa từ", desc: "Chạm đúng từ đang rơi trước khi chạm đất", color: "#3b7de0",
  icon: ICON('<path d="M7 14a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17.5 14"/><path d="M8 17l-1 3M12 16l-1 4M16 17l-1 3"/>'),
  start() {
    const pool = shuffle(gamePool(10, (w) => isWord(w) && w.w.length <= 16));
    rain = { pool, pi: 0, target: null, drops: [], lives: 3, score: 0, combo: 0, right: 0, speed: 42, gap: 1300, last: 0, since: 0, missed: [], raf: 0, prev: 0, over: false };
    newRainTarget();
    cancelAnimationFrame(rain.raf);
    rain.raf = requestAnimationFrame(rainLoop);
  },
  stop() { if (rain) { rain.over = true; cancelAnimationFrame(rain.raf); } },
  render(root) {
    const arena = h("div", { class: "arena", "aria-label": "Khu vực từ rơi" }, rain.drops.map((d) => d.el));
    rain.arena = arena;
    root.replaceChildren(
      hud([["điểm", rain.score], ["mạng", "♥".repeat(rain.lives) + "♡".repeat(3 - rain.lives), "lives"], ["combo", "x" + Math.max(1, rain.combo), rain.combo >= 3 ? "hot" : ""]]),
      h("div", { class: "rain-target" }, h("span", { class: "small muted", text: "Tìm từ có nghĩa:" }), h("b", { text: rain.target.vi })),
      arena);
  },
});
function newRainTarget() {
  rain.target = rain.pool[rain.pi++ % rain.pool.length];
  rain.since = 0;
}
function spawnDrop() {
  const onScreen = rain.drops.some((d) => d.w.id === rain.target.id);
  let w;
  if (!onScreen && (rain.since >= 2 || Math.random() < 0.4)) w = rain.target;
  else w = shuffle(rain.pool.filter((x) => x.id !== rain.target.id))[0];
  rain.since++;
  const d = { w, y: -40, x: 4 + Math.random() * 62 };
  d.el = h("button", { class: "drop en", type: "button", lang: "en", text: w.w, style: "left:" + d.x + "%;transform:translateY(-40px)", onclick: () => hitDrop(d) });
  rain.drops.push(d);
  if (rain.arena) rain.arena.append(d.el);
}
function rainLoop(t) {
  if (!rain || rain.over) return;
  if (current !== "practice" || game !== "rain") { rain.prev = 0; rain.raf = requestAnimationFrame(rainLoop); return; }
  const dt = rain.prev ? Math.min(0.05, (t - rain.prev) / 1000) : 0;
  rain.prev = t;
  if (t - rain.last > rain.gap) { rain.last = t; spawnDrop(); }
  const H = rain.arena ? rain.arena.clientHeight : 380;
  for (const d of rain.drops.slice()) {
    d.y += rain.speed * dt;
    d.el.style.transform = "translateY(" + d.y + "px)";
    if (d.y > H - 36) {
      d.el.remove(); rain.drops.splice(rain.drops.indexOf(d), 1);
      if (d.w.id === rain.target.id) { loseRainLife(d.w); newRainTarget(); renderCurrent(); if (rain.over) return; }
    }
  }
  rain.raf = requestAnimationFrame(rainLoop);
}
function hitDrop(d) {
  if (rain.over) return;
  if (d.w.id === rain.target.id) {
    rain.combo++; rain.right++;
    const p = 10 * Math.min(rain.combo, 5);
    rain.score += p; floatText(d.el, "+" + p); sfx.good(rain.combo); speak(d.w.w);
    rain.speed = Math.min(130, rain.speed * 1.05); rain.gap = Math.max(650, rain.gap * 0.97);
    d.el.remove(); rain.drops.splice(rain.drops.indexOf(d), 1);
    newRainTarget();
  } else {
    floatText(d.el, "Sai rồi", "bad"); d.el.remove(); rain.drops.splice(rain.drops.indexOf(d), 1);
    loseRainLife(rain.target);
  }
  if (!rain.over) renderCurrent();
}
function loseRainLife(w) {
  rain.combo = 0; rain.lives--; sfx.bad(); buzz(100);
  if (!rain.missed.includes(w)) rain.missed.push(w);
  if (rain.arena) shake(rain.arena);
  if (rain.lives <= 0) {
    rain.over = true; cancelAnimationFrame(rain.raf);
    finishGame("rain", rain.score, ["Bắt đúng " + rain.right + " từ."]);
    const m = missedList(rain.missed); if (m) $(".result").insertBefore(m, $(".result .grid-2"));
  }
}

// 6. Xếp chữ
let scr = null;
GAMES.push({
  id: "scramble", name: "Xếp chữ", desc: "Sắp lại các chữ cái cho đúng từ", color: "#8b5cf6",
  icon: ICON('<rect x="3" y="8" width="5" height="8" rx="1.5"/><rect x="9.5" y="8" width="5" height="8" rx="1.5"/><rect x="16" y="8" width="5" height="8" rx="1.5"/><path d="M5.5 5l4-2M18.5 19l-4 2"/>'),
  start() {
    const list = shuffle(gamePool(8, (w) => /^[a-z]{3,10}$/i.test(w.w))).slice(0, 8);
    scr = { list, i: 0, score: 0, missed: [], right: 0 };
    setupScramble();
  },
  render(root) {
    const w = scr.list[scr.i];
    const word = w.w.toLowerCase();
    const slots = h("div", { class: "slots" + (scr.state ? " " + scr.state : "") }, word.split("").map((_, k) => {
      const ti = scr.placed[k];
      return h("button", { class: "slot en" + (ti != null ? " filled" : ""), type: "button", text: ti != null ? scr.tiles[ti] : "", disabled: scr.state === "ok",
        onclick: () => { if (ti == null || scr.state) return; scr.placed = scr.placed.slice(0, k); sfx.flip(); renderCurrent(); } });
    }));
    const tiles = h("div", { class: "tiles" }, scr.tiles.map((ch, ti) => h("button", {
      class: "tile en", type: "button", text: ch, disabled: scr.placed.includes(ti) || !!scr.state,
      onclick: () => placeTile(ti),
    })));
    root.replaceChildren(
      hud([["câu", (scr.i + 1) + "/" + scr.list.length], ["điểm", scr.score], ["gợi ý", scr.hints]]),
      h("div", { class: "sheet stack pop", style: "align-items:center;text-align:center" },
        h("p", { class: "muted", text: "Xếp lại thành từ có nghĩa:" }),
        h("div", { class: "row", style: "justify-content:center" }, h("p", { class: "meaning", text: w.vi }), speakBtn(w.w)),
        slots, tiles,
        scr.state === "ok" ? h("p", { class: "feedback ok", text: "Chính xác! " + w.w + " /" + w.ipa + "/" }) : null,
        scr.state === "skip" ? h("p", { class: "feedback no", text: "Đáp án: " + w.w }) : null),
      scr.state
        ? h("button", { class: "btn block", type: "button", text: scr.i + 1 < scr.list.length ? "Từ tiếp theo" : "Xem kết quả", onclick: nextScramble })
        : h("div", { class: "grid-2" },
            h("button", { class: "btn ghost", type: "button", text: "Gợi ý 1 chữ", onclick: hintScramble }),
            h("button", { class: "btn ghost", type: "button", text: "Bỏ qua", onclick: () => { scr.state = "skip"; scr.missed.push(w); sfx.bad(); renderCurrent(); } })));
  },
});
function setupScramble() {
  const word = scr.list[scr.i].w.toLowerCase();
  let tiles = word.split("");
  for (let k = 0; k < 6 && tiles.join("") === word; k++) tiles = shuffle(tiles);
  Object.assign(scr, { tiles, placed: [], hints: 0, state: null });
}
function placeTile(ti) {
  const word = scr.list[scr.i].w.toLowerCase();
  scr.placed.push(ti); sfx.flip();
  if (scr.placed.length === word.length) {
    const guess = scr.placed.map((k) => scr.tiles[k]).join("");
    if (guess === word) {
      scr.state = "ok"; scr.right++;
      const p = Math.max(20, 100 - scr.hints * 30); scr.score += p;
      sfx.good(scr.right); speak(scr.list[scr.i].w);
    } else {
      sfx.bad(); buzz(80);
      renderCurrent(); shake($(".slots"));
      setTimeout(() => { scr.placed = []; renderCurrent(); }, 600);
      return;
    }
  }
  renderCurrent();
}
function hintScramble() {
  const word = scr.list[scr.i].w.toLowerCase();
  let k = 0;
  while (k < scr.placed.length && scr.tiles[scr.placed[k]] === word[k]) k++;
  scr.placed = scr.placed.slice(0, k);
  if (k >= word.length) return;
  const ti = scr.tiles.findIndex((ch, idx) => ch === word[k] && !scr.placed.includes(idx));
  scr.hints++;
  if (ti >= 0) placeTile(ti); else renderCurrent();
}
function nextScramble() {
  scr.i++;
  if (scr.i >= scr.list.length) {
    finishGame("scramble", scr.score, ["Xếp đúng " + scr.right + "/" + scr.list.length + " từ."]);
    const m = missedList(scr.missed); if (m) $(".result").insertBefore(m, $(".result .grid-2"));
    return;
  }
  setupScramble(); renderCurrent();
}

// 7. Xếp câu
let sb = null;
GAMES.push({
  id: "builder", name: "Xếp câu", desc: "Ghép các mảnh thành câu tiếng Anh hoàn chỉnh", color: "#16a34a",
  icon: ICON('<rect x="3" y="5" width="7" height="5" rx="1.5"/><rect x="12" y="5" width="9" height="5" rx="1.5"/><rect x="3" y="14" width="10" height="5" rx="1.5"/><path d="M16 16.5h5M18.5 14v5"/>'),
  start() {
    const src = gamePool(12, () => true);
    const items = [];
    for (const w of shuffle(src)) {
      const en = w.p === "s" ? w.w : w.ex, vi = w.p === "s" ? w.vi : w.exVi;
      if (!en || !vi || /\bA:/.test(en)) continue;
      const n = en.split(/\s+/).length;
      if (n >= 3 && n <= 11) items.push({ en, vi });
      if (items.length === 6) break;
    }
    sb = { items, i: 0, score: 0, right: 0, wrong: [] };
    setupBuilder();
  },
  render(root) {
    const it = sb.items[sb.i];
    root.replaceChildren(
      hud([["câu", (sb.i + 1) + "/" + sb.items.length], ["điểm", sb.score]]),
      h("div", { class: "sheet stack pop" },
        h("p", { class: "muted", text: "Dịch sang tiếng Anh bằng cách xếp các mảnh:" }),
        h("p", { class: "meaning", style: "font-size:19px", text: it.vi }),
        h("div", { class: "answer-line" + (sb.state ? " " + sb.state : "") }, sb.answer.map((ci, k) => h("button", {
          class: "chip-word en", type: "button", text: sb.chips[ci], disabled: !!sb.state,
          onclick: () => { sb.answer.splice(k, 1); sfx.flip(); renderCurrent(); } }))),
        h("div", { class: "chip-bank" }, sb.chips.map((c, ci) => h("button", {
          class: "chip-word en", type: "button", text: c, disabled: sb.answer.includes(ci) || !!sb.state,
          onclick: () => { sb.answer.push(ci); sfx.flip(); renderCurrent(); } }))),
        sb.state === "ok" ? h("p", { class: "feedback ok", text: "Chính xác!" }) : null,
        sb.state === "no" ? h("div", { class: "stack", style: "gap:4px" }, h("p", { class: "feedback no", text: "Chưa đúng. Câu đúng là:" }),
          h("div", { class: "row", style: "flex-wrap:nowrap;justify-content:space-between" }, h("p", { class: "fix", lang: "en", text: it.en }), speakBtn(it.en))) : null),
      sb.state
        ? h("button", { class: "btn block", type: "button", text: sb.i + 1 < sb.items.length ? "Câu tiếp theo" : "Xem kết quả", onclick: nextBuilder })
        : h("div", { class: "grid-2" },
            h("button", { class: "btn ghost", type: "button", text: "Xóa hết", onclick: () => { sb.answer = []; renderCurrent(); } }),
            h("button", { class: "btn", type: "button", text: "Kiểm tra", disabled: sb.answer.length !== sb.chips.length, onclick: checkBuilder })));
  },
});
function setupBuilder() {
  const toks = sb.items[sb.i].en.split(/\s+/);
  let order = toks.map((_, i) => i);
  for (let k = 0; k < 6 && order.every((v, i) => v === i); k++) order = shuffle(order);
  Object.assign(sb, { chips: order.map((i) => toks[i]), answer: [], state: null });
}
function checkBuilder() {
  const it = sb.items[sb.i];
  const guess = sb.answer.map((ci) => sb.chips[ci]).join(" ");
  if (guess === it.en) { sb.state = "ok"; sb.right++; sb.score += 150; sfx.good(sb.right); }
  else { sb.state = "no"; sb.wrong.push(it); sfx.bad(); buzz(80); }
  speak(it.en);
  renderCurrent();
}
function nextBuilder() {
  sb.i++;
  if (sb.i >= sb.items.length) {
    finishGame("builder", sb.score, ["Xếp đúng " + sb.right + "/" + sb.items.length + " câu."]);
    return;
  }
  setupBuilder(); renderCurrent();
}

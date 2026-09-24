// ---------- 8. Đấu trùm ----------
const BOSS_SVG = `
<svg viewBox="0 0 140 120" aria-hidden="true">
  <defs>
    <radialGradient id="bossG" cx="35%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#9d6bff"/><stop offset="55%" stop-color="#6a3bd8"/><stop offset="100%" stop-color="#3c1e8f"/>
    </radialGradient>
  </defs>
  <ellipse cx="70" cy="112" rx="42" ry="7" fill="rgba(0,0,0,.35)"/>
  <path d="M38 22 L50 4 L58 24 Z" fill="#3c1e8f"/>
  <path d="M102 22 L90 4 L82 24 Z" fill="#3c1e8f"/>
  <path d="M70 10 C102 10 118 34 118 62 C118 92 98 108 70 108 C42 108 22 92 22 62 C22 34 38 10 70 10 Z" fill="url(#bossG)"/>
  <path d="M34 70 q6 10 0 20 M106 70 q-6 10 0 20" stroke="#2c1470" stroke-width="5" fill="none" stroke-linecap="round"/>
  <g class="boss-eyes">
    <ellipse cx="52" cy="52" rx="11" ry="13" fill="#fff"/>
    <ellipse cx="88" cy="52" rx="11" ry="13" fill="#fff"/>
    <circle class="boss-pupil" cx="54" cy="55" r="5.5" fill="#1c0d4d"/>
    <circle class="boss-pupil" cx="86" cy="55" r="5.5" fill="#1c0d4d"/>
    <path class="boss-brow" d="M40 40 l20 6 M100 40 l-20 6" stroke="#2c1470" stroke-width="5" stroke-linecap="round"/>
  </g>
  <path class="boss-mouth" d="M52 78 q18 14 36 0" stroke="#2c1470" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M56 78 l5 8 5-8 M74 78 l5 8 5-8" fill="#fff"/>
</svg>`;

let boss = null;
GAMES.push({
  id: "boss", name: "Đấu trùm", desc: "Hạ gục Quái Thú Quên Từ bằng câu trả lời đúng", color: "#d33b4d",
  icon: ICON('<path d="M5 16 L16 5 l3 3 L8 19 l-4 1 z"/><path d="M14 7l3 3M3 21l2-2M16 16l3 3M19 16l-3 3"/>'),
  start() {
    boss = { pool: shuffle(gamePool(10, isWord)), i: 0, hp: 100, max: 100, hearts: 3, combo: 0, best: 0, dmg: 0,
      q: null, total: 12, end: 0, timer: null, over: false, locked: false, missed: [], fx: "" };
    nextBossQ();
    clearInterval(boss.timer);
    boss.timer = setInterval(() => {
      if (!boss || boss.over || boss.locked) return;
      if (current !== "practice" || game !== "boss") return;
      const left = (boss.end - Date.now()) / 1000;
      if (left <= 0) { bossWrong(null); return; }
      const t = $(".timer", $("#quiz"));
      if (t) t.replaceWith(timerBar(boss.total, left));
      if (left < 4) sfx.tick();
    }, 300);
  },
  stop() { if (boss) { boss.over = true; clearInterval(boss.timer); } },
  render(root) {
    const q = boss.q;
    root.replaceChildren(
      timerBar(boss.total, Math.max(0, (boss.end - Date.now()) / 1000)),
      h("div", { class: "boss-arena" + (boss.fx === "shake" ? " shake" : "") },
        h("div", { class: "boss-hpbar" }, h("i", { style: "width:" + (boss.hp / boss.max) * 100 + "%" }),
          h("span", { text: "Quái Thú Quên Từ · " + boss.hp + "/" + boss.max })),
        h("div", { class: "boss-fig" + (boss.hp <= 35 ? " angry" : "") + (boss.fx === "hit" ? " hit" : ""), html: BOSS_SVG }),
        h("div", { class: "boss-row" },
          h("span", { class: "boss-hearts", "aria-label": boss.hearts + " mạng", text: "♥".repeat(boss.hearts) + "♡".repeat(3 - boss.hearts) }),
          h("span", { class: "boss-combo" + (boss.combo >= 3 ? " hot" : ""), text: "Combo x" + Math.max(1, boss.combo) }))),
      h("div", { class: "panel stack" },
        q.type === "vi2en"
          ? h("p", { class: "muted", text: "Chém quái bằng từ tiếng Anh có nghĩa:" })
          : h("p", { class: "muted", text: "Chém quái bằng nghĩa đúng của từ:" }),
        q.type === "vi2en"
          ? h("p", { class: "meaning", text: q.w.vi })
          : h("div", { class: "row" }, h("span", { class: "headword en", lang: "en", style: "font-size:30px", text: q.w.w }), speakBtn(q.w.w)),
        h("div", { class: "options" }, q.options.map((opt) => h("button", {
          class: "option" + (q.type === "vi2en" ? " en" : ""), type: "button", lang: q.type === "vi2en" ? "en" : null,
          text: opt, onclick: (e) => answerBoss(opt, e.currentTarget),
        })))));
  },
});

function nextBossQ() {
  const w = boss.pool[boss.i++ % boss.pool.length];
  const type = Math.random() < 0.5 ? "vi2en" : "en2vi";
  boss.q = { w, type, answer: type === "vi2en" ? w.w : w.vi, options: type === "vi2en" ? wordOptions(w) : meaningOptions(w) };
  boss.end = Date.now() + boss.total * 1000;
  boss.locked = false;
  boss.fx = "";
}

function answerBoss(opt, el) {
  if (!boss || boss.over || boss.locked) return;
  if (opt === boss.q.answer) {
    boss.locked = true;
    boss.combo++; boss.best = Math.max(boss.best, boss.combo);
    const dmg = 10 + Math.min(boss.combo, 5) * 2;
    boss.hp = Math.max(0, boss.hp - dmg); boss.dmg += dmg;
    boss.fx = "hit";
    sfx.good(boss.combo); speak(boss.q.w.w);
    el.classList.add("correct");
    renderCurrent();
    const fig = $(".boss-fig"); if (fig) floatText(fig, "−" + dmg, "dmg");
    if (boss.hp <= 0) {
      boss.over = true; clearInterval(boss.timer);
      const score = 300 + boss.hearts * 150 + boss.best * 25;
      setTimeout(() => {
        confetti(); setTimeout(confetti, 500);
        finishGame("boss", score, ["Bạn hạ trùm với " + boss.hearts + " tim còn lại, combo dài nhất x" + boss.best + "."]);
        const m = missedList(boss.missed); if (m) $(".result").insertBefore(m, $(".result .grid-2"));
      }, 700);
      return;
    }
    setTimeout(() => { if (boss && !boss.over) { nextBossQ(); renderCurrent(); } }, 650);
  } else {
    bossWrong(el);
  }
}

function bossWrong(el) {
  if (!boss || boss.over || boss.locked) return;
  boss.locked = true;
  boss.combo = 0; boss.hearts--;
  boss.fx = "shake";
  if (!boss.missed.includes(boss.q.w)) boss.missed.push(boss.q.w);
  sfx.bad(); buzz(120);
  renderCurrent();
  if (el) { /* đánh dấu đáp án đúng cho người chơi thấy */ }
  for (const b of $$(".option", $("#quiz"))) { b.disabled = true; if (b.textContent === boss.q.answer) b.classList.add("correct"); }
  const fig = $(".boss-fig"); if (fig) floatText(fig, "Grrr!", "bad");
  if (boss.hearts <= 0) {
    boss.over = true; clearInterval(boss.timer);
    setTimeout(() => {
      finishGame("boss", boss.dmg, ["Quái thú còn " + boss.hp + " máu. Ôn lại các từ dưới đây rồi phục thù nhé!"]);
      const m = missedList(boss.missed); if (m) $(".result").insertBefore(m, $(".result .grid-2"));
    }, 900);
    return;
  }
  setTimeout(() => { if (boss && !boss.over) { nextBossQ(); renderCurrent(); } }, 1100);
}

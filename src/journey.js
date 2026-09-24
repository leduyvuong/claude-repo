// ---------- Hành trình, từ của ngày, huy hiệu, thẻ vuốt ----------

// Từ của ngày: cố định theo ngày
function wordOfDay() {
  const list = Object.values(WORDS).filter((w) => w.p !== "s" && w.topic !== "mine" && w.ex);
  const k = dayKey();
  let hsh = 0;
  for (const ch of k) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
  return list[hsh % list.length];
}

const BADGES = [
  { id: "first", name: "Khởi đầu", desc: "Học từ đầu tiên", icon: "✦", test: (s) => s.words >= 1 },
  { id: "w50", name: "50 từ", desc: "Học 50 từ", icon: "50", test: (s) => s.words >= 50 },
  { id: "w200", name: "200 từ", desc: "Học 200 từ", icon: "200", test: (s) => s.words >= 200 },
  { id: "w500", name: "Nửa nghìn", desc: "Học 500 từ", icon: "500", test: (s) => s.words >= 500 },
  { id: "known20", name: "Trí nhớ tốt", desc: "Thuộc 20 từ", icon: "★", test: (s) => s.known >= 20 },
  { id: "s3", name: "Lửa nhỏ", desc: "Học 3 ngày liền", icon: "3🔥", test: (s) => s.streak >= 3 },
  { id: "s7", name: "Một tuần", desc: "Học 7 ngày liền", icon: "7🔥", test: (s) => s.streak >= 7 },
  { id: "s30", name: "Bền bỉ", desc: "Học 30 ngày liền", icon: "30", test: (s) => s.streak >= 30 },
  { id: "lv5", name: "Cấp 5", desc: "Đạt cấp 5", icon: "Lv5", test: (s) => s.level >= 5 },
  { id: "games", name: "Game thủ", desc: "Có kỷ lục ở 7 trò chơi", icon: "🎮", test: (s) => s.games >= 7 },
  { id: "topic", name: "Về đích", desc: "Học hết một chặng", icon: "⚑", test: (s) => s.topicsDone >= 1 },
  { id: "chat", name: "Mạnh dạn", desc: "Trò chuyện với AI 10 lượt", icon: "💬", test: (s) => s.chats >= 10 },
];
function badgeStats() {
  return {
    words: Object.keys(state.cards).length,
    known: counts().known,
    streak: streak(),
    level: levelInfo().level,
    games: Object.keys(state.best).length,
    topicsDone: TOPICS.filter((t) => t.words.every(([w]) => state.cards[w])).length,
    chats: state.chats || 0,
  };
}
function checkBadges() {
  state.badges = state.badges || {};
  const s = badgeStats();
  for (const b of BADGES) {
    if (!state.badges[b.id] && b.test(s)) {
      state.badges[b.id] = dayKey();
      setTimeout(() => { toast("Huy hiệu mới: " + b.name + " · " + b.desc); confetti(); sfx.win(); }, 600);
    }
  }
}
{
  const _commit = commit;
  commit = function () { checkBadges(); _commit(); };
}

{
  const _today = RENDER.today;
  RENDER.today = () => {
    _today();
    // Từ của ngày
    const w = wordOfDay();
    const has = !!state.cards[w.id];
    $("#wotd").replaceChildren(h("article", { class: "wotd" },
      h("div", { class: "wotd-top" }, h("span", { class: "eyebrow", text: "Từ của ngày" }), h("span", { class: "pos", text: POS_VI[w.p] })),
      h("div", { class: "row", style: "flex-wrap:nowrap" }, h("span", { class: "wotd-word en", lang: "en", text: w.w }), speakBtn(w.w)),
      h("div", { class: "ipa", text: "/" + w.ipa + "/ · " + w.vi }),
      h("p", { class: "en wotd-ex", lang: "en", text: w.ex }),
      h("div", { class: "row" },
        has ? h("span", { class: "pill known", text: "Đã có trong lịch ôn" })
          : h("button", { class: "btn sm", type: "button", text: "+ Thêm vào lịch ôn", onclick: () => { addCard(w.id, false); todayLog().n++; commit(); sfx.good(); RENDER.today(); renderChrome(); } }))));

    // Huy hiệu
    const got = state.badges || {};
    $("#badges").replaceChildren(
      h("div", { class: "spread" }, h("h3", { text: "Huy hiệu" }), h("span", { class: "small muted", text: Object.keys(got).length + "/" + BADGES.length })),
      h("div", { class: "badges" }, BADGES.map((b) => h("div", { class: "badge-item" + (got[b.id] ? " got" : ""), title: b.desc },
        h("span", { class: "badge-medal", text: b.icon }), h("span", { class: "badge-name", text: b.name }), h("span", { class: "badge-desc", text: b.desc })))));

    // Hành trình
    const root = $("#topics");
    root.className = "journey";
    root.replaceChildren();
    let done = 0;
    TOPICS.forEach((t, i) => {
      const total = t.words.length;
      const learned = t.words.filter(([ww]) => state.cards[ww]).length;
      const pct = total ? learned / total : 0;
      if (learned === total) done++;
      const sel = t.id === state.topic;
      const offset = Math.round(Math.sin(i * 0.9) * 80);
      const node = h("div", { class: "j-step" + (sel ? " sel" : "") + (learned === total ? " done" : "") + (learned > 0 && learned < total ? " going" : ""), style: "--x:" + offset + "px" },
        h("button", { class: "j-node", type: "button", "aria-pressed": String(sel), "aria-label": t.name + ", " + learned + "/" + total + " từ", style: "--p:" + pct * 360 + "deg",
          onclick: () => { state.topic = t.id; commit(); sfx.flip(); RENDER.today(); $(".j-step.sel")?.scrollIntoView({ block: "center", behavior: "smooth" }); } },
          h("span", { class: "j-core", text: learned === total ? "✓" : String(i + 1) })),
        h("span", { class: "j-label", text: t.name }));
      if (sel) {
        const left = total - learned;
        node.append(h("div", { class: "j-card pop" },
          h("strong", { text: t.name }),
          h("span", { class: "small muted", text: learned + "/" + total + " từ đã học" + (t.words[0] && t.words[0][1] === "s" ? " · câu giao tiếp" : "") }),
          h("div", { class: "mini-bar" }, h("i", { style: "width:" + pct * 100 + "%" })),
          h("button", { class: "btn sm", type: "button", disabled: !left, text: left ? "Học " + Math.min(5, left) + " từ" : "Đã học hết", onclick: startLearn })));
      }
      root.append(node);
    });
    $("#journey-sum").textContent = done + "/" + TOPICS.length + " chặng hoàn thành";
  };
}

// Thẻ ôn tập: lật 3D và vuốt để chấm
{
  const _review = RENDER.review;
  RENDER.review = () => {
    _review();
    const sheet = $("#view-review .sheet");
    if (!review || !review.queue.length || !sheet) return;
    if (review.flipped) {
      if (review.justFlipped) { sheet.classList.add("flip-in"); review.justFlipped = false; }
      sheet.classList.add("swipeable");
      sheet.append(h("div", { class: "swipe-hint small muted", text: "← vuốt trái: Quên · vuốt phải: Nhớ →" }));
      let x0 = null, dx = 0;
      sheet.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; x0 = e.clientX; dx = 0; sheet.setPointerCapture(e.pointerId); sheet.style.transition = "none"; });
      sheet.addEventListener("pointermove", (e) => {
        if (x0 == null) return;
        dx = e.clientX - x0;
        sheet.style.transform = "translateX(" + dx + "px) rotate(" + dx / 18 + "deg)";
        sheet.dataset.dir = dx > 40 ? "good" : dx < -40 ? "again" : "";
      });
      const end = () => {
        if (x0 == null) return;
        x0 = null; sheet.style.transition = "";
        if (Math.abs(dx) > 90) {
          const g = dx > 0 ? "good" : "again";
          sheet.style.transform = "translateX(" + (dx > 0 ? 600 : -600) + "px) rotate(" + (dx > 0 ? 25 : -25) + "deg)";
          g === "good" ? sfx.good() : sfx.bad();
          setTimeout(() => rate(g), 180);
        } else { sheet.style.transform = ""; sheet.dataset.dir = ""; }
      };
      sheet.addEventListener("pointerup", end);
      sheet.addEventListener("pointercancel", end);
    } else {
      sheet.addEventListener("click", (e) => { if (e.target.closest(".hidden-side")) { review.justFlipped = true; sfx.flip(); } }, { capture: true });
    }
  };
}

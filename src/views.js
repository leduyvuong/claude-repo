// ---------- Điều hướng ----------
let current = "today";
const RENDER = {};

function show(view) {
  current = view;
  for (const s of $$("main > section")) s.hidden = s.id !== "view-" + view;
  const tab = view === "learn" ? "today" : view;
  for (const t of $$(".tab")) {
    if (t.dataset.view === tab) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  }
  window.scrollTo(0, 0);
  renderCurrent();
}
function renderCurrent() {
  renderChrome();
  if (RENDER[current]) RENDER[current]();
}
function renderChrome() {
  $("#streak-n").textContent = streak();
  const due = dueIds().length;
  const badge = $("#due-badge");
  badge.hidden = due === 0;
  badge.textContent = due > 99 ? "99+" : due;
}

// ---------- Hôm nay ----------
RENDER.today = () => {
  const c = counts();
  const log = todayLog();
  const left = topicWords(state.topic).filter((w) => !state.cards[w.id]).length;
  $("#today-date").textContent = prettyDate();
  $("#today-title").textContent =
    c.due > 0 ? "Có " + c.due + " từ đang chờ bạn ôn"
    : log.n >= state.goal ? "Bạn đã xong mục tiêu hôm nay"
    : "Hôm nay mình học gì?";
  $("#st-learned").textContent = c.learning;
  $("#st-due").textContent = c.due;
  $("#st-known").textContent = c.known;
  $("#goal-text").textContent = Math.min(log.n, 999) + "/" + state.goal + " từ mới";
  $("#goal-fill").style.width = Math.min(100, (log.n / state.goal) * 100) + "%";

  const learnBtn = $("#btn-learn");
  learnBtn.disabled = left === 0;
  learnBtn.textContent = left === 0 ? "Chủ đề này đã học hết" : "Học " + Math.min(5, left) + " từ mới";
  const revBtn = $("#btn-review");
  revBtn.disabled = c.due === 0;
  revBtn.textContent = c.due === 0 ? "Chưa có từ cần ôn" : "Ôn tập " + c.due + " từ";
  $("#learn-hint").textContent = left === 0
    ? "Bạn đã học hết chủ đề " + topicName(state.topic) + ". Chọn chủ đề khác bên dưới."
    : "Chủ đề: " + topicName(state.topic) + ", còn " + left + " từ chưa học.";

  const grid = $("#topics");
  grid.replaceChildren();
  for (const t of TOPICS) {
    const ws = topicWords(t.id);
    const learned = ws.filter((w) => state.cards[w.id]).length;
    grid.append(h("button", {
      class: "topic", type: "button", "aria-pressed": String(t.id === state.topic),
      onclick: () => { state.topic = t.id; commit(); RENDER.today(); },
    },
      h("strong", { text: t.name }),
      h("small", { text: learned + "/" + ws.length + " từ đã học" }),
      h("div", { class: "mini-bar" }, h("i", { style: "width:" + (ws.length ? (learned / ws.length) * 100 : 0) + "%" }))));
  }

  $("#set-goal").value = String(state.goal);
  $("#set-rate").value = String(state.rate);
  $("#set-auto").checked = !!state.auto;
};

// ---------- Học từ mới ----------
let learn = null;

function startLearn() {
  const pool = topicWords(state.topic).filter((w) => !state.cards[w.id]);
  if (!pool.length) { toast("Chủ đề này đã học hết. Chọn chủ đề khác nhé."); return; }
  learn = { words: pool.slice(0, 5), i: 0, added: [], known: [], phase: "cards", q: 0, right: 0, answered: false };
  show("learn");
  if (state.auto) speak(learn.words[0].w);
}

function learnAnswer(known) {
  const w = learn.words[learn.i];
  addCard(w.id, known);
  if (known) learn.known.push(w); else { learn.added.push(w); todayLog().n++; }
  commit();
  learn.i++;
  if (learn.i >= learn.words.length) {
    learn.phase = learn.added.length ? "check" : "done";
    learn.checkList = shuffle(learn.added);
  } else if (state.auto) speak(learn.words[learn.i].w);
  renderCurrent();
}

RENDER.learn = () => {
  const root = $("#view-learn");
  root.replaceChildren();
  if (!learn) { show("today"); return; }
  const back = h("button", { class: "btn sm ghost", type: "button", text: "Về trang Hôm nay", onclick: () => { learn = null; show("today"); } });

  if (learn.phase === "cards") {
    const w = learn.words[learn.i];
    root.append(
      h("div", { class: "spread" }, h("div", { class: "stack", style: "gap:4px" },
        h("p", { class: "eyebrow", text: "Học từ mới · " + topicName(state.topic) }),
        h("h2", { text: "Từ " + (learn.i + 1) + " trên " + learn.words.length })), back),
      h("div", { class: "progress-dots" }, learn.words.map((_, i) => h("i", { class: i < learn.i ? "done" : "" }))),
      wordSheet(w, { meta: "Mới" }),
      h("div", { class: "grid-2" },
        h("button", { class: "btn ghost", type: "button", text: "Mình biết từ này rồi", onclick: () => learnAnswer(true) }),
        h("button", { class: "btn", type: "button", text: "Học từ này", onclick: () => learnAnswer(false) })),
      h("p", { class: "small muted", text: "Từ bạn chọn học sẽ được nhắc ôn vào ngày mai, rồi thưa dần khi bạn đã nhớ." }));
    return;
  }

  if (learn.phase === "check") {
    const w = learn.checkList[learn.q];
    root.append(
      h("div", { class: "spread" }, h("div", { class: "stack", style: "gap:4px" },
        h("p", { class: "eyebrow", text: "Kiểm tra nhanh" }),
        h("h2", { text: "Câu " + (learn.q + 1) + " trên " + learn.checkList.length })), back));
    root.append(mcq({
      prompt: h("div", { class: "stack", style: "gap:6px" },
        h("p", { class: "muted", text: "Từ này nghĩa là gì?" }),
        h("div", { class: "row" }, h("span", { class: "headword en", lang: "en", style: "font-size:34px", text: w.w }), speakBtn(w.w))),
      answer: w.vi,
      options: meaningOptions(w),
      onNext: (ok) => {
        if (ok) learn.right++;
        learn.q++;
        if (learn.q >= learn.checkList.length) learn.phase = "done";
        renderCurrent();
      },
    }));
    return;
  }

  const left = topicWords(state.topic).filter((x) => !state.cards[x.id]).length;
  root.append(
    h("div", { class: "sheet stack pop" },
      h("p", { class: "eyebrow", text: "Xong lượt học" }),
      h("h2", { text: learn.added.length ? "Bạn vừa học " + learn.added.length + " từ mới" : "Bạn đã biết hết các từ này" }),
      learn.added.length ? h("p", { text: "Kiểm tra nhanh: đúng " + learn.right + "/" + learn.added.length + ". Ngày mai nhớ vào mục Ôn tập để ôn lại nhé." }) : null,
      learn.known.length ? h("p", { class: "muted small", text: learn.known.length + " từ bạn đã biết sẽ được hỏi lại sau 2 tuần để chắc chắn." }) : null,
      h("div", { class: "grid-2" },
        left ? h("button", { class: "btn", type: "button", text: "Học tiếp " + Math.min(5, left) + " từ", onclick: startLearn }) : null,
        h("button", { class: "btn ghost", type: "button", text: "Về trang Hôm nay", onclick: () => { learn = null; show("today"); } }))));
};

// Câu hỏi trắc nghiệm dùng chung
function meaningOptions(w) {
  const others = shuffle(Object.values(WORDS).filter((x) => x.id !== w.id && x.vi !== w.vi));
  const same = others.filter((x) => x.p === w.p);
  const picked = [];
  for (const x of same.concat(others)) {
    if (picked.length === 3) break;
    if (!picked.includes(x.vi)) picked.push(x.vi);
  }
  return shuffle([w.vi, ...picked]);
}
function wordOptions(w) {
  const others = shuffle(Object.values(WORDS).filter((x) => x.id !== w.id && x.w.toLowerCase() !== w.w.toLowerCase()));
  const same = others.filter((x) => x.p === w.p);
  const picked = [];
  for (const x of same.concat(others)) {
    if (picked.length === 3) break;
    if (!picked.includes(x.w)) picked.push(x.w);
  }
  return shuffle([w.w, ...picked]);
}

function mcq({ prompt, answer, options, onNext, en, after }) {
  const box = h("div", { class: "panel stack pop" }, prompt);
  const fb = h("p", { class: "feedback", role: "status" });
  const next = h("button", { class: "btn block", type: "button", text: "Câu tiếp theo", hidden: true });
  let ok = false;
  const list = h("div", { class: "options" }, options.map((opt) => h("button", {
    class: "option" + (en ? " en" : ""), type: "button", lang: en ? "en" : null, text: opt,
    onclick: (e) => {
      ok = opt === answer;
      for (const b of $$(".option", list)) {
        b.disabled = true;
        if (b.textContent === answer) b.classList.add("correct");
      }
      if (!ok) e.currentTarget.classList.add("wrong");
      fb.className = "feedback " + (ok ? "ok" : "no");
      fb.textContent = ok ? "Chính xác!" : "Chưa đúng. Đáp án: " + answer;
      if (after) after(ok);
      next.hidden = false;
      next.focus();
    },
  })));
  next.addEventListener("click", () => onNext(ok));
  box.append(list, fb, next);
  return box;
}

// ---------- Ôn tập ----------
let review = null;

function startReview() {
  const q = dueIds();
  review = q.length ? { queue: q, total: q.length, done: 0, flipped: false, lapsed: new Set(), tally: { again: 0, hard: 0, good: 0, easy: 0 } } : null;
  show("review");
  if (review && state.auto) speak(WORDS[review.queue[0]].w);
}

function rate(grade) {
  const id = review.queue[0];
  applyGrade(id, grade, review.lapsed.has(id));
  review.tally[grade]++;
  todayLog().r++;
  review.queue.shift();
  if (grade === "again") {
    review.lapsed.add(id);
    review.queue.splice(Math.min(3, review.queue.length), 0, id);
  } else {
    review.done++;
  }
  review.flipped = false;
  commit();
  renderCurrent();
  if (review.queue.length && state.auto) speak(WORDS[review.queue[0]].w);
}

RENDER.review = () => {
  const root = $("#view-review");
  root.replaceChildren();
  if (!review) {
    const due = dueIds();
    if (due.length) { startReview(); return; }
    const upcoming = Object.values(state.cards).map((c) => c.d).sort()[0];
    root.append(h("div", { class: "sheet stack" },
      h("p", { class: "eyebrow", text: "Ôn tập" }),
      h("h2", { text: "Không có từ nào cần ôn lúc này" }),
      h("p", { class: "muted", text: upcoming
        ? "Lượt ôn tiếp theo: " + inDaysText(daysBetween(dayKey(), upcoming)) + ". Trong lúc chờ, học thêm vài từ mới nhé."
        : "Hãy học vài từ mới trước. Từ nào bạn học hôm nay sẽ được nhắc ôn vào ngày mai." }),
      h("button", { class: "btn", type: "button", text: "Học từ mới", onclick: () => show("today") })));
    return;
  }
  if (!review.queue.length) {
    const t = review.tally;
    root.append(h("div", { class: "sheet stack pop" },
      h("p", { class: "eyebrow", text: "Hoàn thành" }),
      h("h2", { text: "Bạn đã ôn xong " + review.total + " từ" }),
      h("p", { text: "Nhớ: " + (t.good + t.easy) + " · Khó: " + t.hard + " · Quên: " + t.again }),
      h("p", { class: "muted small", text: "Từ bạn nhớ tốt sẽ được hỏi lại thưa dần: 3 ngày, 1 tuần, 2 tuần, rồi 1 tháng." }),
      h("div", { class: "grid-2" },
        h("button", { class: "btn", type: "button", text: "Luyện tập thêm", onclick: () => show("practice") }),
        h("button", { class: "btn ghost", type: "button", text: "Về trang Hôm nay", onclick: () => { review = null; show("today"); } }))));
    return;
  }
  const id = review.queue[0];
  const w = WORDS[id];
  const card = state.cards[id];
  root.append(
    h("div", { class: "spread" },
      h("div", { class: "stack", style: "gap:4px" },
        h("p", { class: "eyebrow", text: "Ôn tập" }),
        h("h2", { text: "Còn " + review.queue.length + " thẻ" })),
      h("span", { class: "small muted kbd-hint", text: "Phím tắt: Space lật thẻ, phím 1–4 để chấm" })),
    wordSheet(w, {
      reveal: review.flipped,
      meta: review.lapsed.has(id) ? "Ôn lại" : "Hộp " + (card ? card.b : 1),
      onReveal: () => { review.flipped = true; renderCurrent(); },
    }));
  if (review.flipped) {
    const lapsed = review.lapsed.has(id);
    const btn = (grade, cls, label) => {
      const { wait } = nextSchedule(card, grade, lapsed);
      return h("button", { class: cls, type: "button", onclick: () => rate(grade) }, label, h("small", { text: wait <= 1 ? "1 ngày" : wait + " ngày" }));
    };
    root.append(h("div", { class: "rate" },
      btn("again", "again", "Quên"), btn("hard", "hard", "Khó"), btn("good", "good", "Nhớ"), btn("easy", "easy", "Dễ")));
  }
};

document.addEventListener("keydown", (e) => {
  if (current !== "review" || !review || !review.queue.length) return;
  if (e.target.closest("input, textarea, select")) return;
  if (!review.flipped && (e.key === " " || e.key === "Enter")) { e.preventDefault(); review.flipped = true; renderCurrent(); }
  else if (review.flipped && ["1", "2", "3", "4"].includes(e.key)) rate(["again", "hard", "good", "easy"][Number(e.key) - 1]);
});

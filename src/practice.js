// ---------- Luyện tập ----------
const MODES = [
  { id: "mean", label: "Chọn nghĩa" },
  { id: "word", label: "Chọn từ" },
  { id: "listen", label: "Nghe chọn từ", speech: true },
  { id: "spell", label: "Nghe và viết" },
];
let quiz = null;
let quizMode = "mean";

function practicePool() {
  const learned = Object.keys(state.cards).map((id) => WORDS[id]).filter(Boolean);
  if (learned.length >= 4) return { words: learned, note: "" };
  return { words: topicWords(state.topic), note: "Bạn mới học " + learned.length + " từ, nên bài này lấy từ chủ đề " + topicName(state.topic) + "." };
}

function startQuiz(mode) {
  quizMode = mode || quizMode;
  const { words, note } = practicePool();
  const list = shuffle(words).slice(0, Math.min(10, words.length));
  quiz = { list, i: 0, right: 0, wrong: [], note, hint: 0 };
  renderCurrent();
}

function markWrong(w) {
  quiz.wrong.push(w);
  const c = state.cards[w.id];
  if (c) { c.d = dayKey(); commit(); }
}

function finishQuestion(ok, w) {
  if (ok) quiz.right++; else markWrong(w);
}

function nextQuestion() {
  quiz.i++;
  quiz.hint = 0;
  if (quiz.i >= quiz.list.length) { todayLog().q++; commit(); }
  renderCurrent();
}

RENDER.practice = () => {
  const modes = $("#modes");
  modes.replaceChildren(...MODES.filter((m) => !m.speech || speech.ok).map((m) => h("button", {
    class: "chip", type: "button", "aria-pressed": String(m.id === quizMode), text: m.label,
    onclick: () => startQuiz(m.id),
  })));
  const root = $("#quiz");
  root.replaceChildren();
  if (!quiz) { startQuiz(); return; }

  if (quiz.i >= quiz.list.length) {
    root.append(h("div", { class: "sheet stack pop" },
      h("p", { class: "eyebrow", text: "Kết quả" }),
      h("div", { class: "score", text: quiz.right + "/" + quiz.list.length }),
      h("p", { text: quiz.right === quiz.list.length ? "Tuyệt vời, không sai câu nào!" : quiz.right >= quiz.list.length * 0.7 ? "Tốt lắm! Xem lại mấy từ sai bên dưới nhé." : "Cần ôn thêm một chút. Các từ sai đã được đưa vào lượt ôn hôm nay." }),
      quiz.wrong.length ? h("div", { class: "stack", style: "gap:6px" },
        h("p", { class: "eyebrow", text: "Từ cần xem lại" }),
        quiz.wrong.map((w) => h("div", { class: "row" }, h("b", { class: "en", lang: "en", text: w.w }), h("span", { class: "muted", text: "· " + w.vi })))) : null,
      h("div", { class: "grid-2" },
        h("button", { class: "btn", type: "button", text: "Làm bài mới", onclick: () => startQuiz() }),
        dueIds().length ? h("button", { class: "btn ghost", type: "button", text: "Ôn các từ cần ôn", onclick: () => { review = null; show("review"); } }) : null)));
    return;
  }

  const w = quiz.list[quiz.i];
  const head = h("div", { class: "spread" },
    h("span", { class: "eyebrow", text: "Câu " + (quiz.i + 1) + " / " + quiz.list.length }),
    h("span", { class: "small muted", text: "Đúng " + quiz.right }));
  root.append(head);
  if (quiz.note && quiz.i === 0) root.append(h("p", { class: "notice", text: quiz.note }));

  if (quizMode === "mean") {
    root.append(mcq({
      prompt: h("div", { class: "stack", style: "gap:6px" }, h("p", { class: "muted", text: "Chọn nghĩa đúng của từ:" }),
        h("div", { class: "row" }, h("span", { class: "headword en", lang: "en", style: "font-size:34px", text: w.w }), speakBtn(w.w))),
      answer: w.vi, options: meaningOptions(w), after: (ok) => finishQuestion(ok, w), onNext: nextQuestion,
    }));
  } else if (quizMode === "word" || quizMode === "listen") {
    const listen = quizMode === "listen";
    const prompt = listen
      ? h("div", { class: "stack", style: "gap:10px" }, h("p", { class: "muted", text: "Nghe và chọn từ bạn nghe được:" }),
          h("div", { class: "row" },
            h("button", { class: "btn", type: "button", html: SPEAKER + " Nghe", onclick: () => speak(w.w) }),
            h("button", { class: "btn ghost sm", type: "button", text: "Nghe chậm", onclick: () => speak(w.w, true) })))
      : h("div", { class: "stack", style: "gap:6px" }, h("p", { class: "muted", text: "Từ tiếng Anh nào có nghĩa là:" }),
          h("p", { class: "meaning", text: w.vi }));
    root.append(mcq({
      prompt, en: true, answer: w.w, options: wordOptions(w),
      after: (ok) => { finishQuestion(ok, w); speak(w.w); }, onNext: nextQuestion,
    }));
    if (listen) setTimeout(() => speak(w.w), 150);
  } else {
    root.append(spellQuestion(w));
    if (speech.ok) setTimeout(() => speak(w.w), 150);
  }
};

function spellQuestion(w) {
  const norm = (s) => String(s).toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z' -]/g, "").replace(/\s+/g, " ").trim();
  const input = h("input", { class: "input en", id: "spell-input", autocapitalize: "off", autocomplete: "off", spellcheck: "false", placeholder: "Gõ từ bạn nghe được" });
  const fb = h("p", { class: "feedback", role: "status" });
  const hintEl = h("p", { class: "en muted", lang: "en", style: "letter-spacing:.2em;font-size:20px" });
  const showHint = () => {
    quiz.hint = Math.min(quiz.hint + 1, w.w.length);
    hintEl.textContent = w.w.split("").map((ch, i) => (ch === " " ? " " : i < quiz.hint ? ch : "_")).join("");
  };
  let answered = false;
  const next = h("button", { class: "btn block", type: "button", text: "Câu tiếp theo", hidden: true, onclick: nextQuestion });
  const check = () => {
    if (answered) { nextQuestion(); return; }
    if (!input.value.trim()) { input.focus(); return; }
    answered = true;
    const ok = norm(input.value) === norm(w.w);
    finishQuestion(ok, w);
    input.disabled = true;
    fb.className = "feedback " + (ok ? "ok" : "no");
    fb.textContent = ok ? "Chính xác!" : "Chưa đúng. Viết đúng là: " + w.w;
    hintEl.textContent = "";
    checkBtn.hidden = true;
    hintBtn.hidden = true;
    next.hidden = false;
    next.focus();
  };
  const checkBtn = h("button", { class: "btn", type: "submit", text: "Kiểm tra" });
  const hintBtn = h("button", { class: "btn ghost", type: "button", text: "Gợi ý chữ cái", onclick: showHint });
  const form = h("form", { class: "panel stack pop", autocomplete: "off", onsubmit: (e) => { e.preventDefault(); check(); } },
    h("p", { class: "muted", text: speech.ok ? "Nghe rồi viết lại từ tiếng Anh. Nghĩa của từ:" : "Viết từ tiếng Anh có nghĩa:" }),
    h("p", { class: "meaning", text: w.vi }),
    speech.ok ? h("div", { class: "row" },
      h("button", { class: "btn ghost sm", type: "button", html: SPEAKER + " Nghe lại", onclick: () => speak(w.w) }),
      h("button", { class: "btn ghost sm", type: "button", text: "Nghe chậm", onclick: () => speak(w.w, true) })) : null,
    input, hintEl, fb,
    h("div", { class: "row" }, checkBtn, hintBtn), next);
  setTimeout(() => input.focus(), 50);
  return form;
}

// ---------- Sổ từ ----------
const FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "new", label: "Chưa học" },
  { id: "learning", label: "Đang học" },
  { id: "known", label: "Đã thuộc" },
  { id: "mine", label: "Từ của tôi" },
];
let wlFilter = "all";
let pendingDelete = null;
const STATUS_TEXT = { new: "Chưa học", learning: "Đang học", known: "Đã thuộc" };

RENDER.words = () => {
  const all = Object.values(WORDS);
  const count = (f) => all.filter((w) => matchFilter(w, f)).length;
  $("#wl-filter").replaceChildren(...FILTERS.map((f) => h("button", {
    class: "chip", type: "button", "aria-pressed": String(f.id === wlFilter), text: f.label + " · " + count(f.id),
    onclick: () => { wlFilter = f.id; RENDER.words(); },
  })));
  $("#wl-title").textContent = FILTERS.find((f) => f.id === wlFilter).label;
  const q = plain($("#search").value.trim());
  const shown = all.filter((w) => matchFilter(w, wlFilter) && (!q || plain(w.w).includes(q) || plain(w.vi).includes(q)));
  const list = $("#wordlist");
  list.replaceChildren();
  if (!shown.length) {
    list.append(h("p", { class: "muted", style: "padding-block:16px", text: wlFilter === "mine" && !q ? "Bạn chưa thêm từ nào. Bấm “+ Thêm từ của bạn” để ghi lại từ mới gặp." : "Không có từ nào khớp." }));
    return;
  }
  const groups = ["mine", ...TOPICS.map((t) => t.id)];
  for (const g of groups) {
    const ws = shown.filter((w) => w.topic === g);
    if (!ws.length) continue;
    list.append(h("div", { class: "wl-group eyebrow", text: topicName(g) + " · " + ws.length }));
    for (const w of ws) list.append(wordRow(w));
  }
};

function matchFilter(w, f) {
  if (f === "all") return true;
  if (f === "mine") return w.topic === "mine";
  return status(w.id) === f;
}

function wordRow(w) {
  const st = status(w.id);
  const row = h("div", { class: "wl-row" },
    h("div", { class: "wl-main" },
      h("div", null, h("span", { class: "wl-word", lang: "en", text: w.w }), w.ipa ? h("span", { class: "wl-ipa", lang: "en", text: "/" + w.ipa + "/" }) : null),
      h("div", { class: "wl-vi", text: (POS_VI[w.p] || "") + " · " + w.vi })),
    h("span", { class: "pill " + st, text: STATUS_TEXT[st] }),
    speakBtn(w.w, "Nghe từ " + w.w));
  if (w.topic === "mine") {
    const confirming = pendingDelete === w.id;
    row.append(h("button", {
      class: "btn sm " + (confirming ? "" : "ghost"), type: "button", text: confirming ? "Xóa?" : "Xóa",
      "aria-label": "Xóa từ " + w.w,
      onclick: () => {
        if (!confirming) { pendingDelete = w.id; RENDER.words(); return; }
        state.custom = state.custom.filter((c) => c.id !== w.id);
        delete state.cards[w.id];
        pendingDelete = null;
        buildIndex();
        commit();
        renderCurrent();
        toast("Đã xóa “" + w.w + "” khỏi sổ.");
      },
    }));
  }
  return row;
}

function openAddForm(open) {
  const form = $("#add-form");
  form.hidden = !open;
  $("#btn-add").hidden = open;
  $("#f-status").textContent = "";
  if (open) $("#f-word").focus();
}

function saveCustomWord(e) {
  e.preventDefault();
  const word = $("#f-word").value.trim().replace(/\s+/g, " ");
  const vi = $("#f-vi").value.trim();
  if (!word || !vi) { $("#f-status").textContent = "Cần điền từ tiếng Anh và nghĩa tiếng Việt."; return; }
  if (Object.values(WORDS).some((w) => w.w.toLowerCase() === word.toLowerCase())) {
    $("#f-status").textContent = "“" + word + "” đã có trong sổ rồi.";
    return;
  }
  const item = {
    id: "u" + Date.now().toString(36), w: word, p: $("#f-pos").value,
    ipa: $("#f-ipa").value.trim().replace(/^\/|\/$/g, ""), vi,
    ex: $("#f-ex").value.trim(), exVi: $("#f-exvi").value.trim(),
  };
  state.custom.push(item);
  buildIndex();
  addCard(item.id, false);
  todayLog().n++;
  commit();
  $("#add-form").reset();
  $("#f-status").textContent = "Đã lưu “" + word + "”. Từ này sẽ có trong lượt ôn ngày mai.";
  $("#f-word").focus();
  renderCurrent();
}

// ---------- AI: chấm câu & điền từ tự động ----------
let ai = { fn: null, ready: "pending", ctl: null };
let aiWordId = null;

async function initAI() {
  if (!window.claude || typeof window.claude.use !== "function") { aiOff(); return; }
  try { ai.fn = await window.claude.use("sample"); } catch { ai.fn = null; }
  if (!ai.fn) { aiOff(); return; }
  ai.ready = "yes";
  $("#f-ai").hidden = false;
}

function aiOff(msg) {
  ai.ready = "no";
  const off = $("#ai-off");
  if (msg) off.textContent = msg;
  off.hidden = false;
  $("#ai-check").disabled = true;
  $("#f-ai").hidden = true;
}

function aiErrorText(e) {
  const code = e && e.code;
  if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(code)) {
    aiOff("AI chưa được bật cho trang này. Bạn vẫn dùng được các phần học, ôn tập và luyện tập.");
    return "AI chưa được bật cho trang này.";
  }
  if (code === "rate_limited") return "Bạn đã dùng AI khá nhiều trong lúc này. Đợi một lát rồi thử lại nhé.";
  if (code === "session_expired") return "Phiên đăng nhập claude.ai đã hết hạn. Hãy đăng nhập lại rồi thử lại.";
  if (code === "refused") return "AI không trả lời được câu này. Hãy thử viết câu khác.";
  return "AI chưa trả lời được. Bấm “Chấm câu” để thử lại.";
}

function aiPool() {
  const learned = Object.keys(state.cards).map((id) => WORDS[id]).filter(Boolean);
  return learned.length ? learned : topicWords(state.topic);
}
function pickAiWord() {
  const pool = aiPool();
  const others = pool.filter((w) => w.id !== aiWordId);
  const w = shuffle(others.length ? others : pool)[0];
  aiWordId = w ? w.id : null;
  RENDER.ai();
}

RENDER.ai = () => {
  if (!aiWordId || !WORDS[aiWordId]) { const w = shuffle(aiPool())[0]; aiWordId = w ? w.id : null; }
  const w = WORDS[aiWordId];
  $("#ai-word").textContent = w ? w.w : "";
  $("#ai-word-vi").textContent = w ? "(" + w.vi + ")" : "";
  $("#ai-input").placeholder = w && w.ex ? "Ví dụ: " + w.ex : "Viết một câu tiếng Anh";
};

async function checkSentence(e) {
  e.preventDefault();
  const sentence = $("#ai-input").value.trim();
  const w = WORDS[aiWordId];
  const out = $("#ai-result");
  if (!sentence) { $("#ai-input").focus(); return; }
  if (ai.ready === "pending") { toast("AI đang khởi động, thử lại sau vài giây nhé."); return; }
  if (ai.ready !== "yes") return;

  const prompt = [
    "You are a warm, encouraging English teacher for Vietnamese learners (A2-B1 level).",
    "Target word: \"" + w.w + "\" (" + (POS_VI[w.p] || w.p) + ", nghĩa: " + w.vi + ").",
    "Student's sentence: \"\"\"" + sentence.slice(0, 400) + "\"\"\"",
    "Check grammar, spelling, word choice and whether the target word (or a form of it) is used correctly and naturally.",
    "If the target word is missing, verdict is \"incorrect\" and say so in the explanation.",
    "Reply with only one JSON object, no other text:",
    "{\"verdict\": \"correct\" | \"almost\" | \"incorrect\", \"corrected\": \"the corrected sentence (same as the student's if already correct)\", \"explanation\": [\"1 to 3 short points in simple Vietnamese\"], \"natural\": \"one natural example sentence using the target word\", \"natural_vi\": \"Vietnamese translation of natural\"}",
  ].join("\n");

  ai.ctl = new AbortController();
  $("#ai-check").disabled = true;
  $("#ai-stop").hidden = false;
  out.replaceChildren(h("div", { class: "panel row" }, h("span", { class: "thinking", "aria-hidden": "true" }, h("i"), h("i"), h("i")), h("span", { class: "muted", text: "AI đang đọc câu của bạn…" })));
  try {
    const r = await ai.fn.json(prompt, { modelTier: "quick", signal: ai.ctl.signal });
    renderVerdict(sentence, r);
    todayLog().s++;
    commit();
    renderChrome();
  } catch (err) {
    if (err && err.code === "cancelled") out.replaceChildren();
    else out.replaceChildren(h("p", { class: "notice", text: aiErrorText(err) }));
  } finally {
    ai.ctl = null;
    $("#ai-stop").hidden = true;
    if (ai.ready === "yes") $("#ai-check").disabled = false;
  }
}

function renderVerdict(original, r) {
  const out = $("#ai-result");
  const v = r && typeof r === "object" ? r : {};
  const verdict = ["correct", "almost", "incorrect"].includes(v.verdict) ? v.verdict : "almost";
  const label = { correct: ["ok", "Đúng rồi!"], almost: ["almost", "Gần đúng"], incorrect: ["no", "Chưa đúng"] }[verdict];
  const corrected = typeof v.corrected === "string" ? v.corrected.trim() : "";
  const points = (Array.isArray(v.explanation) ? v.explanation : [v.explanation]).filter((x) => typeof x === "string" && x.trim()).slice(0, 4);
  const natural = typeof v.natural === "string" ? v.natural.trim() : "";
  const changed = corrected && corrected !== original;
  out.replaceChildren(h("div", { class: "sheet stack pop" },
    h("span", { class: "verdict " + label[0], text: label[1] }),
    changed ? h("div", { class: "stack", style: "gap:4px" },
      h("p", { class: "eyebrow", text: "Câu của bạn" }),
      h("p", { class: "fix", lang: "en" }, h("del", { text: original })),
      h("p", { class: "eyebrow", text: "Câu đã sửa" }),
      h("div", { class: "row", style: "flex-wrap:nowrap;justify-content:space-between" }, h("p", { class: "fix", lang: "en", text: corrected }), speakBtn(corrected, "Nghe câu đã sửa"))) :
      h("div", { class: "row", style: "flex-wrap:nowrap;justify-content:space-between" }, h("p", { class: "fix", lang: "en", text: original }), speakBtn(original, "Nghe câu của bạn")),
    points.length ? h("ul", { class: "bullets" }, points.map((p) => h("li", { text: p }))) : null,
    natural ? h("div", { class: "example" },
      h("p", { class: "eyebrow", text: "Thêm một cách nói tự nhiên" }),
      h("div", { class: "row", style: "flex-wrap:nowrap;justify-content:space-between;align-items:flex-start" }, h("span", { class: "en", lang: "en", text: natural }), speakBtn(natural, "Nghe câu mẫu")),
      typeof v.natural_vi === "string" ? h("span", { class: "vi", text: v.natural_vi }) : null) : null,
    h("div", { class: "row" },
      h("button", { class: "btn sm", type: "button", text: "Viết câu khác", onclick: () => { $("#ai-input").value = ""; $("#ai-input").focus(); } }),
      h("button", { class: "btn sm ghost", type: "button", text: "Đổi từ khác", onclick: () => { $("#ai-input").value = ""; out.replaceChildren(); pickAiWord(); } }))));
}

async function aiFillWord() {
  const word = $("#f-word").value.trim();
  const st = $("#f-status");
  if (!word) { st.textContent = "Gõ từ tiếng Anh trước, rồi bấm “Điền bằng AI”."; $("#f-word").focus(); return; }
  if (ai.ready !== "yes") { st.textContent = "AI chưa sẵn sàng, hãy tự điền nhé."; return; }
  const btn = $("#f-ai");
  btn.disabled = true;
  st.textContent = "AI đang tra từ…";
  const prompt = [
    "For the English word or phrase \"" + word.slice(0, 60) + "\", give dictionary info for a Vietnamese learner.",
    "Reply with only one JSON object, no other text:",
    "{\"word\": \"correct spelling\", \"pos\": \"n\" | \"v\" | \"adj\" | \"adv\" | \"phr\", \"ipa\": \"American IPA without slashes\", \"vi\": \"short Vietnamese meaning, at most 6 words\", \"ex\": \"a short natural example sentence (A2-B1)\", \"exVi\": \"Vietnamese translation of the example\"}",
  ].join("\n");
  try {
    const r = await ai.fn.json(prompt, { modelTier: "quick" });
    const s = (x) => (typeof x === "string" ? x.trim() : "");
    if (s(r && r.word)) $("#f-word").value = s(r.word);
    if (["n", "v", "adj", "adv", "phr"].includes(r && r.pos)) $("#f-pos").value = r.pos;
    $("#f-ipa").value = s(r && r.ipa).replace(/^\/|\/$/g, "");
    $("#f-vi").value = s(r && r.vi);
    $("#f-ex").value = s(r && r.ex);
    $("#f-exvi").value = s(r && r.exVi);
    st.textContent = "Đã điền xong. Kiểm tra lại rồi bấm “Lưu vào sổ”.";
  } catch (err) {
    st.textContent = err && err.code === "cancelled" ? "" : aiErrorText(err);
  } finally {
    btn.disabled = false;
  }
}

// ---------- Khởi động ----------
function bind() {
  for (const t of $$(".tab")) t.addEventListener("click", () => {
    if (t.dataset.view === "review" && current !== "review") review = null;
    show(t.dataset.view);
  });
  $("#btn-learn").addEventListener("click", startLearn);
  $("#btn-review").addEventListener("click", startReview);
  $("#set-goal").addEventListener("change", (e) => { state.goal = Number(e.target.value); commit(); RENDER.today(); });
  $("#set-rate").addEventListener("change", (e) => { state.rate = Number(e.target.value); commit(); speak("Hello! Nice to meet you."); });
  $("#set-voice").addEventListener("change", (e) => { state.voice = e.target.value; commit(); speak("Hello! Nice to meet you."); });
  $("#set-auto").addEventListener("change", (e) => { state.auto = e.target.checked; commit(); });
  $("#btn-reset").addEventListener("click", () => { $("#reset-confirm").hidden = false; $("#btn-reset").hidden = true; });
  $("#btn-reset-no").addEventListener("click", () => { $("#reset-confirm").hidden = true; $("#btn-reset").hidden = false; });
  $("#btn-reset-yes").addEventListener("click", () => {
    const keep = { goal: state.goal, rate: state.rate, voice: state.voice, auto: state.auto };
    state = normalize(keep);
    buildIndex();
    learn = null; review = null; quiz = null;
    commit();
    $("#reset-confirm").hidden = true; $("#btn-reset").hidden = false;
    renderCurrent();
    toast("Đã xóa toàn bộ tiến độ.");
  });
  $("#btn-add").addEventListener("click", () => openAddForm(true));
  $("#f-cancel").addEventListener("click", () => openAddForm(false));
  $("#add-form").addEventListener("submit", saveCustomWord);
  $("#f-ai").addEventListener("click", aiFillWord);
  $("#search").addEventListener("input", () => RENDER.words());
  $("#ai-form").addEventListener("submit", checkSentence);
  $("#ai-next").addEventListener("click", () => { $("#ai-result").replaceChildren(); pickAiWord(); });
  $("#ai-stop").addEventListener("click", () => { if (ai.ctl) ai.ctl.abort(); });
  if (!speech.ok) { $("#set-voice").closest(".field").hidden = true; $("#set-auto").closest("label").hidden = true; }
}

bind();
if (speech.ok) {
  loadVoices();
  try { speechSynthesis.addEventListener("voiceschanged", loadVoices); } catch { speechSynthesis.onvoiceschanged = loadVoices; }
}
const startView = ["today", "review", "practice", "words", "ai"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "today";
show(startView);
initCloud();
initAI();

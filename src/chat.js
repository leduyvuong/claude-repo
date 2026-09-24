// ---------- Trò chuyện nhập vai với AI ----------
const SCENARIOS = [
  { id: "cafe", title: "Gọi đồ ở quán cà phê", vi: "Bạn là khách, AI là nhân viên pha chế", role: "a friendly barista at a coffee shop", open: "Hi there! What can I get for you today?", sugg: ["Can I have an iced latte, please?", "What do you recommend?"] },
  { id: "friend", title: "Làm quen bạn mới", vi: "AI là Sam, bạn mới chuyển đến từ Canada", role: "Sam, a friendly Canadian who just moved to Vietnam", open: "Hey! I'm Sam. I just moved here from Canada. Are you from around here?", sugg: ["Yes, I grew up here. Nice to meet you!", "No, I'm from Da Nang. How do you like it here?"] },
  { id: "directions", title: "Hỏi đường", vi: "Bạn bị lạc ở London, AI là người dân địa phương", role: "a helpful local in London", open: "Excuse me, you look a bit lost. Can I help you?", sugg: ["Yes, please. How do I get to the station?", "I'm looking for the British Museum."] },
  { id: "hotel", title: "Nhận phòng khách sạn", vi: "AI là lễ tân khách sạn", role: "a hotel receptionist", open: "Good evening, and welcome to the Riverside Hotel. Do you have a reservation?", sugg: ["Yes, I booked a double room for two nights.", "No, do you have any rooms available?"] },
  { id: "interview", title: "Phỏng vấn xin việc", vi: "AI là người phỏng vấn, hỏi bằng tiếng Anh", role: "a kind job interviewer at a tech company", open: "Thanks for coming in today. Could you tell me a little about yourself?", sugg: ["Sure. I'm a marketing graduate with two years of experience.", "Of course. I'm a software developer from Hanoi."] },
  { id: "doctor", title: "Đi khám bệnh", vi: "AI là bác sĩ, bạn kể triệu chứng", role: "a caring doctor", open: "Hello, please have a seat. What seems to be the problem today?", sugg: ["I've had a bad headache for two days.", "I have a sore throat and a fever."] },
  { id: "shop", title: "Mua quần áo", vi: "AI là nhân viên cửa hàng thời trang", role: "a shop assistant in a clothing store", open: "Hi! Are you looking for anything in particular today?", sugg: ["I'm looking for a jacket.", "Just looking, thanks."] },
  { id: "free", title: "Nói chuyện tự do", vi: "Chủ đề gì cũng được, AI là bạn nói chuyện", role: "a friendly English conversation partner", open: "Hi! What would you like to talk about today?", sugg: ["Let's talk about travel.", "Can we talk about movies?"] },
];
let aiMode = "chat";
let chat = null;

function startChat(id) {
  const sc = SCENARIOS.find((s) => s.id === id);
  chat = { sc, msgs: [{ role: "ai", en: sc.open, sugg: sc.sugg }], busy: false, ctl: null };
  renderChat();
  if (state.auto) speak(sc.open);
}

function renderChat() {
  const root = $("#chat");
  if (!chat) {
    root.replaceChildren(
      h("p", { class: "muted", text: "Chọn một tình huống. AI sẽ nhập vai, trả lời bằng giọng nói, sửa lỗi câu của bạn và gợi ý cách đáp." }),
      h("div", { class: "scenarios" }, SCENARIOS.map((s) => h("button", { class: "scenario", type: "button", onclick: () => startChat(s.id) },
        h("strong", { text: s.title }), h("span", { class: "small muted", text: s.vi }), h("span", { class: "en scenario-open", lang: "en", text: "“" + s.open + "”" })))));
    return;
  }
  const list = h("div", { class: "chat-list", id: "chat-list" });
  for (const m of chat.msgs) {
    if (m.role === "ai") {
      const vi = h("p", { class: "bubble-vi", text: m.vi || "", hidden: true });
      list.append(h("div", { class: "msg ai pop" },
        h("div", { class: "avatar", "aria-hidden": "true", text: "AI" }),
        h("div", { class: "bubble" },
          h("p", { class: "en", lang: "en", text: m.en }),
          vi,
          h("div", { class: "bubble-tools" }, speakBtn(m.en, "Nghe câu này"),
            m.vi ? h("button", { class: "link-btn", type: "button", text: "Dịch", onclick: (e) => { vi.hidden = !vi.hidden; e.currentTarget.textContent = vi.hidden ? "Dịch" : "Ẩn dịch"; } }) : null))));
    } else {
      list.append(h("div", { class: "msg me pop" },
        h("div", { class: "bubble" }, h("p", { class: "en", lang: "en", text: m.en })),
        m.check ? h("div", { class: "fixbox " + (m.check.correct ? "ok" : "no") },
          m.check.correct ? h("span", { text: "✓ Câu của bạn ổn rồi" + (m.check.tip ? ". " + m.check.tip : "") })
            : [h("span", { class: "small", text: "Nên nói:" }), h("p", { class: "en", lang: "en", text: m.check.fixed }), m.check.tip ? h("p", { class: "small", text: m.check.tip }) : null]) : null));
    }
  }
  if (chat.busy) list.append(h("div", { class: "msg ai" }, h("div", { class: "avatar", text: "AI" }), h("div", { class: "bubble" }, h("span", { class: "thinking" }, h("i"), h("i"), h("i")))));
  const last = chat.msgs[chat.msgs.length - 1];
  const input = h("textarea", { class: "textarea en chat-input", id: "chat-input", rows: "2", maxlength: "300", placeholder: "Gõ câu trả lời bằng tiếng Anh…", disabled: chat.busy || ai.ready === "no" });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(input.value); } });
  root.replaceChildren(
    h("div", { class: "spread" }, h("div", null, h("p", { class: "eyebrow", text: "Tình huống" }), h("h3", { text: chat.sc.title })),
      h("button", { class: "btn sm ghost", type: "button", text: "Đổi tình huống", onclick: () => { if (chat.ctl) chat.ctl.abort(); chat = null; renderChat(); } })),
    list,
    last.role === "ai" && last.sugg && last.sugg.length && !chat.busy ? h("div", { class: "sugg" }, h("span", { class: "small muted", text: "Gợi ý:" }),
      last.sugg.slice(0, 3).map((s) => h("button", { class: "chip en", type: "button", lang: "en", text: s, onclick: () => { $("#chat-input").value = s; $("#chat-input").focus(); } }))) : null,
    h("div", { class: "chat-compose" }, input,
      chat.busy ? h("button", { class: "btn ghost", type: "button", text: "Dừng", onclick: () => chat.ctl && chat.ctl.abort() })
        : h("button", { class: "btn", type: "button", text: "Gửi", disabled: ai.ready === "no", onclick: () => sendChat($("#chat-input").value) })));
  list.scrollTop = list.scrollHeight;
}

async function sendChat(text) {
  text = String(text || "").trim();
  if (!text || chat.busy) return;
  if (ai.ready === "pending") { toast("AI đang khởi động, thử lại sau vài giây nhé."); return; }
  if (ai.ready !== "yes") return;
  const mine = { role: "me", en: text.slice(0, 300) };
  chat.msgs.push(mine);
  chat.busy = true;
  chat.ctl = new AbortController();
  renderChat();
  const history = chat.msgs.slice(-12).map((m) => (m.role === "ai" ? "You: " : "Learner: ") + m.en).join("\n");
  const prompt = [
    "You are role-playing as " + chat.sc.role + " in a conversation with a Vietnamese learner of English (A2-B1).",
    "Stay in character. Reply naturally in simple English, 1-2 short sentences, and usually end with a question to keep the conversation going.",
    "Also check the learner's LAST message for grammar, word choice and naturalness.",
    "Conversation so far:", history,
    "Reply with only one JSON object:",
    "{\"reply\": \"your next line in English\", \"reply_vi\": \"Vietnamese translation of reply\", \"correct\": true or false, \"fixed\": \"a corrected, natural version of the learner's last message (same text if already fine)\", \"tip_vi\": \"one short tip in simple Vietnamese about the learner's mistake, or empty string\", \"suggestions\": [\"two short possible learner replies to your reply\"]}",
  ].join("\n");
  try {
    const r = await ai.fn.json(prompt, { modelTier: "quick", cache: false, signal: chat.ctl.signal });
    const s = (x) => (typeof x === "string" ? x.trim() : "");
    mine.check = { correct: r && r.correct !== false, fixed: s(r && r.fixed) || text, tip: s(r && r.tip_vi) };
    if (!mine.check.correct && mine.check.fixed.toLowerCase() === text.toLowerCase()) mine.check.correct = true;
    const reply = s(r && r.reply) || "Sorry, could you say that again?";
    chat.msgs.push({ role: "ai", en: reply, vi: s(r && r.reply_vi), sugg: Array.isArray(r && r.suggestions) ? r.suggestions.filter((x) => typeof x === "string").slice(0, 3) : [] });
    state.chats = (state.chats || 0) + 1;
    todayLog().s++;
    gainXP(mine.check.correct ? 10 : 6);
    commit();
    mine.check.correct ? sfx.good() : sfx.flip();
    if (state.auto) speak(reply);
  } catch (err) {
    if (!(err && err.code === "cancelled")) toast(aiErrorText(err));
    if (!mine.check) chat.msgs.pop();
    if (err && err.code === "cancelled") { chat.busy = false; chat.ctl = null; renderChat(); $("#chat-input").value = text; return; }
  }
  chat.busy = false;
  chat.ctl = null;
  renderChat();
  renderChrome();
}

function applyAiMode() {
  const chatMode = aiMode === "chat";
  for (const b of $$("#ai-seg button")) b.setAttribute("aria-selected", String(b.dataset.mode === aiMode));
  $("#chat").hidden = !chatMode;
  $("#ai-form").hidden = chatMode;
  $("#ai-result").hidden = chatMode;
  const head = $("#view-ai > .stack");
  $(".eyebrow", head).textContent = chatMode ? "Nói với AI" : "Luyện viết cùng AI";
  $("h2", head).textContent = chatMode ? "Trò chuyện nhập vai bằng tiếng Anh" : "Tự đặt câu, AI sửa và giải thích";
  $("p.muted", head).hidden = chatMode;
  if (chatMode) renderChat();
}
{
  const _ai = RENDER.ai;
  RENDER.ai = () => { _ai(); applyAiMode(); };
  for (const b of $$("#ai-seg button")) b.addEventListener("click", () => { aiMode = b.dataset.mode; applyAiMode(); });
}
if (current === "ai") applyAiMode();

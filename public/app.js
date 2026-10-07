const $ = (s) => document.querySelector(s);
const html = (t) => DOMPurify.sanitize(marked.parse(String(t ?? "")));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const SECTIONS = [
  ["core_problem", "Core Problem"], ["methodology", "Architecture / Methodology"],
  ["key_findings", "Key Findings"], ["tradeoffs", "Technical Trade-offs"],
];
const STAGES = ["parsing", "analyzing", "saving"];
let currentId = location.hash.slice(1) || null;
let timer = null, focusKey = null, busy = false, suggestions = [];

async function api(path, opts) {
  const r = await fetch(path, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}

/* ---------- library ---------- */
async function loadLibrary() {
  const papers = await api("/api/papers");
  $("#library").innerHTML = papers.map((p) => `
    <div class="item ${p.id === currentId ? "active" : ""}" data-id="${p.id}">
      <b>${esc(p.title || p.filename)}</b>
      ${p.status === "done" ? `<small>${esc(p.one_liner)}</small>` : `<span class="tag ${p.status}">${p.status}</span>`}
    </div>`).join("") || `<p class="empty">No papers yet.</p>`;
  document.querySelectorAll(".item").forEach((el) => (el.onclick = () => open(el.dataset.id)));
}

/* ---------- loader ---------- */
function showLoader(stage) {
  $("#loader").hidden = false;
  const idx = Math.max(0, STAGES.indexOf(stage));
  document.querySelectorAll("#loader-steps li").forEach((li) => {
    const i = STAGES.indexOf(li.dataset.s);
    li.className = i < idx ? "done" : i === idx ? "active" : "";
  });
}
const hideLoader = () => ($("#loader").hidden = true);

/* ---------- paper view ---------- */
async function open(id) {
  currentId = id; location.hash = id; focusKey = null;
  clearTimeout(timer);
  await render();
  loadLibrary();
}

function welcome() {
  $("#main").className = "welcome";
  $("#main").innerHTML = `<div><h1>Understand any paper in minutes</h1><p>Upload a research paper or white paper. PaperPulse extracts structured notes and lets you question it like a tutor.</p></div>`;
}

async function render() {
  let p;
  try { p = await api(`/api/papers/${currentId}`); } catch { currentId = null; return welcome(); }
  if (p.status === "processing") {
    showLoader(p.stage);
    timer = setTimeout(async () => { await render(); loadLibrary(); }, 2000);
    return;
  }
  hideLoader();
  if (p.status === "error") {
    $("#main").className = "welcome";
    $("#main").innerHTML = `<div><h1>Couldn’t process ${esc(p.filename)}</h1><p>${esc(p.error)}</p></div>`;
    return;
  }
  const n = p.notes;
  suggestions = n.suggested_questions || [];
  const sections = SECTIONS.map(([k, label]) => `
    <section class="card">
      <div class="card-head"><h2>${label}</h2><button class="ask" data-k="${k}">Ask about this</button></div>
      <div class="prose">${html(Array.isArray(n[k]) ? n[k].map((x) => `- ${x}`).join("\n") : n[k])}</div>
    </section>`).join("");
  const terms = (n.key_terms || []).length ? `
    <section class="card"><div class="card-head"><h2>Key Terms</h2></div>
      <dl class="terms">${n.key_terms.map((t) => `<div><dt>${esc(t.term)}</dt><dd>${esc(t.definition)}</dd></div>`).join("")}</dl>
    </section>` : "";
  $("#main").className = "";
  $("#main").innerHTML = `
    <div class="notes"><div class="notes-inner">
      <h1>${esc(n.title)}</h1><p class="lede">${esc(n.one_liner)}</p>${sections}${terms}
    </div></div>
    <div class="chat">
      <div class="chat-head"><span class="dot"></span>Ask the paper</div>
      <div id="msgs"></div>
      <div class="composer">
        <div id="focus"></div>
        <div class="input-wrap">
          <textarea id="q" rows="1" placeholder="Ask a follow-up question…"></textarea>
          <button id="send" aria-label="Send">➤</button>
        </div>
        <div class="hint">Enter to send · Shift+Enter for new line</div>
      </div>
    </div>`;
  document.querySelectorAll(".ask").forEach((b) => (b.onclick = () => setFocus(b.dataset.k)));
  const q = $("#q");
  q.oninput = () => { q.style.height = "auto"; q.style.height = q.scrollHeight + "px"; };
  q.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  $("#send").onclick = send;
  const history = await api(`/api/papers/${currentId}/chat`);
  if (!history.length) emptyChat();
  history.forEach((m) => addMsg(m.role, m.content));
}

function emptyChat() {
  $("#msgs").innerHTML = `<div class="chat-empty"><b>Ask anything about this paper</b><div class="chips">
    ${suggestions.map((s) => `<button class="chip">${esc(s)}</button>`).join("")}</div></div>`;
  document.querySelectorAll(".chip").forEach((c) => (c.onclick = () => { $("#q").value = c.textContent; send(); }));
}

function setFocus(k) {
  focusKey = k;
  const label = SECTIONS.find(([x]) => x === k)[1];
  $("#focus").innerHTML = k ? `<div class="focus">Focused on: ${label}<button aria-label="Clear">×</button></div>` : "";
  if (k) $("#focus button").onclick = () => setFocus(null);
  $("#q").focus();
}

function addMsg(role, text, raw = false) {
  const empty = document.querySelector(".chat-empty"); if (empty) empty.remove();
  const d = document.createElement("div");
  d.className = `row ${role}`;
  d.innerHTML = `<div class="avatar">${role === "user" ? "You" : "AI"}</div><div class="bubble prose">${raw ? text : html(text)}</div>`;
  $("#msgs").appendChild(d); $("#msgs").scrollTop = $("#msgs").scrollHeight;
  return d.querySelector(".bubble");
}

async function send() {
  const q = $("#q"), message = q.value.trim();
  if (!message || busy) return;
  busy = true; $("#send").disabled = true;
  q.value = ""; q.style.height = "auto";
  addMsg("user", message);
  const bubble = addMsg("assistant", `<span class="typing"><i></i><i></i><i></i></span>`, true);
  try {
    const { answer } = await api(`/api/papers/${currentId}/chat`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, section: focusKey }),
    });
    bubble.innerHTML = html(answer);
  } catch (err) { bubble.textContent = "Something went wrong: " + err.message; }
  busy = false; $("#send").disabled = false; $("#msgs").scrollTop = $("#msgs").scrollHeight; q.focus();
}

/* ---------- upload ---------- */
$("#file").onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  $("#upload-label").textContent = "Uploading…"; showLoader("parsing");
  try {
    const fd = new FormData(); fd.append("file", f);
    const { id } = await api("/api/papers", { method: "POST", body: fd });
    await open(id);
  } catch (err) { hideLoader(); alert(err.message); }
  $("#upload-label").textContent = "+ Upload paper (PDF)"; e.target.value = "";
};

loadLibrary();
currentId ? open(currentId) : welcome();

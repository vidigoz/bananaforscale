/**
 * Banana for Scale — app.js
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL   = "claude-sonnet-4-20250514";

let imageBase64    = null;
let imageMediaType = "image/jpeg";

// ─── Arranque ────────────────────────────────────────────────────────────────
window.addEventListener("load", () => {
  setupDropZone();
  setupFileInput();

  if (!getApiKey()) {
    showApiKeyScreen();
  } else {
    showUploadScreen();
  }
});

// ─── API Key ─────────────────────────────────────────────────────────────────
function getApiKey() {
  return localStorage.getItem("bfs_api_key") || null;
}

function showApiKeyScreen() {
  document.getElementById("app-main").style.display    = "none";
  document.getElementById("apikey-screen").style.display = "flex";
}

function showUploadScreen() {
  document.getElementById("apikey-screen").style.display = "none";
  document.getElementById("app-main").style.display    = "block";
  setState("upload");
}

window.saveApiKey = function () {
  const input = document.getElementById("apikey-input");
  const key   = (input?.value || "").trim();
  if (!key) { setApiKeyError("Pega tu API key aquí."); return; }
  if (!key.startsWith("sk-ant-")) { setApiKeyError("La key debe empezar con sk-ant-…  Cópiala desde console.anthropic.com"); return; }
  localStorage.setItem("bfs_api_key", key);
  showUploadScreen();
};

window.clearApiKey = function () {
  localStorage.removeItem("bfs_api_key");
  document.getElementById("apikey-input").value = "";
  showApiKeyScreen();
};

function setApiKeyError(msg) {
  const el = document.getElementById("apikey-error");
  el.textContent = msg;
  el.style.display = "block";
}

// ─── Drag & Drop ─────────────────────────────────────────────────────────────
function setupDropZone() {
  const dz = document.getElementById("drop-zone");
  if (!dz) return;
  dz.addEventListener("dragover",  e => { e.preventDefault(); dz.classList.add("dragging"); });
  dz.addEventListener("dragleave", ()  => dz.classList.remove("dragging"));
  dz.addEventListener("drop", e => {
    e.preventDefault();
    dz.classList.remove("dragging");
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
}

function setupFileInput() {
  const fi = document.getElementById("file-input");
  if (!fi) return;
  fi.addEventListener("change", e => {
    const f = e.target.files[0];
    if (f) handleFile(f);
  });
}

function handleFile(file) {
  if (!file.type.startsWith("image/")) { showError("Sube un archivo de imagen (JPG, PNG, HEIC, WEBP)."); return; }
  imageMediaType = ["image/jpeg","image/png","image/webp","image/gif"].includes(file.type) ? file.type : "image/jpeg";
  const reader = new FileReader();
  reader.onload = e => {
    imageBase64 = e.target.result.split(",")[1];
    document.getElementById("preview-img").src = e.target.result;
    setState("preview");
    hideError();
  };
  reader.readAsDataURL(file);
}

// ─── State machine ────────────────────────────────────────────────────────────
function setState(state) {
  ["upload","preview","loading","result"].forEach(s => {
    const el = document.getElementById("state-" + s);
    if (el) el.classList.toggle("hidden", s !== state);
  });
}

// ─── Análisis ────────────────────────────────────────────────────────────────
window.analyzeImage = async function () {
  const apiKey = getApiKey();
  if (!apiKey) { showApiKeyScreen(); return; }
  if (!imageBase64) return;

  setState("loading");
  hideError();

  const msgs = ["Identificando alimentos…","Buscando banana para calibrar escala…","Estimando porciones…","Calculando macros…"];
  let mi = 0;
  const msgEl = document.getElementById("loading-msg");
  if (msgEl) msgEl.textContent = msgs[0];
  const interval = setInterval(() => { mi = (mi+1)%msgs.length; if(msgEl) msgEl.textContent = msgs[mi]; }, 2000);

  try {
    const raw    = await callClaude(apiKey);
    const result = parseJSON(raw);
    renderResult(result);
    setState("result");
  } catch (err) {
    console.error(err);
    setState("preview");
    if (err.message.includes("401") || err.message.includes("403")) {
      showError("API key inválida. Revísala en console.anthropic.com.");
      localStorage.removeItem("bfs_api_key");
    } else {
      showError("Error al analizar: " + err.message);
    }
  } finally {
    clearInterval(interval);
  }
};

async function callClaude(apiKey) {
  const prompt = `Eres un nutricionista experto. Analiza esta imagen de comida.

Si hay una banana: úsala como referencia de escala (~18 cm, ~120 g sin cáscara).
Si no: estima por contexto (plato estándar ~26 cm, cubiertos, etc.).

Responde ÚNICAMENTE con JSON válido, sin backticks, sin texto extra:

{
  "banana_detected": true,
  "banana_note": "breve nota en español",
  "foods": [
    { "name": "nombre en español", "estimated_weight_g": 150, "calories": 200, "protein_g": 10.0, "carbs_g": 25.0, "fat_g": 5.0 }
  ],
  "totals": { "calories": 200, "protein_g": 10.0, "carbs_g": 25.0, "fat_g": 5.0 },
  "confidence": 75,
  "confidence_reason": "razón breve"
}`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imageMediaType, data: imageBase64 } },
          { type: "text",  text: prompt },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content.map(b => b.type === "text" ? b.text : "").join("");
}

function parseJSON(text) {
  const clean = text.replace(/```json\s*/gi,"").replace(/```/g,"").trim();
  try { return JSON.parse(clean); }
  catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("No se pudo parsear la respuesta de la IA.");
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderResult(r) {
  document.getElementById("r-cal").textContent  = Math.round(r.totals.calories);
  document.getElementById("r-pro").textContent  = (+r.totals.protein_g).toFixed(1);
  document.getElementById("r-carb").textContent = (+r.totals.carbs_g).toFixed(1);
  document.getElementById("r-fat").textContent  = (+r.totals.fat_g).toFixed(1);

  document.getElementById("result-subtitle").textContent = r.banana_detected
    ? "🍌 Banana detectada — escala usada para mayor precisión"
    : "⚠️ Sin banana — estimación visual estándar";

  const list = document.getElementById("food-list");
  list.innerHTML = "";
  (r.foods || []).forEach(food => {
    const row = document.createElement("div");
    row.className = "food-row";
    row.innerHTML = `
      <span><span class="food-name">${esc(food.name)}</span><span class="food-weight">~${Math.round(food.estimated_weight_g)}g</span></span>
      <span class="food-cal">${Math.round(food.calories)} kcal</span>`;
    list.appendChild(row);
  });

  const conf = Math.round(r.confidence || 0);
  document.getElementById("confidence-pct").textContent = conf + "%";
  const fill = document.getElementById("confidence-fill");
  fill.style.width = conf + "%";
  fill.style.background = conf >= 70 ? "#7ecb72" : conf >= 45 ? "#f5d840" : "#e05c5c";
  document.getElementById("confidence-note").textContent =
    (r.banana_detected ? "🍌 Banana usada como referencia. " : "⚠️ Sin banana: ponla junto al plato. ")
    + (r.confidence_reason || "");
}

// ─── Reset ────────────────────────────────────────────────────────────────────
window.resetApp = function () {
  imageBase64 = null;
  const fi = document.getElementById("file-input");
  if (fi) fi.value = "";
  setState("upload");
  hideError();
};

// ─── Utils ────────────────────────────────────────────────────────────────────
function showError(msg) {
  const b = document.getElementById("error-box");
  if (b) { b.textContent = "⚠️ " + msg; b.classList.remove("hidden"); }
}
function hideError() {
  const b = document.getElementById("error-box");
  if (b) b.classList.add("hidden");
}
function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

/**
 * Banana for Scale — app.js
 * Maneja upload, preview, llamada a Claude Vision API, y render de resultados.
 *
 * IMPORTANTE: Este app requiere una API key de Anthropic.
 * La key se guarda SOLO en localStorage del navegador del usuario.
 * Nunca se envía a ningún servidor propio.
 */

// ─── Config ───────────────────────────────────────────────────────────────────
const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL   = "claude-opus-4-5"; // Cambia a claude-sonnet-4-20250514 para menor costo

// ─── Estado ───────────────────────────────────────────────────────────────────
let imageBase64   = null;
let imageMediaType = "image/jpeg";

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const dropZone    = document.getElementById("drop-zone");
const fileInput   = document.getElementById("file-input");

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupDropZone();
  setupFileInput();
  checkApiKey();
});

// ─── API Key management ───────────────────────────────────────────────────────
function checkApiKey() {
  // La key puede venir de: localStorage, o variable de entorno vía build tool.
  // Si no hay key, inyectamos un banner para pedírsela al usuario.
  const key = getApiKey();
  if (!key) {
    injectApiKeyBanner();
  }
}

function getApiKey() {
  // En producción: usar variable de entorno (Netlify/Vercel/CF Pages).
  // En desarrollo local: usar localStorage como fallback.
  return (
    window.__ANTHROPIC_KEY__ || // inyectada en build
    localStorage.getItem("bfs_api_key") ||
    null
  );
}

function injectApiKeyBanner() {
  const banner = document.createElement("div");
  banner.id = "api-key-banner";
  banner.style.cssText = `
    background: rgba(245,216,64,0.08);
    border: 1px solid rgba(245,216,64,0.25);
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 1rem;
    font-size: 14px;
  `;
  banner.innerHTML = `
    <p style="font-weight:600; margin-bottom:8px; color:#f5d840;">🔑 Configura tu API Key de Anthropic</p>
    <p style="color:#8a8270; margin-bottom:12px; font-size:13px;">
      Necesitas una clave de <a href="https://console.anthropic.com" target="_blank" style="color:#f5d840;">console.anthropic.com</a>.
      Se guarda solo en tu navegador, nunca en ningún servidor.
    </p>
    <div style="display:flex; gap:8px;">
      <input
        type="password"
        id="api-key-input"
        placeholder="sk-ant-..."
        style="flex:1; background:#1a1814; border:1px solid rgba(255,255,255,0.14); border-radius:8px;
               padding:9px 14px; color:#f0ece3; font-size:14px; outline:none;"
      />
      <button onclick="saveApiKey()" style="
        background:#f5d840; color:#0f0e0c; border:none; border-radius:8px;
        padding:9px 18px; font-weight:700; cursor:pointer; font-size:14px;
      ">Guardar</button>
    </div>
  `;
  const appCard = document.querySelector(".app-card");
  appCard.prepend(banner);
}

window.saveApiKey = function () {
  const input = document.getElementById("api-key-input");
  const key = input?.value?.trim();
  if (!key || !key.startsWith("sk-ant-")) {
    alert("La key debe empezar con sk-ant-");
    return;
  }
  localStorage.setItem("bfs_api_key", key);
  document.getElementById("api-key-banner")?.remove();
};

// ─── Drag & Drop ──────────────────────────────────────────────────────────────
function setupDropZone() {
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragging");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragging");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragging");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
}

function setupFileInput() {
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });
}

// ─── File handling ────────────────────────────────────────────────────────────
function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    showError("Por favor sube un archivo de imagen (JPG, PNG, HEIC, WEBP).");
    return;
  }

  imageMediaType = file.type === "image/jpeg" ? "image/jpeg"
                 : file.type === "image/png"  ? "image/png"
                 : file.type === "image/webp" ? "image/webp"
                 : "image/jpeg";

  const reader = new FileReader();
  reader.onload = (e) => {
    imageBase64 = e.target.result.split(",")[1];
    const img = document.getElementById("preview-img");
    img.src = e.target.result;
    setState("preview");
    hideError();
  };
  reader.readAsDataURL(file);
}

// ─── State machine ────────────────────────────────────────────────────────────
function setState(state) {
  const states = ["upload", "preview", "loading", "result"];
  states.forEach((s) => {
    document.getElementById(`state-${s}`).classList.toggle("hidden", s !== state);
  });
}

// ─── Analysis ─────────────────────────────────────────────────────────────────
window.analyzeImage = async function () {
  const apiKey = getApiKey();
  if (!apiKey) {
    showError("Necesitas configurar tu API key de Anthropic primero.");
    injectApiKeyBanner();
    return;
  }
  if (!imageBase64) return;

  setState("loading");
  hideError();
  startLoadingMessages();

  try {
    const response = await callClaudeVision(apiKey, imageBase64, imageMediaType);
    const result = parseResult(response);
    renderResult(result);
    setState("result");
  } catch (err) {
    console.error("Error en análisis:", err);
    setState("preview");
    showError(
      err.message.includes("401")
        ? "API key inválida o sin permisos. Verifica en console.anthropic.com."
        : err.message.includes("529") || err.message.includes("overloaded")
        ? "La API está ocupada. Espera unos segundos e intenta de nuevo."
        : `Error al analizar: ${err.message}`
    );
  }
};

async function callClaudeVision(apiKey, base64, mediaType) {
  const prompt = `Eres un nutricionista experto y analista de alimentos con visión por computadora.

Analiza esta imagen de comida con precisión.

DETECCIÓN DE ESCALA:
- Busca si hay una banana en la imagen
- Si la encuentras: úsala como referencia (banana estándar = ~18cm largo, ~120g sin cáscara)
- Calcula la razón píxeles/cm y estima el tamaño real de cada alimento
- Si no hay banana: estima las porciones por contexto visual (plato estándar ~26cm, cubiertos, etc.)

ANÁLISIS REQUERIDO:
- Identifica CADA alimento visible en el plato
- Estima su peso en gramos
- Calcula calorías y macros para esa porción específica

Responde ÚNICAMENTE con JSON válido, sin markdown, sin texto adicional, sin explicaciones fuera del JSON:

{
  "banana_detected": true o false,
  "banana_note": "descripción de si encontraste la banana y cómo la usaste como escala (1-2 oraciones)",
  "foods": [
    {
      "name": "nombre del alimento en español",
      "estimated_weight_g": número entero,
      "calories": número entero,
      "protein_g": número con 1 decimal,
      "carbs_g": número con 1 decimal,
      "fat_g": número con 1 decimal
    }
  ],
  "totals": {
    "calories": número entero,
    "protein_g": número con 1 decimal,
    "carbs_g": número con 1 decimal,
    "fat_g": número con 1 decimal
  },
  "confidence": número entero entre 0 y 100,
  "confidence_reason": "razón principal de la confianza o incertidumbre (1 oración)"
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
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `HTTP ${res.status}`
    );
  }

  const data = await res.json();
  return data;
}

function parseResult(data) {
  const text = data.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");

  // Limpiar posibles backticks de markdown
  const clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    // Intentar extraer JSON con regex como fallback
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("No se pudo parsear la respuesta de IA.");
  }
}

// ─── Render resultados ────────────────────────────────────────────────────────
function renderResult(r) {
  // Totales
  document.getElementById("r-cal").textContent  = Math.round(r.totals.calories);
  document.getElementById("r-pro").textContent  = r.totals.protein_g.toFixed(1);
  document.getElementById("r-carb").textContent = r.totals.carbs_g.toFixed(1);
  document.getElementById("r-fat").textContent  = r.totals.fat_g.toFixed(1);

  // Subtitle
  document.getElementById("result-subtitle").textContent =
    r.banana_detected
      ? "🍌 Banana detectada — escala usada para mayor precisión"
      : "⚠️ Sin banana — estimación visual estándar";

  // Lista de alimentos
  const list = document.getElementById("food-list");
  list.innerHTML = "";
  r.foods.forEach((food) => {
    const row = document.createElement("div");
    row.className = "food-row";
    row.innerHTML = `
      <span>
        <span class="food-name">${escapeHtml(food.name)}</span>
        <span class="food-weight">~${Math.round(food.estimated_weight_g)}g</span>
      </span>
      <span class="food-cal">${Math.round(food.calories)} kcal</span>
    `;
    list.appendChild(row);
  });

  // Confianza
  const conf = Math.round(r.confidence);
  document.getElementById("confidence-pct").textContent = `${conf}%`;
  const fill = document.getElementById("confidence-fill");
  fill.style.width = `${conf}%`;
  fill.style.background =
    conf >= 70 ? "#7ecb72"
    : conf >= 45 ? "#f5d840"
    : "#e05c5c";

  document.getElementById("confidence-note").textContent =
    (r.banana_detected
      ? "🍌 Banana usada como referencia de escala. "
      : "⚠️ Sin banana: pon una junto al plato para mayor precisión. ") +
    (r.confidence_reason || "");
}

// ─── Reset ────────────────────────────────────────────────────────────────────
window.resetApp = function () {
  imageBase64 = null;
  fileInput.value = "";
  setState("upload");
  hideError();
};

// ─── Loading messages ─────────────────────────────────────────────────────────
let loadingInterval = null;
const LOADING_MSGS = [
  "Identificando alimentos…",
  "Buscando banana para calibrar escala…",
  "Estimando porciones y peso…",
  "Calculando calorías y macros…",
  "Consultando base de datos nutricional…",
];

function startLoadingMessages() {
  let i = 0;
  const el = document.getElementById("loading-msg");
  if (el) el.textContent = LOADING_MSGS[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % LOADING_MSGS.length;
    if (el) el.textContent = LOADING_MSGS[i];
  }, 2000);
  return () => clearInterval(loadingInterval);
}

// ─── Error handling ───────────────────────────────────────────────────────────
function showError(msg) {
  const box = document.getElementById("error-box");
  box.textContent = `⚠️ ${msg}`;
  box.classList.remove("hidden");
}

function hideError() {
  document.getElementById("error-box").classList.add("hidden");
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

# 🍌 Banana for Scale

> El meme clásico de internet, convertido en herramienta real de conteo de calorías.

Pon una banana junto a tu comida, toma una foto, y obtén calorías + macros estimados usando IA (Claude Vision de Anthropic).

![Demo](public/screenshot.png)

---

## ¿Cómo funciona?

Una banana estándar mide ~18 cm de largo. La IA detecta la banana en la imagen, la usa como referencia de escala para estimar el tamaño y peso de los demás alimentos, y calcula calorías, proteína, carbohidratos y grasa.

**Sin banana** → la IA estima por contexto visual (tamaño del plato, cubiertos, etc.)  
**Con banana** → estimación más precisa gracias a la referencia de escala

---

## Stack técnico

- HTML + CSS + Vanilla JS (sin frameworks, sin build step)
- [Claude Vision API](https://docs.anthropic.com/en/docs/vision) de Anthropic
- Desplegable en Netlify, Vercel, GitHub Pages o cualquier servidor estático

---

## Inicio rápido (local)

### 1. Clona el repo

```bash
git clone https://github.com/TU_USUARIO/banana-for-scale.git
cd banana-for-scale
```

### 2. Consigue una API key

1. Ve a [console.anthropic.com](https://console.anthropic.com)
2. Crea una cuenta y genera una API key
3. Asegúrate de tener créditos disponibles (hay prueba gratuita)

### 3. Abre la app

**Opción A — directo en el navegador (más fácil):**
```bash
open index.html
# o simplemente arrastra index.html a tu navegador
```
Al abrir la app, aparece un campo para poner tu API key. Se guarda en `localStorage` (solo en tu navegador).

**Opción B — con servidor local (recomendado para desarrollo):**
```bash
# Con Python
python3 -m http.server 8080

# Con Node.js
npx serve .

# Con VS Code
# Instala la extensión "Live Server" y haz clic en "Go Live"
```
Luego abre [http://localhost:8080](http://localhost:8080)

---

## Despliegue en producción

### Netlify (recomendado — gratis)

1. Fork este repo en GitHub
2. Ve a [netlify.com](https://netlify.com) → "Add new site" → "Import from Git"
3. Conecta tu repo
4. En **Build settings**: deja todo en blanco (es un sitio estático puro)
5. **Importante**: No necesitas variables de entorno en Netlify para este proyecto. Los usuarios ponen su propia API key en la interfaz.
6. Clic en **Deploy**

### Vercel

```bash
npm i -g vercel
vercel
```

### GitHub Pages

1. Ve a tu repo en GitHub → Settings → Pages
2. Source: `Deploy from a branch` → `main` → `/ (root)`
3. Tu app estará en `https://TU_USUARIO.github.io/banana-for-scale`

---

## Estructura del proyecto

```
banana-for-scale/
├── index.html          # App principal (HTML semántico)
├── src/
│   ├── style.css       # Estilos (tema oscuro, tipografía Syne + DM Sans)
│   └── app.js          # Lógica: upload, API call, render de resultados
├── public/
│   └── screenshot.png  # (agrega tu propia captura)
├── .gitignore
└── README.md
```

---

## Privacidad

- Las fotos se envían **directamente** a la API de Anthropic desde tu navegador
- **No hay backend propio** — no almacenamos nada
- La API key se guarda en `localStorage` de tu navegador únicamente
- Revisa la [política de privacidad de Anthropic](https://www.anthropic.com/privacy) para saber cómo manejan las imágenes

---

## Personalización

### Cambiar el modelo de IA

En `src/app.js`, línea 8:
```js
const MODEL = "claude-opus-4-5"; // más preciso, más caro
// const MODEL = "claude-sonnet-4-20250514"; // más rápido y barato
```

### Cambiar el idioma del análisis

Modifica el `prompt` en la función `callClaudeVision()` en `app.js`. El prompt actual está en español.

### Agregar historial de comidas

Puedes guardar los resultados en `localStorage`:
```js
const history = JSON.parse(localStorage.getItem("bfs_history") || "[]");
history.push({ date: new Date().toISOString(), result });
localStorage.setItem("bfs_history", JSON.stringify(history));
```

---

## Limitaciones conocidas

- Las estimaciones son aproximadas — no reemplaza un nutriólogo
- Funciona mejor cuando la banana está en el mismo plano que la comida
- Alimentos apilados o parcialmente ocultos reducen la precisión
- La API de Anthropic tiene costos por uso (~$0.003 por análisis con Sonnet)

---

## Contribuir

1. Fork el repo
2. Crea una rama: `git checkout -b feature/mi-mejora`
3. Haz tus cambios y commit: `git commit -m "feat: descripción"`
4. Push: `git push origin feature/mi-mejora`
5. Abre un Pull Request

Ideas para contribuir:
- [ ] Historial de comidas por día
- [ ] Exportar a CSV
- [ ] Soporte para múltiples objetos de escala (moneda, cubiertos)
- [ ] PWA (instalable en móvil)
- [ ] Modo offline con modelo local

---

## Licencia

MIT — úsalo, modifícalo y distribúyelo libremente.

---

*Hecho con 🍌 e inspirado en el meme más útil de internet.*

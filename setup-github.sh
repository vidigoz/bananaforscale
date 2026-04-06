#!/bin/bash
# =============================================================
# setup-github.sh
# Script para inicializar el repo y subirlo a GitHub
# Uso: bash setup-github.sh TU_USUARIO_DE_GITHUB
# =============================================================

set -e

GITHUB_USER=${1:-"TU_USUARIO"}
REPO_NAME="banana-for-scale"

echo "🍌 Banana for Scale — Setup de GitHub"
echo "======================================="
echo ""

# 1. Verificar que gh CLI esté instalado
if ! command -v gh &> /dev/null; then
  echo "📦 GitHub CLI no encontrado. Instálalo:"
  echo "   macOS:  brew install gh"
  echo "   Ubuntu: sudo apt install gh"
  echo "   Windows: winget install --id GitHub.cli"
  echo ""
  echo "   Luego corre: gh auth login"
  echo ""
  echo "   O crea el repo manualmente en github.com y sigue el paso 3."
  exit 1
fi

# 2. Inicializar git (si no está ya inicializado)
if [ ! -d ".git" ]; then
  echo "📁 Inicializando repositorio git..."
  git init
  git add .
  git commit -m "feat: initial commit — Banana for Scale 🍌"
  echo "✅ Repositorio inicializado"
else
  echo "✅ Repositorio git ya existe"
fi

# 3. Crear repo en GitHub y hacer push
echo ""
echo "🚀 Creando repositorio en GitHub como @${GITHUB_USER}/${REPO_NAME}..."
gh repo create "${REPO_NAME}" \
  --public \
  --description "🍌 El meme clásico convertido en contador de calorías con IA" \
  --push \
  --source=. \
  --remote=origin

echo ""
echo "✅ ¡Listo! Tu repo está en:"
echo "   https://github.com/${GITHUB_USER}/${REPO_NAME}"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Actualiza TU_USUARIO en index.html y README.md con tu usuario de GitHub"
echo "   2. Para Netlify: ve a app.netlify.com → Add new site → Import from Git"
echo "   3. Para GitHub Pages: Settings → Pages → Deploy from main branch"
echo ""
echo "🍌 ¡A contar calorías!"

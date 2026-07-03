# Template - Sistema de Gestión Electoral

Proyecto base con:
- Vite
- React
- Supabase

## Variables
Crear `.env` con:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## Instalar
npm install

## Ejecutar
npm run dev

## Build
npm run build

## Personalizar para una nueva campaña

1. **Datos de la campaña**: editar `src/config/campaign.js` (nombre del candidato, partido, cargo, año, ciudad, número de lista/opción, lema).
2. **Barrios/localidades**: reemplazar `LISTA_BARRIOS` en `src/utils/helpers.js` con los barrios reales de la ciudad.
3. **Imágenes**:
   - `src/img/party-logo.webp` — logo del partido.
   - `src/img/candidate-logo.webp` — foto/logo del candidato.
   - `public/hero-bg.webp` / `public/hero-bg.png` — imagen de fondo del hero.
   - `public/icon.svg` — ícono de la app (editar texto del nombre/lista antes de regenerar `icon.png` y `favicon.png`).
4. **Metadatos**: título y meta tags en `index.html`, y `public/manifest.json`.
5. **Color de marca**: `brand` en `tailwind.config.js`.
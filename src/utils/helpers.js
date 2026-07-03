export const normalizarCedula = (v) => String(v || "").replace(/[.\-\s]/g, "").trim();

// Reemplazar con los barrios/localidades reales de la ciudad de la campaña.
export const LISTA_BARRIOS = [
  "Barrio 1", "Barrio 2", "Barrio 3", "Barrio 4", "Barrio 5",
];
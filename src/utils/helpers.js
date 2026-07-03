export const normalizarCedula = (v) => String(v || "").replace(/[.\-\s]/g, "").trim();

export const LISTA_BARRIOS = [
  "San Miguel", "San Antonio", "San Francisco", "San José", "Virgen de Fátima",
  "San Roque González de Santa Cruz", "Santa Teresita", "Virgen del Rosario",
  "San Pedro", "Santa Lucía", "San Blas", "Villa Artesanal", "Villa Jazmín",
  "María Auxiliadora", "Santo Tomás", "21 de Julio", "Aparypy", "Rosado",
  "Mompox", "Ensenada", "Santa Rosa", "Costa Alegre", "Loma Verde",
  "Potrero \"Zona A\"", "Potrero \"Zona B\"", "Potrero \"Zona C\"",
  "Núcleo Rural 6 de Enero", "Jhuyvaty", "Isla Florida", "Karanda'yty",
  "Santa Cruz", "Serranía", "Loma Clavel", "Colonia Independencia",
  "Tacuaralito", "Caacupemí", "Itá Guazú", "Vallepé", "Zanja Jhú",
  "Yhovy", "Mbocayaty", "Santa Librada", "Costa Pucú", "Hugua Pytã",
];
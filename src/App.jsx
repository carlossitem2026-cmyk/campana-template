import { useEffect, useMemo, useRef, useState } from "react";
import {
  LogOut, Users, CheckCircle2, FileSpreadsheet,
  Home, UserCheck, ClipboardList, Shield, BarChart2, Menu,
} from "lucide-react";
import { supabase, supabaseAuth } from "./lib/supabase";
import { normalizarCedula, LISTA_BARRIOS } from "./utils/helpers";
import { LoginScreen } from "./components/LoginScreen";
import { TarjetaModal } from "./components/TarjetaModal";
import candidateLogo from "./img/candidate-logo.webp";
import partyLogo from "./img/party-logo.webp";
import { CAMPAIGN } from "./config/campaign";
import "./styles.css";



export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("");
  const [userEquipoId, setUserEquipoId] = useState(null);
  const [votantes, setVotantes] = useState([]);
  const [equipo, setEquipo] = useState([]);

  const PAGE_SIZE = 100;
  const [misVotantes, setMisVotantes] = useState([]);
  const [misVotantesPage, setMisVotantesPage] = useState(0);
  const [misVotantesTotal, setMisVotantesTotal] = useState(0);
  const [listaGeneral, setListaGeneral] = useState([]);
  const [listaGeneralPage, setListaGeneralPage] = useState(0);
  const [listaGeneralTotal, setListaGeneralTotal] = useState(0);
  const [listaGeneralVotados, setListaGeneralVotados] = useState(0);
  const [reporteVotantes, setReporteVotantes] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState("inicio");
  const [conteoGlobal, setConteoGlobal] = useState(0);
  const [loadingConteo, setLoadingConteo] = useState(true);

  const [formVotante, setFormVotante] = useState({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" });
  const [formEquipo, setFormEquipo] = useState({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" });
  const [editIdVotante, setEditIdVotante] = useState(null);
  const [editIdEquipo, setEditIdEquipo] = useState(null);
  const [busquedaLista, setBusquedaLista] = useState("");
  const [cedulaRapida, setCedulaRapida] = useState("");
  const [resultadoPadron, setResultadoPadron] = useState(null);
  const [busquedaListaGeneral, setBusquedaListaGeneral] = useState("");

  const [tarjetaVotante, setTarjetaVotante] = useState(null);
  const mapaCalorRef = useRef(null);
  const [mostrarTodosBarrios, setMostrarTodosBarrios] = useState(false);
  const [exportandoMapa, setExportandoMapa] = useState(false);
  const [visibleMisVotantes, setVisibleMisVotantes] = useState(10);
  const [visibleListaGeneral, setVisibleListaGeneral] = useState(10);
  const [visibleEquipo, setVisibleEquipo] = useState(10);

  // UI-only state for mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // UI-only state for barrio combobox
  const [barrioSearch, setBarrioSearch] = useState("");
  const [barrioOpen, setBarrioOpen] = useState(false);
  const [barriosExtra, setBarriosExtra] = useState([]);
  // Toast notifications
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const limpiarEstado = () => {
    setAppReady(false);
    setVotantes([]); setEquipo([]); setUserRole(null); setUserName(""); setUserEquipoId(null); setConteoGlobal(0);
    setActiveTab("inicio");
    setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" });
    setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" });
    setEditIdVotante(null); setEditIdEquipo(null); setBusquedaLista(""); setCedulaRapida(""); setResultadoPadron(null); setBusquedaListaGeneral("");
    setMisVotantes([]); setMisVotantesPage(0); setMisVotantesTotal(0);
    setListaGeneral([]); setListaGeneralPage(0); setListaGeneralTotal(0); setListaGeneralVotados(0);
    setReporteVotantes([]); setLoadingMore(false);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { sessionStorage.removeItem("session_active"); limpiarEstado(); }
      else if (_event === "SIGNED_IN") { sessionStorage.setItem("session_active", "1"); }
      setSession(session);
      if (_event === "SIGNED_IN" || _event === "SIGNED_OUT" || _event === "TOKEN_REFRESHED") {
        setAuthLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { limpiarEstado(); setSession(null); setAuthLoading(false); return; }
      if (!sessionStorage.getItem("session_active")) { supabase.auth.signOut(); return; }
      const tokenFresh = data.session.expires_at && data.session.expires_at > Math.floor(Date.now() / 1000);
      if (tokenFresh) { setSession(data.session); setAuthLoading(false); }
      // Si el token expiró, se queda en spinner hasta que onAuthStateChange resuelva (TOKEN_REFRESHED o SIGNED_OUT)
    });
    return () => { window.removeEventListener("resize", handleResize); subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (session) cargarRolYDatos(); }, [session]);

  useEffect(() => {
    if (!session) return;
    if (activeTab === "votantes") { setMisVotantesPage(0); setVisibleMisVotantes(10); cargarMisVotantes(busquedaLista, 0, false); }
    else if (activeTab === "lista_general") { setListaGeneralPage(0); setVisibleListaGeneral(10); cargarListaGeneral(busquedaListaGeneral, 0, false); }
    else if (activeTab === "reportes" && userRole === "administrador") cargarReportes();
  }, [activeTab, session]);

  useEffect(() => {
    if (!session || activeTab !== "votantes") return;
    const t = setTimeout(() => { setMisVotantesPage(0); setVisibleMisVotantes(10); cargarMisVotantes(busquedaLista, 0, false); }, 350);
    return () => clearTimeout(t);
  }, [busquedaLista]);

  useEffect(() => {
    if (!session || activeTab !== "lista_general") return;
    const t = setTimeout(() => { setListaGeneralPage(0); setVisibleListaGeneral(10); cargarListaGeneral(busquedaListaGeneral, 0, false); }, 350);
    return () => clearTimeout(t);
  }, [busquedaListaGeneral]);

  useEffect(() => {
    let timeoutId;
    const resetTimer = () => { clearTimeout(timeoutId); if (session) { timeoutId = setTimeout(() => { supabase.auth.signOut(); }, 15 * 60 * 1000); } };
    if (session) {
      resetTimer();
      const eventos = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
      eventos.forEach((evento) => window.addEventListener(evento, resetTimer));
      return () => { clearTimeout(timeoutId); eventos.forEach((evento) => window.removeEventListener(evento, resetTimer)); };
    }
  }, [session]);

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); showToast("Conexión restaurada", "success"); };
    const onOffline = () => { setIsOnline(false); showToast("Sin conexión a internet", "error"); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("conteo-votantes")
      .on("postgres_changes", { event: "*", schema: "public", table: "votantes" }, async () => {
        const { data } = await supabase.rpc("obtener_conteo_total_votantes");
        if (data !== null) setConteoGlobal(data);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session]);

  async function cargarRolYDatos() {
    setLoading(true);
    setAppReady(false);
    try {
      const { data: profile, error: profileError } = await supabase.from("profiles").select("rol, nombre, equipo_id, activo").eq("user_id", session.user.id).single();
      if (profileError) showToast("No se pudo cargar el perfil: " + profileError.message, "error");
      if (profile?.activo === false) {
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      setUserRole(profile?.rol || "coordinador"); setUserName(profile?.nombre || "Usuario"); setUserEquipoId(profile?.equipo_id || null);
      await cargarDatos();
    } catch (err) { console.error(err); }
    setLoading(false);
    setAppReady(true);
  }

  async function cargarDatos() {
    try {
      const [e, conteo, barrios] = await Promise.all([
        supabase.from("equipo").select("*").order("created_at", { ascending: false }),
        supabase.rpc("obtener_conteo_total_votantes"),
        supabase.from("votantes").select("barrio").not("barrio", "is", null).neq("barrio", "").neq("barrio", "__otro__")
      ]);
      setEquipo(e.data || []);
      if (conteo && conteo.data !== null) setConteoGlobal(conteo.data);
      const nuevos = [...new Set((barrios.data || []).map(v => v.barrio))].filter(b => !LISTA_BARRIOS.includes(b));
      setBarriosExtra(nuevos);
    } catch (err) { }
    setLoadingConteo(false);
  }

  async function cargarMisVotantes(search, page, append) {
    if (page === 0) setLoading(true); else setLoadingMore(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("votantes")
      .select("*", { count: "exact" })
      .eq("created_by", session.user.id)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (search.trim()) query = query.or(`nombre.ilike.%${search.trim()}%,apellido.ilike.%${search.trim()}%,cedula.ilike.%${search.trim()}%`);
    const { data, count, error } = await query;
    if (!error) {
      setMisVotantes(prev => append ? [...prev, ...(data || [])] : (data || []));
      if (count !== null) setMisVotantesTotal(count);
    }
    if (page === 0) setLoading(false); else setLoadingMore(false);
  }

  async function cargarListaGeneral(search, page, append) {
    if (page === 0) setLoading(true); else setLoadingMore(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("votantes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (search.trim()) query = query.ilike("cedula", `%${search.trim()}%`);
    const [{ data, count, error }, votados] = await Promise.all([
      query,
      supabase.from("votantes").select("*", { count: "exact", head: true }).eq("ha_votado", true)
    ]);
    if (!error) {
      setListaGeneral(prev => append ? [...prev, ...(data || [])] : (data || []));
      if (count !== null) setListaGeneralTotal(count);
      if (votados.count !== null) setListaGeneralVotados(votados.count);
    }
    if (page === 0) setLoading(false); else setLoadingMore(false);
  }

  async function cargarReportes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("votantes")
      .select("nombre,apellido,cedula,barrio,por_parte_de_nombre,created_by,ha_votado");
    if (!error) setReporteVotantes(data || []);
    setLoading(false);
  }

  const rendimientoEquipo = useMemo(() => {
    const total = reporteVotantes?.length || 0;
    const captadoresMap = new Map();
    const normalizado = new Map(); // nombre.toLowerCase() → nombre canónico del equipo
    (equipo || []).forEach((m) => {
      captadoresMap.set(m.nombre, { id: m.id, nombre: m.nombre, cantidad: 0 });
      normalizado.set(m.nombre.toLowerCase().trim(), m.nombre);
    });
    (reporteVotantes || []).forEach((v) => {
      const nombre = v.por_parte_de_nombre;
      if (!nombre) return;
      const canonical = normalizado.get(nombre.toLowerCase().trim()) || nombre;
      if (!captadoresMap.has(canonical)) {
        captadoresMap.set(canonical, { id: v.created_by || canonical, nombre: canonical, cantidad: 0 });
        normalizado.set(canonical.toLowerCase().trim(), canonical);
      }
      captadoresMap.get(canonical).cantidad += 1;
    });
    return Array.from(captadoresMap.values()).map((m) => ({ ...m, porcentaje: total > 0 ? Math.round((m.cantidad / total) * 100) : 0 })).sort((a, b) => b.cantidad - a.cantidad);
  }, [reporteVotantes, equipo]);


  const barriosDisponibles = useMemo(() => {
    return [...new Set([...LISTA_BARRIOS, ...barriosExtra])].sort((a, b) => a.localeCompare(b, "es"));
  }, [barriosExtra]);

  const VOTER_OFFSET = 0;
  const totalVotantesGeneral = VOTER_OFFSET + conteoGlobal;

  const conteoBarrio = useMemo(() => {
    const counts = {};
    (reporteVotantes || []).forEach((v) => { const b = v.barrio || "Sin barrio"; counts[b] = (counts[b] || 0) + 1; });
    return Object.entries(counts).map(([name, total]) => ({ name, total }));
  }, [reporteVotantes]);

  async function buscarEnPadron() {
    const limpia = normalizarCedula(cedulaRapida);
    if (!limpia) return;
    setLoading(true); setResultadoPadron(null);
    const { data, error } = await supabase.from("padron_importado").select("*").or(`cedula_limpia.eq.${limpia},cedula.eq.${cedulaRapida}`).limit(1).maybeSingle();
    if (error) { if (error.code === "42501") showToast("Error de permisos.", "error"); else showToast("Error: " + error.message, "error"); }
    else if (data) setResultadoPadron(data);
    else showToast("Cédula no encontrada", "error");
    setLoading(false);
  }

  async function guardarVotante(e) {
    e.preventDefault();
    if (!formVotante.barrio || formVotante.barrio === "__otro__") { showToast("Por favor seleccione o escriba el barrio.", "error"); return; }
    const cedulaLimpiaActual = normalizarCedula(formVotante.cedula);
    setLoading(true);
    let checkQuery = supabase.from("votantes").select("id", { count: "exact", head: true }).eq("cedula_limpia", cedulaLimpiaActual).eq("created_by", session?.user?.id);
    if (editIdVotante) checkQuery = checkQuery.neq("id", editIdVotante);
    const { count: dupeCount } = await checkQuery;
    if (dupeCount > 0) { setLoading(false); showToast("Ya registrado en tu lista.", "error"); return; }
    const { id, created_at, ...datosLimpios } = formVotante;
    const payload = { ...datosLimpios, fecha_nacimiento: datosLimpios.fecha_nacimiento && datosLimpios.fecha_nacimiento.includes("/") ? datosLimpios.fecha_nacimiento.split("/").reverse().join("-") : datosLimpios.fecha_nacimiento || null, cedula_limpia: cedulaLimpiaActual, por_parte_de_nombre: userName, equipo_id: userEquipoId, user_id: session?.user?.id, created_by: session?.user?.id };
    const { error } = editIdVotante ? await supabase.from("votantes").update(payload).eq("id", editIdVotante) : await supabase.from("votantes").insert([payload]);
    if (!error) {
      if (formVotante.barrio && formVotante.barrio !== "__otro__" && !barriosDisponibles.includes(formVotante.barrio)) {
        setBarriosExtra(prev => [...prev, formVotante.barrio]);
      }
      setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" });
      setEditIdVotante(null);
      setMisVotantesPage(0);
      await cargarMisVotantes(busquedaLista, 0, false);
      const conteo = await supabase.rpc("obtener_conteo_total_votantes");
      if (conteo.data !== null) setConteoGlobal(conteo.data);
      showToast("¡Guardado!", "success");
    } else {
      const esRedError = !navigator.onLine || error.message?.toLowerCase().includes("fetch") || error.message?.toLowerCase().includes("network");
      showToast(esRedError ? "Sin conexión. Verificá tu señal e intentá de nuevo." : "Error: " + error.message, "error");
    }
    setLoading(false);
  }

  async function guardarEquipo(e) {
    e.preventDefault(); if (userRole !== "administrador") return;
    setLoading(true); let authUserId = null;
    if (!editIdEquipo) {
      const { data: authData, error: authError } = await supabaseAuth.auth.signUp({ email: formEquipo.email, password: formEquipo.password });
      if (authError) { showToast("Error: " + authError.message, "error"); setLoading(false); return; }
      authUserId = authData.user.id;
    }
    const payloadEquipo = { nombre: formEquipo.nombre, telefono: formEquipo.telefono, zona: formEquipo.zona, rol: formEquipo.rol, ...(authUserId && { user_id: authUserId }) };
    if (editIdEquipo) {
      const miembroActual = equipo.find(m => m.id === editIdEquipo);
      const nombreAnterior = miembroActual?.nombre;
      const { error: err1 } = await supabase.from("equipo").update(payloadEquipo).eq("id", editIdEquipo);
      const { data: perfilActualizado, error: err2 } = await supabase.from("profiles").update({ nombre: formEquipo.nombre, rol: formEquipo.rol, telefono: formEquipo.telefono, zona: formEquipo.zona }).eq("user_id", miembroActual?.user_id).select();
      if (nombreAnterior && nombreAnterior !== formEquipo.nombre) {
        await supabase.from("votantes").update({ por_parte_de_nombre: formEquipo.nombre }).ilike("por_parte_de_nombre", nombreAnterior);
      }
      if (err1 || err2) showToast("Error al actualizar", "error");
      else if (!perfilActualizado?.length) showToast("No se encontró el perfil vinculado a este usuario. Verificá que tenga una cuenta de acceso creada.", "error");
      else { setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" }); setEditIdEquipo(null); cargarDatos(); showToast("Actualizado", "success"); }
    } else {
      const { data: nuevoEquipo, error: err1 } = await supabase.from("equipo").insert([payloadEquipo]).select();
      if (err1) showToast("Error: " + err1.message, "error");
      else if (nuevoEquipo && authUserId) {
        const payloadProfile = { id: authUserId, user_id: authUserId, equipo_id: nuevoEquipo[0].id, nombre: formEquipo.nombre, rol: formEquipo.rol, telefono: formEquipo.telefono, zona: formEquipo.zona };
        const { error: err2 } = await supabase.from("profiles").upsert([payloadProfile], { onConflict: 'user_id' });
        if (err2) showToast("Error perfil.", "error"); else { setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" }); setEditIdEquipo(null); cargarDatos(); showToast("Creado", "success"); }
      }
    }
    setLoading(false);
  }

  const exportarExcel = async () => {
    if (userRole !== "administrador") return;
    setLoading(true);
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import("exceljs"),
      import("file-saver"),
    ]);
    const { data: todosVotantes, error: fetchError } = await supabase
      .from("votantes")
      .select("*")
      .order("created_at", { ascending: false });
    if (fetchError) { showToast("Error al exportar: " + fetchError.message, "error"); setLoading(false); return; }

    // Normalizar nombres: "eliska macchi" → "Eliska Macchi" usando la lista de equipo
    const nombreCanonicoMap = new Map();
    (equipo || []).forEach(m => nombreCanonicoMap.set(m.nombre.toLowerCase().trim(), m.nombre));
    const normalizarNombre = (nombre) => {
      if (!nombre) return nombre;
      return nombreCanonicoMap.get(nombre.toLowerCase().trim()) || nombre;
    };
    const todosVotantesNormalizados = todosVotantes.map(v => ({ ...v, por_parte_de_nombre: normalizarNombre(v.por_parte_de_nombre) }));

    const workbook = new ExcelJS.Workbook();
    const crearHoja = (nombreHoja, lista) => {
      const sheet = workbook.addWorksheet(nombreHoja.substring(0, 31));
      const esListaGeneral = nombreHoja === "LISTA GENERAL"; const colFinal = esListaGeneral ? "I" : "J";
      sheet.addRow([`${CAMPAIGN.tagline.toUpperCase()} ${CAMPAIGN.location.toUpperCase()}`]); sheet.mergeCells(`A1:${colFinal}1`);
      sheet.getRow(1).height = 30; sheet.getRow(1).getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } }; sheet.getRow(1).getCell(1).font = { color: { argb: "FFFFFFFF" }, size: 18, bold: true }; sheet.getRow(1).getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      sheet.addRow([`${CAMPAIGN.candidateName.toUpperCase()} ${CAMPAIGN.year}`]); sheet.mergeCells(`A2:${colFinal}2`);
      sheet.getRow(2).height = 20; sheet.getRow(2).getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } }; sheet.getRow(2).getCell(1).font = { color: { argb: "FFFFFFFF" }, size: 12, bold: true }; sheet.getRow(2).getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      sheet.addRow([]);
      const anchosColumnas = esListaGeneral ? [5, 25, 25, 12, 17, 15, 25, 37, 40] : [5, 25, 25, 12, 17, 15, 25, 37, 20, 40];
      anchosColumnas.forEach((ancho, index) => sheet.getColumn(index + 1).width = ancho);
      const headerRow = sheet.getRow(4);
      const headerNombres = esListaGeneral ? ["Nro", "Nombre", "Apellido", "Cedula", "Fecha Nacimiento", "Teléfono", "Barrio", "Local", "Observación"] : ["Nro", "Nombre", "Apellido", "Cedula", "Fecha Nacimiento", "Teléfono", "Barrio", "Local", "Captado por", "Observación"];
      headerRow.values = headerNombres;
      headerRow.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } }; c.font = { color: { argb: "FFFFFFFF" }, bold: true }; c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }; });
      lista.forEach((v, i) => {
        const fechaFormateada = v.fecha_nacimiento && v.fecha_nacimiento.includes("-") ? v.fecha_nacimiento.split("-").reverse().join("/") : (v.fecha_nacimiento || "");
        const valoresFila = esListaGeneral ? [i + 1, v.nombre, v.apellido, v.cedula, fechaFormateada, v.telefono, v.barrio, v.local_votacion, v.observacion] : [i + 1, v.nombre, v.apellido, v.cedula, fechaFormateada, v.telefono, v.barrio, v.local_votacion, v.por_parte_de_nombre, v.observacion];
        const row = sheet.addRow(valoresFila); const color = i % 2 !== 0 ? "FFFEE2E2" : "FFFFFFFF";
        row.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } }; c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }; c.alignment = { vertical: "middle", horizontal: "left" }; });
      });
    };
    const todosVotantesUnicos = (() => { const seen = new Set(); return todosVotantesNormalizados.filter(v => { const duplicate = seen.has(normalizarCedula(v.cedula)); seen.add(normalizarCedula(v.cedula)); return !duplicate; }); })();
    crearHoja("LISTA GENERAL", todosVotantesUnicos);
    const nombresCaptadores = [...new Set(todosVotantesNormalizados.map((v) => v.por_parte_de_nombre).filter(Boolean))];
    nombresCaptadores.forEach((nombre) => { const datosMiembro = todosVotantesNormalizados.filter((v) => v.por_parte_de_nombre === nombre); if (datosMiembro.length > 0) crearHoja(nombre, datosMiembro); });
    const buffer = await workbook.xlsx.writeBuffer(); saveAs(new Blob([buffer]), `Campaña_${CAMPAIGN.candidateName.replace(/\s+/g, "_")}.xlsx`);
    setLoading(false);
  };

  if (authLoading || (session && !appReady)) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ background: "linear-gradient(170deg, #6b0718 0%, #8c0b1e 25%, #C8102E 65%, #d41530 100%)" }}>
        <div className="h-10 w-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        {session && <p className="text-[12px] font-medium uppercase tracking-widest text-white/50">Cargando...</p>}
      </div>
    );
  }

  if (!session) {
    return <LoginScreen
      onLogin={async (e, p) => supabase.auth.signInWithPassword({ email: e, password: p })}
      loading={loading}
    />;
  }

  /* ── shared styles ──────────────────────────────────────────── */
  const inputCls = "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-[15px] font-medium text-zinc-900 outline-none placeholder:text-zinc-400 transition-all duration-150 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/12";
  const inputSmCls = "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400 transition-all duration-150 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/12";
  const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-condensed text-sm font-extrabold uppercase tracking-wide text-white transition-all duration-200 hover:bg-brand-dark hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer";
  const btnGhost  = "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-5 py-3 font-condensed text-sm font-extrabold uppercase tracking-wide text-zinc-600 transition-all duration-150 hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer";
  const btnDark   = "inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 font-condensed text-sm font-extrabold uppercase tracking-wide text-white transition-all duration-150 hover:bg-zinc-700 disabled:opacity-50 cursor-pointer";
  const btnSuccess= "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-condensed text-sm font-extrabold uppercase tracking-wide text-white transition-all duration-150 hover:bg-emerald-800 cursor-pointer";
  const panelCls  = "animate-fade-in-up rounded-2xl border border-zinc-100 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]";

  /* ── sidebar navigation config ─────────────────────────────── */
  const navItems = [
    { id: "inicio",        label: "Inicio",         icon: Home },
    { id: "votantes",      label: "Mis Votantes",   icon: UserCheck },
    ...(userRole === "administrador" ? [
      { id: "lista_general", label: "Lista General", icon: ClipboardList },
      { id: "equipo",        label: "Equipo",         icon: Shield },
      { id: "reportes",      label: "Reportes",       icon: BarChart2 },
    ] : []),
  ];

  const PAGE_TITLES = {
    inicio:        { label: "Panel Principal",      sub: "Registrar votantes y consultar padrón" },
    votantes:      { label: "Mis Votantes",          sub: "Lista personal de votantes registrados" },
    lista_general: { label: "Lista General",         sub: "Control de asistencia – Día D" },
    equipo:        { label: "Gestión de Equipo",     sub: "Administrar coordinadores y accesos" },
    reportes:      { label: "Reportes",              sub: "Estadísticas y rendimiento del equipo" },
  };

  const sidebarItemCls = (id) =>
    `relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer transition-all duration-200 ${
      activeTab === id
        ? "bg-brand text-white shadow-sm"
        : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
    }`;

  const closeSidebar = () => setSidebarOpen(false);

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div className="flex w-screen overflow-hidden font-sans" style={{ height: "100dvh" }}>

      {/* ── SIN CONEXIÓN ────────────────────────────────────────── */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-zinc-900 py-2 px-4">
          <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
          <span className="font-condensed text-[12px] font-bold uppercase tracking-wide text-white">Sin conexión — los cambios no se guardarán</span>
        </div>
      )}

      {/* ── MODAL CONFIRMACIÓN ──────────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 z-[9998] flex items-end justify-center md:items-center" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
          <div className="mx-0 md:mx-4 w-full md:max-w-sm rounded-t-2xl md:rounded-2xl bg-white p-6 shadow-2xl">
            <p className="mb-5 text-center text-[15px] text-zinc-700">{confirmModal.mensaje}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 cursor-pointer rounded-xl border border-zinc-200 py-3 font-condensed text-[12px] font-bold uppercase tracking-wide text-zinc-600 transition-colors hover:bg-zinc-50">Cancelar</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="flex-1 cursor-pointer rounded-xl bg-red-600 py-3 font-condensed text-[12px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ───────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 pointer-events-none" style={{ minWidth: "260px", maxWidth: "90vw" }}>
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 shadow-2xl text-white text-sm font-medium ${toast.type === "success" ? "bg-emerald-600" : toast.type === "error" ? "bg-zinc-900" : "bg-zinc-800"}`}>
            <span className="text-lg flex-shrink-0">
              {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ── MOBILE BACKDROP ─────────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/75 backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
           SIDEBAR
      ══════════════════════════════════════════════════════════ */}
      <aside
        className={`flex h-full w-64 flex-shrink-0 flex-col z-50
          ${isMobile
            ? `fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`
            : "relative"
          }`}
        style={{ background: "#ffffff", borderRight: "1px solid #e4e4e7" }}
      >
        {/* ── Sidebar Header ──────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-zinc-100 px-5 pb-5 pt-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={partyLogo} alt={CAMPAIGN.partyAbbr} className="h-10 w-10 rounded-full border-2 border-brand/40 object-cover" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div>
              <div className="font-display text-[18px] leading-none tracking-wider text-zinc-900">{CAMPAIGN.candidateName.toUpperCase()}</div>
              <div className="mt-0.5 font-condensed text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">{CAMPAIGN.position.toUpperCase()} {CAMPAIGN.year} · LISTA {CAMPAIGN.listNumber}</div>
            </div>
          </div>

          {/* Mini counter badge */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3.5 py-3">
            <div>
              <div className="font-display text-[24px] leading-none text-zinc-900">{totalVotantesGeneral.toLocaleString("es-PY")}</div>
              <div className="mt-0.5 font-condensed text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">votantes registrados</div>
            </div>
            <div className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Users size={15} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* ── Nav Items ───────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-2">
            <span className="font-condensed text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">MÓDULOS</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); if (isMobile) closeSidebar(); }}
                className={sidebarItemCls(item.id)}
              >
                <item.icon
                  size={15}
                  className={`flex-shrink-0 ${activeTab === item.id ? "text-white" : "text-zinc-400"}`}
                />
                <span className={`font-condensed text-[13px] font-bold tracking-wide ${activeTab === item.id ? "text-white" : "text-zinc-600"}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Admin export shortcut */}
          {userRole === "administrador" && (
            <div className="mt-6">
              <div className="mb-2 px-2">
                <span className="font-condensed text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">HERRAMIENTAS</span>
              </div>
              <button
                onClick={exportarExcel}
                className="relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer transition-all duration-200 text-zinc-400 hover:bg-zinc-50 hover:text-emerald-600"
              >
                <FileSpreadsheet size={15} className="flex-shrink-0" />
                <span className="font-condensed text-[13px] font-bold tracking-wide">Exportar Excel</span>
              </button>
            </div>
          )}
        </nav>

        {/* ── Sidebar Footer (User + Sign out) ────────────────── */}
        <div className="flex-shrink-0 border-t border-zinc-100 px-3 py-4">
          <div className="mb-2 rounded-xl border border-brand/20 bg-brand/[0.06] px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white">
                <span className="font-condensed text-[14px] font-black leading-none">{userName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold leading-tight text-zinc-800">{userName}</div>
                <span className="font-condensed text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">{userRole}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-zinc-400 transition-all duration-200 hover:bg-red-50 hover:text-red-500"
          >
            <LogOut size={14} className="flex-shrink-0" />
            <span className="font-condensed text-[11px] font-bold uppercase tracking-[0.06em]">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════
           MAIN CONTENT AREA
      ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">

        {/* ── Topbar ──────────────────────────────────────────── */}
        <header className="flex h-14 flex-shrink-0 items-center gap-3 bg-white px-4 md:px-6" style={{ borderBottom: "2px solid #C8102E", boxShadow: "0 1px 8px rgba(200,16,46,0.08)" }}>
          {/* Mobile hamburger */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex cursor-pointer items-center justify-center rounded-lg border border-zinc-200 p-2 text-zinc-600 transition-colors hover:bg-zinc-50 flex-shrink-0"
            >
              <Menu size={18} />
            </button>
          )}

          {/* Page title */}
          <div className="flex-1 min-w-0">
            <h2 className="truncate text-[15px] font-semibold leading-tight text-zinc-900">
              {PAGE_TITLES[activeTab]?.label}
            </h2>
            {!isMobile && (
              <p className="text-[11px] text-zinc-400 leading-none mt-0.5">
                {PAGE_TITLES[activeTab]?.sub}
              </p>
            )}
          </div>

          {/* Mobile: user initial */}
          {isMobile && (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
              <span className="font-condensed text-[13px] font-black leading-none">{userName.charAt(0).toUpperCase()}</span>
            </div>
          )}

          {/* Lista badge (desktop) */}
          {!isMobile && (
            <div className="flex-shrink-0 flex items-center overflow-hidden rounded-full shadow-sm">
              <span className="bg-white border border-zinc-200 px-3 py-1 font-condensed text-[10px] font-extrabold uppercase tracking-wider text-brand">Lista {CAMPAIGN.listNumber}</span>
              <span className="bg-brand px-3 py-1 font-condensed text-[10px] font-extrabold uppercase tracking-wider text-white">Opción {CAMPAIGN.optionNumber}</span>
            </div>
          )}
        </header>


        {/* ── Scrollable content ──────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-zinc-50" style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorY: "contain" }}>

          {/* ═══ INICIO ═══════════════════════════════════════════ */}
          {activeTab === "inicio" && (
            <div>
              {/* Hero */}
              <section className="relative overflow-hidden text-center" style={{ background: "linear-gradient(170deg, #6b0718 0%, #8c0b1e 25%, #C8102E 65%, #d41530 100%)", minHeight: isMobile ? "520px" : "580px", isolation: "isolate" }}>

                {/* Rayos de luz radiales desde el centro */}
                <div className="pointer-events-none absolute inset-0" style={{
                  background: "conic-gradient(from 180deg at 50% 60%, transparent 0deg, rgba(255,255,255,0.03) 10deg, transparent 20deg, rgba(255,255,255,0.05) 30deg, transparent 40deg, rgba(255,255,255,0.03) 50deg, transparent 60deg, rgba(255,255,255,0.04) 70deg, transparent 80deg, rgba(255,255,255,0.02) 90deg, transparent 120deg, rgba(255,255,255,0.04) 140deg, transparent 160deg, rgba(255,255,255,0.03) 180deg, transparent 200deg, rgba(255,255,255,0.05) 220deg, transparent 240deg, rgba(255,255,255,0.03) 260deg, transparent 280deg, rgba(255,255,255,0.04) 300deg, transparent 320deg, rgba(255,255,255,0.02) 340deg, transparent 360deg)"
                }} />

                {/* Desktop: fondo difuminado para rellenar costados */}
                {!isMobile && (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      top: "-30px", right: "-30px", bottom: "-30px", left: "-30px",
                      backgroundImage: "url('/hero-bg.webp')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: "grayscale(100%) blur(18px) brightness(0.75)",
                      mixBlendMode: "luminosity",
                      opacity: 0.92,
                    }}
                  />
                )}

                {/* Foto principal */}
                <img
                  src="/hero-bg.webp"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  style={{
                    objectFit: isMobile ? "cover" : "contain",
                    objectPosition: "center center",
                    filter: "grayscale(100%)",
                    mixBlendMode: "luminosity",
                    opacity: 0.75,
                    WebkitMaskImage: isMobile ? "none" : "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
                    maskImage: isMobile ? "none" : "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
                  }}
                />
                {/* Gradiente oscuro para legibilidad del contenido */}
                <div className="pointer-events-none absolute inset-0" style={{
                  background: "linear-gradient(to bottom, rgba(80,4,16,0.55) 0%, rgba(80,4,16,0.10) 35%, rgba(80,4,16,0.10) 65%, rgba(80,4,16,0.65) 100%)"
                }} />

                {/* Ubicación gigante como watermark de fondo */}
                <div className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-hidden pb-0" style={{ bottom: "-10px" }}>
                  <span className="font-condensed font-black uppercase leading-none select-none" style={{
                    fontSize: isMobile ? "105px" : "220px",
                    letterSpacing: "-0.04em",
                    color: "transparent",
                    WebkitTextStroke: "1.5px rgba(255,255,255,0.08)",
                    lineHeight: 0.85,
                  }}>{CAMPAIGN.location.toUpperCase()}</span>
                </div>

                {/* Puntos decorativos */}
                <div className="pointer-events-none absolute right-6 top-6 opacity-20">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      {[...Array(5)].map((_, j) => (
                        <div key={j} className="h-1 w-1 rounded-full bg-white" />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="pointer-events-none absolute left-6 bottom-16 opacity-20">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="h-1 w-1 rounded-full bg-white" />
                      ))}
                    </div>
                  ))}
                </div>

                {/* Línea horizontal decorativa */}
                <div className="pointer-events-none absolute left-0 right-0 top-[42%] flex items-center gap-0 opacity-10">
                  <div className="h-[1px] flex-1 bg-white" />
                </div>

                <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-4 pt-8 pb-16 animate-fade-in-up">

                  {/* Top row: logo + lineas */}
                  <div className="mb-4 flex items-center gap-4 w-full max-w-xs justify-center">
                    <div className="h-[1px] flex-1 bg-white/20" />
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full blur-md opacity-40" style={{ background: "#C8102E", transform: "scale(1.4)" }} />
                      <div className="relative rounded-full p-1 ring-2 ring-white/40 bg-white/10">
                        <img src={partyLogo} alt={CAMPAIGN.partyAbbr} className="h-14 w-14 rounded-full object-cover" />
                      </div>
                    </div>
                    <div className="h-[1px] flex-1 bg-white/20" />
                  </div>

                  {/* Badge lista — más bold */}
                  <div className="mb-5 inline-flex items-center rounded-full border border-white/30 overflow-hidden shadow-2xl" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
                    <span className="bg-white px-6 py-2.5 font-condensed text-[13px] font-black uppercase tracking-[0.18em] text-brand">LISTA {CAMPAIGN.listNumber}</span>
                    <div className="w-[1px] h-5 bg-white/20" />
                    <span className="px-6 py-2.5 font-condensed text-[13px] font-black uppercase tracking-[0.18em] text-white" style={{ background: "rgba(0,0,0,0.35)" }}>OPCIÓN {CAMPAIGN.optionNumber}</span>
                  </div>

                  {/* Heading */}
                  <div className="mb-2 flex items-center gap-3 justify-center">
                    <div className="h-[1px] w-10 bg-white/40 rounded-full" />
                    <span className="font-condensed text-[12px] font-bold uppercase tracking-[0.32em] text-white/90">
                      {CAMPAIGN.tagline}
                    </span>
                    <div className="h-[1px] w-10 bg-white/40 rounded-full" />
                  </div>
                  <div className="mb-5 relative text-center">
                    <span className="block font-display leading-none text-white" style={{
                      fontSize: isMobile ? "96px" : "140px",
                      letterSpacing: "-0.01em",
                      textShadow: "0 2px 0 rgba(0,0,0,0.25), 0 8px 48px rgba(0,0,0,0.5), 0 0 100px rgba(255,255,255,0.08)",
                    }}>
                      {CAMPAIGN.location.toUpperCase()}
                    </span>
                    <div className="mx-auto mt-2 flex items-center gap-1.5 justify-center">
                      <div className="h-[1px] w-8 bg-white/25 rounded-full" />
                      <div className="h-[3px] w-6 bg-white/50 rounded-full" />
                      <div className="h-[4px] w-10 bg-white rounded-full" />
                      <div className="h-[3px] w-6 bg-white/50 rounded-full" />
                      <div className="h-[1px] w-8 bg-white/25 rounded-full" />
                    </div>
                  </div>

                  {/* Candidate pill — más elegante */}
                  <div className="flex w-full max-w-[400px] items-center gap-3 rounded-2xl border border-white/20 px-3 py-2.5 shadow-xl" style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(12px)" }}>
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-2 ring-white/30">
                      <img src={candidateLogo} alt={CAMPAIGN.candidateName} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 text-center">
                      <div className="font-condensed text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">Candidato</div>
                      <div className="font-condensed text-[15px] font-black uppercase tracking-[0.04em] text-white leading-tight">{CAMPAIGN.candidateName}</div>
                    </div>
                    <div className="flex-shrink-0 rounded-lg border border-white/20 px-2.5 py-1" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="font-condensed text-[9px] font-black uppercase tracking-widest text-white/80">{CAMPAIGN.position}</div>
                      <div className="font-condensed text-[13px] font-black text-white leading-none">{CAMPAIGN.year}</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Counter — bold stat block */}
              <div className="relative z-20 -mt-6 flex justify-center px-4 pb-8">
                <div className="relative w-full max-w-[700px] overflow-hidden rounded-2xl shadow-2xl" style={{ background: "white", boxShadow: "0 20px 60px rgba(200,16,46,0.15), 0 4px 20px rgba(0,0,0,0.1)" }}>
                  {/* Franja roja izquierda */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand" />

                  <div className="flex flex-col items-center gap-0 px-8 py-5 text-center md:flex-row md:gap-0 md:text-left md:divide-x md:divide-zinc-100">
                    {/* Stat principal */}
                    <div className="flex-1 flex flex-col items-center md:items-start md:pr-8">
                      <div className="mb-0.5 text-[13px] text-zinc-400">
                        Campaña {CAMPAIGN.year} — ya somos
                      </div>
                      {loadingConteo ? (
                        <div className="my-2 h-[72px] w-36 animate-pulse rounded-xl bg-zinc-100" />
                      ) : (
                        <div className="font-display leading-none text-brand" style={{ fontSize: isMobile ? "72px" : "88px" }}>
                          {totalVotantesGeneral.toLocaleString("es-PY")}
                        </div>
                      )}
                      <div className="text-[13px] font-medium text-zinc-500">
                        personas registradas
                      </div>
                    </div>

                    {/* Divider mobile */}
                    <div className="w-24 h-[1px] bg-zinc-100 my-3 md:hidden" />

                    {/* CTA lateral */}
                    <div className="md:pl-8 flex flex-col items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                        <Users size={18} strokeWidth={2} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500" strokeWidth={2.5} />
                        <span className="text-[12px] font-medium text-zinc-400">¡Y vamos por más!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Forms area */}
              <div className="mx-auto max-w-[900px] px-4 pb-16 pt-6 md:px-6">
                <div className="flex flex-col gap-6">

                  {/* Buscador padrón */}
                  <div className={`${panelCls} p-6`}>
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand/20 bg-brand/8 text-brand flex-shrink-0">
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      </div>
                      <h4 className="font-condensed text-[11px] font-bold uppercase tracking-[0.09em] text-brand">Buscador de Padrón</h4>
                    </div>
                    <div className="flex gap-3">
                      <input type="text" value={cedulaRapida} onChange={(e) => setCedulaRapida(e.target.value.replace(/\D/g, ""))} placeholder="N° de cédula..." className={`${inputCls} flex-1`} />
                      <button onClick={buscarEnPadron} className={btnPrimary}>BUSCAR</button>
                    </div>
                    {resultadoPadron && (
                      <div className="mt-5 rounded-xl border border-dashed border-brand/30 bg-brand/[0.04] px-5 py-5 text-center">
                        <h3 className="mb-4 font-condensed text-xl font-black uppercase tracking-[0.04em] text-brand">
                          {resultadoPadron?.nombre} {resultadoPadron?.apellido}
                        </h3>
                        <p className="mb-0.5 text-sm font-semibold text-zinc-800">Fecha de Nacimiento</p>
                        <p className="mb-3 font-condensed text-[16px] font-black text-brand">
                          {resultadoPadron?.fecha_nacimiento
                            ? resultadoPadron.fecha_nacimiento.includes("-")
                              ? resultadoPadron.fecha_nacimiento.split("-").reverse().join("/")
                              : resultadoPadron.fecha_nacimiento
                            : "—"}
                        </p>
                        <p className="mb-0.5 text-sm font-semibold text-zinc-800">Local de Votación</p>
                        <p className="mb-4 font-condensed text-[13px] font-black uppercase tracking-wide text-brand">{resultadoPadron?.local_votacion}</p>
                        <button
                          onClick={() => {
                            const fechaCasteada = resultadoPadron.fecha_nacimiento && resultadoPadron.fecha_nacimiento.includes("-") ? resultadoPadron.fecha_nacimiento.split("-").reverse().join("/") : (resultadoPadron.fecha_nacimiento || "");
                            setFormVotante({ ...formVotante, ...resultadoPadron, fecha_nacimiento: fechaCasteada });
                            setResultadoPadron(null);
                            showToast("Datos cargados en el formulario.", "success");
                          }}
                          className={btnSuccess}
                        >
                          COPIAR AL FORMULARIO
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Formulario votante */}
                  <div id="formVotante" className={`${panelCls} p-6 md:p-8`}>
                    <div className="mb-6 flex items-center gap-3 border-b border-zinc-100 pb-4">
                      <div className="h-5 w-[3px] flex-shrink-0 rounded-full bg-brand" />
                      <h3 className="font-display text-[18px] uppercase tracking-[0.04em] text-brand">
                        {editIdVotante ? "Editar Votante" : "Registrar Nuevo Votante"}
                      </h3>
                    </div>
                    <form onSubmit={guardarVotante} className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block font-condensed text-[11px] font-bold uppercase tracking-[0.07em] text-zinc-500">Nombre *</label>
                          <input type="text" value={formVotante.nombre} onChange={(e) => setFormVotante({ ...formVotante, nombre: e.target.value })} required className={inputCls} />
                        </div>
                        <div>
                          <label className="mb-1.5 block font-condensed text-[11px] font-bold uppercase tracking-[0.07em] text-zinc-500">Apellido *</label>
                          <input type="text" value={formVotante.apellido} onChange={(e) => setFormVotante({ ...formVotante, apellido: e.target.value })} required className={inputCls} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block font-condensed text-[11px] font-bold uppercase tracking-[0.07em] text-zinc-500">Cédula de Identidad *</label>
                          <input type="text" value={formVotante.cedula} onChange={(e) => setFormVotante({ ...formVotante, cedula: e.target.value.replace(/\D/g, "") })} required className={inputCls} />
                        </div>
                        <div>
                          <label className="mb-1.5 block font-condensed text-[11px] font-bold uppercase tracking-[0.07em] text-zinc-500">Teléfono / WhatsApp</label>
                          <input type="tel" value={formVotante.telefono} onChange={(e) => setFormVotante({ ...formVotante, telefono: e.target.value.replace(/\D/g, "") })} className={inputCls} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block font-condensed text-[11px] font-bold uppercase tracking-[0.07em] text-zinc-500">Fecha de Nacimiento</label>
                          <input
                            type="text" placeholder="DD/MM/AAAA" value={formVotante.fecha_nacimiento}
                            onChange={(e) => {
                              let v = e.target.value.replace(/\D/g, "");
                              if (v.length > 8) v = v.substring(0, 8);
                              if (v.length > 4) { v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3"); }
                              else if (v.length > 2) { v = v.replace(/(\d{2})(\d{1,2})/, "$1/$2"); }
                              setFormVotante({ ...formVotante, fecha_nacimiento: v });
                            }}
                            className={inputCls}
                          />
                        </div>
                        <div className="relative">
                          <label className="mb-1.5 block font-condensed text-[11px] font-bold uppercase tracking-[0.07em] text-zinc-500">Barrio *</label>
                          <div className="relative">
                            <input
                              type="text"
                              autoComplete="off"
                              placeholder={barrioOpen ? "Buscar barrio..." : "Seleccione o busque un barrio..."}
                              value={barrioOpen ? barrioSearch : (barriosDisponibles.includes(formVotante.barrio) ? formVotante.barrio : "")}
                              onFocus={() => { setBarrioOpen(true); setBarrioSearch(""); }}
                              onChange={(e) => setBarrioSearch(e.target.value)}
                              onBlur={() => setTimeout(() => setBarrioOpen(false), 200)}
                              className={inputCls}
                            />
                            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                            </span>
                          </div>
                          {barrioOpen && (
                            <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
                              <div className="max-h-52 overflow-y-auto">
                                {barriosDisponibles.filter(b => b.toLowerCase().includes(barrioSearch.toLowerCase())).length === 0 && (
                                  <p className="px-4 py-3 text-center font-condensed text-[11px] font-bold uppercase tracking-wide text-zinc-400">Sin resultados</p>
                                )}
                                {barriosDisponibles.filter(b => b.toLowerCase().includes(barrioSearch.toLowerCase())).map(b => (
                                  <button
                                    key={b}
                                    type="button"
                                    onMouseDown={() => { setFormVotante({ ...formVotante, barrio: b }); setBarrioOpen(false); }}
                                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${
                                      formVotante.barrio === b
                                        ? "bg-brand/[0.06] font-semibold text-brand"
                                        : "text-zinc-700 hover:bg-zinc-50"
                                    }`}
                                  >
                                    {formVotante.barrio === b && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" />}
                                    {b}
                                  </button>
                                ))}
                              </div>
                              <div className="border-t border-zinc-100">
                                <button
                                  type="button"
                                  onMouseDown={() => { setFormVotante({ ...formVotante, barrio: "__otro__" }); setBarrioOpen(false); }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-50"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                                  Otro (escribir manualmente)
                                </button>
                              </div>
                            </div>
                          )}
                          {(formVotante.barrio === "__otro__" || (formVotante.barrio !== "" && !barriosDisponibles.includes(formVotante.barrio))) && (
                            <input
                              type="text"
                              placeholder="Escriba el nombre del barrio..."
                              value={formVotante.barrio === "__otro__" ? "" : formVotante.barrio}
                              onChange={(e) => { const v = e.target.value.replace(/(^\s*\S|(?<=\s)\S)/g, c => c.toUpperCase()); setFormVotante({ ...formVotante, barrio: v || "__otro__" }); }}
                              className={`${inputCls} mt-2`}
                              autoFocus
                            />
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block font-condensed text-[11px] font-bold uppercase tracking-[0.07em] text-zinc-500">Local de Votación</label>
                        <input type="text" value={formVotante.local_votacion} onChange={(e) => setFormVotante({ ...formVotante, local_votacion: e.target.value })} className={inputCls} placeholder="Ej: Esc. Domingo Martínez de Irala" />
                      </div>
                      <div>
                        <label className="mb-1.5 block font-condensed text-[11px] font-bold uppercase tracking-[0.07em] text-zinc-500">Observación / Comentario</label>
                        <input type="text" value={formVotante.observacion} onChange={(e) => setFormVotante({ ...formVotante, observacion: e.target.value })} className={inputCls} />
                      </div>
                      <div className="mt-1 flex gap-3">
                        {editIdVotante && (
                          <button type="button" onClick={() => { setEditIdVotante(null); setFormVotante({ nombre: "", apellido: "", cedula: "", orden: "", mesa: "", local_votacion: "", seccional: "", barrio: "", fecha_nacimiento: "", telefono: "", observacion: "" }); }} className={`${btnGhost} flex-1`}>
                            CANCELAR
                          </button>
                        )}
                        <button type="submit" disabled={loading} className={`${btnPrimary} flex-[2] py-4 font-display text-[18px]`}>
                          {loading ? "PROCESANDO..." : editIdVotante ? "GUARDAR CAMBIOS" : "REGISTRAR VOTANTE"}
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ═══ MIS VOTANTES ════════════════════════════════════ */}
          {activeTab === "votantes" && (
            <div className="mx-auto max-w-[900px] p-4 md:p-8">
              <div className={`${panelCls} p-5 md:p-6`}>
                <div className="mb-5 flex items-center gap-3 border-b border-zinc-100 pb-4">
                  <div className="h-5 w-[3px] flex-shrink-0 rounded-full bg-brand" />
                  <h3 className="font-display text-[17px] uppercase tracking-[0.04em] text-brand">Mi Lista de Votantes</h3>
                </div>
                <input type="text" placeholder="Buscar por nombre o cédula..." value={busquedaLista} onChange={(e) => setBusquedaLista(e.target.value)} className={`${inputCls} mb-5`} />
                {misVotantes.length === 0 && !loading ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 py-12 text-center">
                    <div className="mb-2 font-condensed text-[13px] font-black uppercase tracking-wide text-zinc-300">Sin votantes registrados</div>
                    <div className="text-[11px] text-zinc-400">Registrá tu primer votante desde el Panel Principal</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {(misVotantes || []).slice(0, visibleMisVotantes).map((v) => (
                      <div key={v?.id} className="group relative overflow-hidden rounded-xl border border-zinc-100 bg-white transition-shadow hover:shadow-md" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                        {/* Accent bar izquierda */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand rounded-l-xl" />

                        {/* Contenido */}
                        <div className="pl-4 pr-4 pt-4 pb-3">
                          {/* Nombre */}
                          <div className="font-condensed text-[18px] font-black uppercase leading-tight text-zinc-900">
                            {v?.nombre} {v?.apellido}
                          </div>

                          {/* CI */}
                          <div className="mt-0.5 text-[11px] text-zinc-400">
                            C.I. {v?.cedula || "—"}
                          </div>

                          {/* Tags secundarios */}
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {v?.barrio && (
                              <span className="rounded-full border border-brand/15 bg-brand/6 px-2.5 py-0.5 font-condensed text-[10px] font-bold uppercase tracking-wide text-brand">
                                {v.barrio}
                              </span>
                            )}
                            {v?.mesa && (
                              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 font-condensed text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                                Mesa {v.mesa}
                              </span>
                            )}
                            {v?.telefono && (
                              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 font-condensed text-[10px] font-bold tracking-wide text-zinc-400">
                                {v.telefono}
                              </span>
                            )}
                          </div>

                          {v?.local_votacion && (
                            <div className="mt-2 text-[11px] text-zinc-400 leading-tight">
                              📍 {v.local_votacion}
                            </div>
                          )}
                        </div>

                        {/* Footer con acciones */}
                        <div className="flex border-t border-zinc-100">
                          <button
                            onClick={() => { setFormVotante({ ...v, fecha_nacimiento: v.fecha_nacimiento && v.fecha_nacimiento.includes("-") ? v.fecha_nacimiento.split("-").reverse().join("/") : (v.fecha_nacimiento || "") }); setEditIdVotante(v.id); setActiveTab("inicio"); setTimeout(() => document.getElementById("formVotante").scrollIntoView({ behavior: "smooth" }), 100); }}
                            className="flex-1 py-2.5 font-condensed text-[10px] font-black uppercase tracking-wide text-zinc-500 transition hover:bg-zinc-50"
                          >
                            Editar
                          </button>
                          <div className="w-px bg-zinc-100" />
                          <button
                            onClick={() => setTarjetaVotante(v)}
                            className="flex-1 py-2.5 font-condensed text-[10px] font-black uppercase tracking-wide text-brand transition hover:bg-brand/5"
                          >
                            Tarjeta
                          </button>
                          <div className="w-px bg-zinc-100" />
                          <button
                            onClick={() => setConfirmModal({ mensaje: `¿Eliminar a ${v.nombre} de tu lista? Esta acción no se puede deshacer.`, onConfirm: async () => { setLoading(true); const { error } = await supabase.from("votantes").delete().eq("id", v.id); if (!error) { setMisVotantes(prev => prev.filter(item => item.id !== v.id)); setMisVotantesTotal(prev => prev - 1); const conteo = await supabase.rpc("obtener_conteo_total_votantes"); if (conteo.data !== null) setConteoGlobal(conteo.data); } else { showToast("Error: " + error.message, "error"); } setLoading(false); } })}
                            className="flex-1 py-2.5 font-condensed text-[10px] font-black uppercase tracking-wide text-red-400 transition hover:bg-red-50"
                          >
                            Borrar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(() => {
                  const hayMasUI = visibleMisVotantes < misVotantes.length;
                  const hayMasDB = misVotantes.length < misVotantesTotal;
                  const restante = misVotantesTotal - visibleMisVotantes;
                  if (!hayMasUI && !hayMasDB) return null;
                  return (
                    <div className="mt-3">
                      <button
                        disabled={loadingMore}
                        onClick={() => {
                          const newVisible = visibleMisVotantes + 10;
                          setVisibleMisVotantes(newVisible);
                          if (newVisible >= misVotantes.length && hayMasDB) {
                            const next = misVotantesPage + 1;
                            setMisVotantesPage(next);
                            cargarMisVotantes(busquedaLista, next, true);
                          }
                        }}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 font-condensed text-[11px] font-black uppercase tracking-[0.1em] text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-50"
                      >
                        {loadingMore ? "Cargando..." : `Ver más (${restante > 0 ? restante.toLocaleString("es-PY") : ""} restantes)`}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ═══ LISTA GENERAL ═══════════════════════════════════ */}
          {activeTab === "lista_general" && userRole === "administrador" && (
            <div className="mx-auto max-w-[900px] p-4 md:p-8">
              <div className={`${panelCls} p-5 md:p-6`}>
                <div className="mb-5 flex items-center gap-3 border-b border-zinc-100 pb-4">
                  <div className="h-5 w-[3px] flex-shrink-0 rounded-full bg-brand" />
                  <h3 className="font-display text-[17px] uppercase tracking-[0.04em] text-brand">Control de Asistencia General (Día D)</h3>
                </div>
                <input type="text" placeholder="Buscar por cédula..." value={busquedaListaGeneral} onChange={(e) => setBusquedaListaGeneral(e.target.value.replace(/\D/g, ""))} className={`${inputCls} mb-5`} />
                {listaGeneral.length === 0 && !loading ? (
                  <div className="mb-4 rounded-xl border border-dashed border-zinc-200 py-12 text-center">
                    <div className="font-condensed text-[12px] font-black uppercase tracking-wide text-zinc-300">Sin registros</div>
                  </div>
                ) : (
                  <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {(listaGeneral || []).slice(0, visibleListaGeneral).map((v) => {
                      const toggleVoto = async () => {
                        const checked = !v.ha_votado;
                        const { error } = await supabase.from("votantes").update({ ha_votado: checked }).eq("id", v.id);
                        if (!error) {
                          setListaGeneral(prev => prev.map(item => item.id === v.id ? { ...item, ha_votado: checked } : item));
                          setListaGeneralVotados(prev => checked ? prev + 1 : prev - 1);
                        } else { showToast("Error: " + error.message, "error"); }
                      };
                      return (
                        <div key={v?.id} className="relative overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md"
                          style={{ borderColor: v.ha_votado ? "rgba(5,150,105,0.25)" : "rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                          {/* Accent bar — verde si votó, gris si no */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-colors duration-300"
                            style={{ background: v.ha_votado ? "#059669" : "#e4e4e7" }} />

                          <div className="pl-4 pr-3 pt-3.5 pb-3 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-condensed text-[17px] font-black uppercase leading-tight text-zinc-900">
                                {v?.nombre} {v?.apellido}
                              </div>
                              <div className="mt-0.5 text-[11px] text-zinc-400">C.I. {v?.cedula}</div>

                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {v?.local_votacion && (
                                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 font-condensed text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                                    📍 {v.local_votacion}
                                  </span>
                                )}
                                {v?.por_parte_de_nombre && (
                                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 font-condensed text-[10px] font-bold tracking-wide text-zinc-400">
                                    por {v.por_parte_de_nombre}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Botón Ya Votó */}
                            <button onClick={toggleVoto}
                              className="flex-shrink-0 flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 transition-all duration-200 cursor-pointer"
                              style={{ background: v.ha_votado ? "rgba(5,150,105,0.08)" : "rgba(0,0,0,0.03)", border: v.ha_votado ? "1px solid rgba(5,150,105,0.2)" : "1px solid rgba(0,0,0,0.08)" }}
                            >
                              <div className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${v.ha_votado ? "bg-emerald-500" : "border-2 border-zinc-300"}`}>
                                {v.ha_votado && (
                                  <svg viewBox="0 0 12 10" fill="none" className="h-3.5 w-3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="1,5 4.5,8.5 11,1" />
                                  </svg>
                                )}
                              </div>
                              <span className={`font-condensed text-[9px] font-black uppercase tracking-wide leading-none ${v.ha_votado ? "text-emerald-600" : "text-zinc-400"}`}>
                                {v.ha_votado ? "Votó" : "Votó?"}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mb-6">
                  {(() => {
                    const hayMasUI = visibleListaGeneral < listaGeneral.length;
                    const hayMasDB = listaGeneral.length < listaGeneralTotal;
                    const restante = listaGeneralTotal - visibleListaGeneral;
                    if (!hayMasUI && !hayMasDB) return null;
                    return (
                      <button
                        disabled={loadingMore}
                        onClick={() => {
                          const newVisible = visibleListaGeneral + 10;
                          setVisibleListaGeneral(newVisible);
                          if (newVisible >= listaGeneral.length && hayMasDB) {
                            const next = listaGeneralPage + 1;
                            setListaGeneralPage(next);
                            cargarListaGeneral(busquedaListaGeneral, next, true);
                          }
                        }}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 font-condensed text-[11px] font-black uppercase tracking-[0.1em] text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-50"
                      >
                        {loadingMore ? "Cargando..." : `Ver más (${restante > 0 ? restante.toLocaleString("es-PY") : ""} restantes)`}
                      </button>
                    );
                  })()}
                </div>
                <div className="mx-auto max-w-[440px] rounded-xl border border-zinc-200 bg-zinc-50 px-8 py-7 text-center">
                  <h4 className="mb-4 font-condensed text-[11px] font-bold uppercase tracking-[0.09em] text-zinc-500">Resumen de Participación</h4>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="font-display text-[56px] leading-none text-brand">
                      {listaGeneralTotal > 0 ? Math.round((listaGeneralVotados / listaGeneralTotal) * 100) : 0}%
                    </span>
                    <span className="font-condensed text-base font-semibold text-zinc-500">participación</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-zinc-700">
                    Han votado <span className="font-bold text-brand">{listaGeneralVotados.toLocaleString("es-PY")}</span>{" "}de{" "}<strong>{listaGeneralTotal.toLocaleString("es-PY")}</strong> personas registradas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═══ EQUIPO ══════════════════════════════════════════ */}
          {activeTab === "equipo" && userRole === "administrador" && (
            <div className="mx-auto max-w-[900px] p-4 md:p-8">
              <div className="flex flex-col gap-6">
                <div className={`${panelCls} p-6 md:p-8`}>
                  <div className="mb-6 flex items-center gap-3 border-b border-zinc-100 pb-4">
                    <div className="h-5 w-[3px] flex-shrink-0 rounded-full bg-brand" />
                    <h3 className="font-display text-[17px] uppercase tracking-[0.04em] text-brand">Gestión de Equipo</h3>
                  </div>
                  <form onSubmit={guardarEquipo} className="flex flex-col gap-4">
                    <input type="text" placeholder="Nombre y Apellido" value={formEquipo.nombre} onChange={(e) => { const v = e.target.value.replace(/(^\s*\S|(?<=\s)\S)/g, c => c.toUpperCase()); setFormEquipo({ ...formEquipo, nombre: v }); }} required className={inputCls} />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <input type="text" placeholder="Teléfono" value={formEquipo.telefono} onChange={(e) => setFormEquipo({ ...formEquipo, telefono: e.target.value.replace(/\D/g, "") })} className={inputCls} />
                      <input type="text" placeholder="Zona o Barrio" value={formEquipo.zona} onChange={(e) => { const v = e.target.value.replace(/(^\s*\S|(?<=\s)\S)/g, c => c.toUpperCase()); setFormEquipo({ ...formEquipo, zona: v }); }} className={inputCls} />
                    </div>
                    {!editIdEquipo && (
                      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
                        <p className="mb-3 font-condensed text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500">Credenciales de Acceso</p>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <input type="email" placeholder="Correo electrónico" value={formEquipo.email} onChange={(e) => setFormEquipo({ ...formEquipo, email: e.target.value })} required className={inputSmCls} />
                          <input type="password" placeholder="Contraseña (mín 6 letras)" value={formEquipo.password} onChange={(e) => setFormEquipo({ ...formEquipo, password: e.target.value })} required minLength={6} className={inputSmCls} />
                        </div>
                      </div>
                    )}
                    <select value={formEquipo.rol} onChange={(e) => setFormEquipo({ ...formEquipo, rol: e.target.value })} required className={inputCls}>
                      <option value="coordinador">Rol: Coordinador</option>
                      <option value="administrador">Rol: Administrador</option>
                    </select>
                    <div className="mt-1 flex gap-3">
                      {editIdEquipo && (
                        <button type="button" onClick={() => { setEditIdEquipo(null); setFormEquipo({ nombre: "", telefono: "", rol: "coordinador", zona: "", email: "", password: "" }); }} className={`${btnGhost} flex-1`}>CANCELAR</button>
                      )}
                      <button type="submit" disabled={loading} className={`${btnPrimary} flex-[2] py-3.5`}>
                        {loading ? "PROCESANDO..." : editIdEquipo ? "GUARDAR CAMBIOS" : "CREAR USUARIO"}
                      </button>
                    </div>
                  </form>
                </div>

                <div className={`${panelCls} p-5 md:p-6`}>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-4 w-[3px] flex-shrink-0 rounded-full bg-brand" />
                    <h4 className="font-display text-[15px] uppercase tracking-[0.05em] text-brand">Miembros Activos</h4>
                  </div>
                  <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-100">
                    {(equipo || []).slice(0, visibleEquipo).map((m) => (
                      <div key={m?.id} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50">
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-semibold leading-tight text-zinc-900">{m?.nombre}</div>
                          <div className={`text-[11px] font-bold capitalize ${m?.rol === "administrador" ? "text-brand" : "text-zinc-400"}`}>{m?.rol}</div>
                          {(m?.telefono || m?.zona) && (
                            <div className="mt-0.5 text-[11px] text-zinc-400">
                              {[m?.telefono, m?.zona].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-shrink-0 gap-2">
                          <button onClick={() => { setFormEquipo(m); setEditIdEquipo(m.id); window.scrollTo(0, 0); }}
                            className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-condensed text-[11px] font-bold uppercase tracking-wide text-zinc-600 transition-colors hover:bg-zinc-50">
                            Editar
                          </button>
                          <button onClick={() => setConfirmModal({ mensaje: `¿Eliminar a ${m.nombre}? Se eliminará su acceso y todos sus datos permanentemente.`, onConfirm: async () => { setLoading(true); try { const { error } = await supabase.rpc('eliminar_usuario_completo', { target_equipo_id: m.id }); if (error) throw error; showToast("Usuario eliminado correctamente", "success"); cargarDatos(); } catch (error) { showToast("Error: " + error.message, "error"); } finally { setLoading(false); } } })}
                            className="cursor-pointer rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 font-condensed text-[11px] font-bold uppercase tracking-wide text-red-600 transition-colors hover:bg-red-100">
                            Borrar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {equipo.length > visibleEquipo && (
                    <button
                      onClick={() => setVisibleEquipo(v => v + 10)}
                      className="mt-3 w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 font-condensed text-[11px] font-black uppercase tracking-[0.1em] text-zinc-500 transition hover:bg-zinc-100"
                    >
                      Ver más ({(equipo.length - visibleEquipo).toLocaleString("es-PY")} restantes)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ REPORTES ════════════════════════════════════════ */}
          {activeTab === "reportes" && userRole === "administrador" && (
            <div className="mx-auto max-w-[900px] p-4 md:p-8">
              <div className="flex flex-col gap-6">
                <div className={`${panelCls} p-6 md:p-8`}>
                  <div className="mb-5 flex items-center gap-3 border-b border-zinc-100 pb-4">
                    <div className="h-5 w-[3px] flex-shrink-0 rounded-full bg-brand" />
                    <h3 className="font-display text-[17px] uppercase tracking-[0.04em] text-brand">Ranking (Top 10)</h3>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {(rendimientoEquipo || []).slice(0, 10).map((m, index) => {
                      const isFirst = index === 0;
                      const isSecond = index === 1;
                      const isThird = index === 2;
                      return (
                        <div key={m?.id} className="relative overflow-hidden rounded-xl" style={{
                          background: isFirst ? "linear-gradient(135deg, #7a091b 0%, #C8102E 100%)" : "#fff",
                          border: isFirst ? "none" : `1px solid ${isSecond ? "#e4e4e7" : isThird ? "rgba(251,191,36,0.3)" : "#f4f4f5"}`,
                          boxShadow: isFirst ? "0 8px 28px rgba(200,16,46,0.35)" : "0 1px 3px rgba(0,0,0,0.06)"
                        }}>
                          {!isFirst && (
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{
                              background: isSecond ? "#a1a1aa" : isThird ? "#d97706" : "#e4e4e7"
                            }} />
                          )}
                          <div className="flex items-center gap-3 px-4 py-3" style={{ paddingLeft: isFirst ? "1rem" : "1.25rem" }}>
                            <span className={`font-display leading-none w-8 flex-shrink-0 text-center ${
                              isFirst ? "text-[44px] text-white/70" :
                              isSecond ? "text-[36px] text-zinc-400" :
                              isThird ? "text-[36px] text-amber-600" :
                              "text-[30px] text-zinc-300"
                            }`}>{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              <div className={`truncate text-[15px] font-bold leading-tight ${isFirst ? "text-white" : "text-zinc-900"}`}>
                                {m?.nombre}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className={`font-display leading-none ${isFirst ? "text-[44px] text-white" : "text-[36px] text-brand"}`}>
                                {m?.cantidad.toLocaleString("es-PY")}
                              </div>
                              <div className={`text-[10px] font-semibold uppercase tracking-wider ${isFirst ? "text-white/60" : "text-zinc-400"}`}>
                                votantes
                              </div>
                            </div>
                          </div>
                          <div className={`mx-4 mb-3 h-[3px] overflow-hidden rounded-full ${isFirst ? "bg-white/20" : "bg-zinc-100"}`}>
                            <div className="h-full rounded-full" style={{
                              width: `${m?.porcentaje}%`,
                              background: isFirst ? "rgba(255,255,255,0.65)" : "linear-gradient(90deg, #9b0c22, #C8102E)"
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`${panelCls} p-5 md:p-6`}>
                  <div className="mb-4 border-b border-zinc-100 pb-4">
                    <div className="mb-2.5 flex items-center gap-3">
                      <div className="h-5 w-[3px] flex-shrink-0 rounded-full bg-brand" />
                      <h3 className="font-display text-[17px] uppercase tracking-[0.04em] text-brand">Mapa de Calor — Barrios</h3>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] text-zinc-400">Intensidad según cantidad de votantes registrados</p>
                      <button
                        onClick={async () => {
                          setExportandoMapa(true);
                          await new Promise(r => setTimeout(r, 80));
                          const { default: html2canvas } = await import("html2canvas");
                          const canvas = await html2canvas(mapaCalorRef.current, {
                            scale: 2,
                            backgroundColor: "#ffffff",
                            logging: false,
                          });
                          setExportandoMapa(false);
                          const url = canvas.toDataURL("image/png");
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `mapa-calor-barrios-${CAMPAIGN.location.toLowerCase().replace(/\s+/g, "-")}${CAMPAIGN.year}.png`;
                          a.click();
                        }}
                        className="flex-shrink-0 rounded-xl border border-brand/20 bg-brand/5 px-4 py-2 font-condensed text-[11px] font-black uppercase tracking-[0.08em] text-brand transition hover:bg-brand/10"
                      >
                        ↓ Exportar imagen
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const sorted = (conteoBarrio || []).slice().sort((a, b) => b.total - a.total);
                    const maxVal = sorted[0]?.total || 1;
                    const totalGeneral = sorted.reduce((s, b) => s + b.total, 0);
                    const visibles = mostrarTodosBarrios ? sorted : sorted.slice(0, 10);
                    const hayMas = sorted.length > 10;
                    return (
                      <div ref={mapaCalorRef} className="overflow-hidden rounded-xl" style={{ background: "#f4f4f5" }}>
                        {exportandoMapa && (
                          <div className="mb-0 px-5 py-5" style={{ background: "linear-gradient(135deg, #5c0614 0%, #C8102E 100%)" }}>
                            <div className="mb-1 font-condensed text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: "rgba(255,255,255,0.5)" }}>Campaña {CAMPAIGN.candidateName} — {CAMPAIGN.position} {CAMPAIGN.year}</div>
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <div className="font-display leading-none text-white" style={{ fontSize: "14px", letterSpacing: "0.08em", opacity: 0.7 }}>MAPA DE CALOR</div>
                                <div className="font-display leading-none text-white" style={{ fontSize: "44px", letterSpacing: "0.02em" }}>{CAMPAIGN.location.toUpperCase()}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-condensed text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>Total registrados</div>
                                <div className="font-display leading-none text-white" style={{ fontSize: "56px", lineHeight: 1 }}>{totalGeneral}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="p-4">

                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                          {visibles.map((b) => {
                            const ratio = b.total / maxVal;
                            const r = Math.round(200 * ratio);
                            const g = Math.round(16 * ratio);
                            const bv = Math.round(46 * ratio);
                            const bg = `rgba(${r}, ${g}, ${bv}, ${0.08 + ratio * 0.88})`;
                            const isLight = ratio < 0.45;
                            const textColor = isLight ? "#C8102E" : "#ffffff";
                            const subColor = isLight ? "rgba(200,16,46,0.55)" : "rgba(255,255,255,0.65)";
                            return (
                              <div
                                key={b.name}
                                className="relative overflow-hidden rounded-xl px-4 py-3"
                                style={{ background: bg, border: `1px solid rgba(200,16,46,${0.08 + ratio * 0.25})` }}
                              >
                                <div className="text-[11px] font-bold uppercase leading-tight" style={{ color: subColor, letterSpacing: "0.06em" }}>
                                  {b.name}
                                </div>
                                <div className="font-display text-[32px] leading-tight" style={{ color: textColor }}>
                                  {b.total.toLocaleString("es-PY")}
                                </div>
                                <div className="mt-4 h-1 w-full overflow-hidden rounded-full" style={{ background: "rgba(0,0,0,0.1)" }}>
                                  <div className="h-full rounded-full" style={{ width: `${Math.round(ratio * 100)}%`, background: isLight ? "#C8102E" : "rgba(255,255,255,0.6)" }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {exportandoMapa && (
                          <div className="mt-4 flex items-center justify-between">
                            <div className="h-[1px] flex-1 rounded-full bg-zinc-200" />
                            <div className="mx-3 font-condensed text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                              {new Date().toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" })}
                            </div>
                            <div className="h-[1px] flex-1 rounded-full bg-zinc-200" />
                          </div>
                        )}
                        </div>{/* cierre p-4 */}

                        {hayMas && !mostrarTodosBarrios && (
                          <div className="col-span-2 mt-1 md:col-span-3">
                            <button
                              onClick={() => setMostrarTodosBarrios(true)}
                              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 font-condensed text-[11px] font-black uppercase tracking-[0.1em] text-zinc-500 transition hover:bg-zinc-100"
                            >
                              Ver todos los barrios ({sorted.length - 10} más)
                            </button>
                          </div>
                        )}
                        {mostrarTodosBarrios && hayMas && (
                          <div className="col-span-2 mt-1 md:col-span-3">
                            <button
                              onClick={() => setMostrarTodosBarrios(false)}
                              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 font-condensed text-[11px] font-black uppercase tracking-[0.1em] text-zinc-500 transition hover:bg-zinc-100"
                            >
                              Ver menos ↑
                            </button>
                          </div>
                        )}

                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {tarjetaVotante && (
        <TarjetaModal votante={tarjetaVotante} onClose={() => setTarjetaVotante(null)} />
      )}
    </div>
  );
}

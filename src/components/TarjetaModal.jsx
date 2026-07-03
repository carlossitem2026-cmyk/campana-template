import { useRef } from "react";
import partyLogo from "../img/party-logo.webp";
import candidateLogo from "../img/candidate-logo.webp";
import { CAMPAIGN } from "../config/campaign";

export function TarjetaModal({ votante, onClose }) {
  const cardRef = useRef(null);

  const descargar = async () => {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `votante-${votante.nombre}-${votante.apellido}.png`.replace(/\s+/g, "-").toLowerCase();
    a.click();
  };

  const compartirWhatsApp = () => {
    const lineas = [
      `🗳️ *${votante.nombre} ${votante.apellido}*`,
      ``,
      `📍 Local: *${votante.local_votacion || "—"}*`,
      `🔢 Mesa: *${votante.mesa || "—"}*`,
      votante.seccional ? `📋 Seccional: *${votante.seccional}*` : null,
      votante.barrio ? `🏘️ Barrio: *${votante.barrio}*` : null,
      ``,
      `¡Recordá votar por ${CAMPAIGN.candidateName}!`,
      `*Lista ${CAMPAIGN.listNumber} — Opción ${CAMPAIGN.optionNumber} — ${CAMPAIGN.position} ${CAMPAIGN.location} ${CAMPAIGN.year}* 🟢`,
    ].filter(Boolean).join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(lineas)}`, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div className="flex w-full max-w-[340px] flex-col gap-3" onClick={(e) => e.stopPropagation()}>

        {/* Card */}
        <div ref={cardRef} className="overflow-hidden rounded-2xl" style={{ background: "#fff", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>

          {/* Header rojo */}
          <div className="relative flex items-center gap-3 px-5 py-4" style={{ background: "linear-gradient(135deg, #5c0614 0%, #C8102E 100%)" }}>
            <img
              src={partyLogo}
              alt={CAMPAIGN.partyAbbr}
              crossOrigin="anonymous"
              className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
              style={{ border: "2px solid rgba(255,255,255,0.3)" }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-condensed text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">{CAMPAIGN.party} — {CAMPAIGN.partyAbbr}</div>
              <div className="font-condensed text-[17px] font-black uppercase leading-tight text-white">{CAMPAIGN.candidateName}</div>
              <div className="font-condensed text-[10px] font-bold uppercase tracking-[0.08em] text-white/75">{CAMPAIGN.position} · {CAMPAIGN.location} {CAMPAIGN.year}</div>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center rounded-xl px-3 py-2" style={{ background: "rgba(0,0,0,0.25)" }}>
              <div className="font-condensed text-[8px] font-bold uppercase tracking-[0.15em] text-white/60">Lista</div>
              <div className="font-condensed text-[26px] font-black leading-none text-white">{CAMPAIGN.listNumber}</div>
              <div className="font-condensed text-[9px] font-bold text-white/70">Opción {CAMPAIGN.optionNumber}</div>
            </div>
          </div>

          {/* Nombre votante */}
          <div className="px-5 pt-4 pb-2 text-center">
            <div className="mb-0.5 font-condensed text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Registrado/a</div>
            <div className="font-condensed text-[22px] font-black uppercase leading-tight text-zinc-900">
              {votante.nombre} {votante.apellido}
            </div>
            {votante.cedula && (
              <div className="mt-0.5 font-condensed text-[12px] font-bold text-zinc-400">
                C.I. {votante.cedula}
              </div>
            )}
          </div>

          <div className="mx-5 h-[1px] bg-zinc-100" />

          {/* Datos de votación */}
          <div className="grid grid-cols-2 gap-2.5 px-5 py-4">
            <div className="col-span-2 rounded-xl px-4 py-3" style={{ background: "rgba(200,16,46,0.06)", border: "1px solid rgba(200,16,46,0.12)" }}>
              <div className="font-condensed text-[9px] font-bold uppercase tracking-[0.18em] text-brand/60">Local de Votación</div>
              <div className="font-condensed text-[13px] font-black uppercase leading-snug text-zinc-900">{votante.local_votacion || "—"}</div>
            </div>
            <div className="rounded-xl bg-zinc-50 px-4 py-3">
              <div className="font-condensed text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">Mesa</div>
              <div className="font-condensed text-[28px] font-black leading-none text-brand">{votante.mesa || "—"}</div>
            </div>
            <div className="rounded-xl bg-zinc-50 px-4 py-3">
              <div className="font-condensed text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">Seccional</div>
              <div className="font-condensed text-[16px] font-black uppercase text-zinc-900">{votante.seccional || "—"}</div>
            </div>
            {votante.barrio && (
              <div className="col-span-2 rounded-xl bg-zinc-50 px-4 py-3">
                <div className="font-condensed text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">Barrio</div>
                <div className="font-condensed text-[13px] font-black uppercase text-zinc-900">{votante.barrio}</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-3 text-center">
            <div className="font-condensed text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
              ¡Contamos con tu voto! · {CAMPAIGN.location} {CAMPAIGN.year}
            </div>
          </div>

          {/* Barra inferior */}
          <div className="h-2" style={{ background: "linear-gradient(90deg, #5c0614 0%, #C8102E 50%, #5c0614 100%)" }} />
        </div>

        {/* Botones */}
        <div className="flex gap-2">
          <button
            onClick={descargar}
            className="flex-1 rounded-xl py-3 font-condensed text-[12px] font-black uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-90"
            style={{ background: "#18181b" }}
          >
            ↓ Descargar
          </button>
          <button
            onClick={compartirWhatsApp}
            className="flex-1 rounded-xl py-3 font-condensed text-[12px] font-black uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-90"
            style={{ background: "#25D366" }}
          >
            WhatsApp
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 font-condensed text-[13px] font-black text-zinc-500 transition hover:bg-zinc-50"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

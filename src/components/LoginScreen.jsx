import { useState } from "react";
import anrlogo from "../img/anrlogo.webp";

export function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError(false);
    const { error } = await onLogin(email, password);
    if (error) setLoginError(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand/[0.07] blur-[90px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[500px] rounded-full bg-brand/[0.04] blur-[80px]" />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #C8102E, #C8102E 1px, transparent 1px, transparent 40px)' }} />
      </div>

      <div className="animate-fade-in-up relative z-10 w-full max-w-[400px] rounded-2xl border border-zinc-200 bg-white px-10 py-12 text-center shadow-xl shadow-zinc-900/[0.06]">

        <div className="mb-6 inline-flex">
          <div className="rounded-full bg-white p-1.5 shadow-md ring-2 ring-brand/[0.15]">
            <img src={anrlogo} alt="Logo Oficial" className="h-[80px] w-[80px] rounded-full object-cover" />
          </div>
        </div>

        <span className="mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[0.12em] text-brand">
          Sistema de Gestión Electoral
        </span>

        <h1 className="mb-1 font-display text-[38px] leading-none tracking-[0.04em] text-zinc-900">
          BIENVENIDO
        </h1>
        <p className="mb-8 text-[13px] font-medium text-zinc-400">
          Gestión Política · David Dvdburg
        </p>

        {loginError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-[13px] font-semibold text-red-700">
            Credenciales incorrectas. Intente de nuevo.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          <div>
            <label className="mb-1.5 block font-condensed text-[11px] font-bold uppercase tracking-[0.07em] text-zinc-500">
              Correo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="usuario@gmail.com"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-3 text-[15px] font-medium text-zinc-900 outline-none placeholder:text-zinc-300 transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-condensed text-[11px] font-bold uppercase tracking-[0.07em] text-zinc-500">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-3 text-[15px] font-medium text-zinc-900 outline-none placeholder:text-zinc-300 transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-brand py-[15px] font-display text-[22px] tracking-[0.08em] text-white shadow-brand transition-all duration-200 hover:bg-brand-dark hover:shadow-brand-lg hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {loading ? "VERIFICANDO..." : "ENTRAR AL PANEL"}
          </button>
        </form>
      </div>
    </div>
  );
}

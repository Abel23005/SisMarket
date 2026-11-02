import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/apiError';

export default function SetupOwnerPage() {
  const { isAuthenticated, setupOwner, registerBusiness } = useAuth();
  const navigate = useNavigate();
  const isBusinessRegistration = useLocation().pathname === '/register-business';
  const [available, setAvailable] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isBusinessRegistration) {
      setAvailable(true);
      return;
    }
    api.get<{ canSetupOwner: boolean }>('/auth/setup-status')
      .then(({ data }) => setAvailable(data.canSetupOwner))
      .catch((err) => { setAvailable(false); setError(getApiErrorMessage(err, 'No se pudo consultar el estado inicial.')); });
  }, [isBusinessRegistration]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSaving(true);
    try {
      const input = { username, email, fullName, businessName, password };
      if (isBusinessRegistration) await registerBusiness(input);
      else await setupOwner(input);
      navigate('/dashboard', { replace: true });
    } catch (err) { setError(getApiErrorMessage(err, 'No se pudo crear el negocio.')); }
    finally { setSaving(false); }
  }

  return <main className="grid min-h-dvh place-items-center bg-[#f7f6f3] px-4 py-10"><section className="w-full max-w-lg rounded-2xl border border-slate-200 border-t-[3px] border-t-[var(--brand-red)] bg-white p-7 shadow-sm">
    <div className="mb-6 flex items-center gap-3"><BrandMark compact /><div><p className="font-bold">SisMarket</p><p className="text-sm text-slate-500">{isBusinessRegistration ? 'Nuevo negocio' : 'Configuración inicial'}</p></div><span className="ml-auto rounded-full bg-[#f8f1e7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#72552b]">Perú</span></div>
    <h1 className="text-2xl font-bold">{isBusinessRegistration ? 'Registrar mi minimarket' : 'Crear cuenta del dueño'}</h1>
    <p className="mt-2 text-sm text-slate-500">{isBusinessRegistration ? 'Crea una cuenta separada para administrar tu negocio.' : 'La contraseña debe tener al menos 12 caracteres.'}</p>
    {available === null ? <p className="mt-6 text-sm text-slate-500">Verificando configuración…</p> : !available ? <p role="alert" className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">La configuración inicial ya se completó. Inicia sesión con la cuenta del dueño.</p> : <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Nombre completo<input required maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
      <label className="text-sm font-medium">Nombre del negocio<input required maxLength={140} value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
      <label className="text-sm font-medium">Usuario<input required minLength={3} maxLength={80} pattern="[a-zA-Z0-9._-]{3,80}" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
      <label className="text-sm font-medium">Correo electrónico<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
      <label className="text-sm font-medium sm:col-span-2">Contraseña<input required type="password" minLength={12} maxLength={100} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
      <button disabled={saving} className="h-11 rounded-xl bg-neutral-950 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{saving ? 'Creando cuenta…' : isBusinessRegistration ? 'Crear negocio e ingresar' : 'Crear dueño e ingresar'}</button>
    </form>}
    {error && available === false && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <p className="mt-5 text-center text-sm text-slate-500"><Link to="/login" className="font-semibold underline">Volver al inicio de sesión</Link></p>
  </section></main>;
}

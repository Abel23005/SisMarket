import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../lib/apiError';

export default function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { acceptInvitation, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!token) { setError('El enlace no contiene un token de invitación. Solicita uno nuevo al dueño.'); return; }
    if (password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    setSaving(true);
    try {
      await acceptInvitation({ token, username, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo aceptar la invitación. Revisa si el enlace sigue vigente.'));
    } finally { setSaving(false); }
  }

  return <main className="grid min-h-dvh place-items-center bg-[#f7f6f3] px-4 py-10">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 border-t-[3px] border-t-[var(--brand-red)] bg-white p-7 shadow-sm">
      <div className="mb-6 flex items-center gap-3"><BrandMark compact /><div><p className="font-bold">SisMarket</p><p className="text-sm text-slate-500">Activar cuenta del equipo</p></div><span className="ml-auto rounded-full bg-[#f8f1e7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#72552b]">Perú</span></div>
      <h1 className="text-2xl font-bold">Acepta tu invitación</h1>
      <p className="mt-2 text-sm text-slate-500">Crea un usuario y una contraseña de al menos 10 caracteres para ingresar al sistema.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">Nombre de usuario<input required minLength={3} maxLength={80} pattern="[a-zA-Z0-9._-]{3,80}" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" placeholder="nombre.apellido" /></label>
        <label className="block text-sm font-medium">Contraseña<input required minLength={10} maxLength={100} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
        <label className="block text-sm font-medium">Repetir contraseña<input required minLength={10} maxLength={100} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={saving || !token} className="h-11 w-full rounded-xl bg-neutral-950 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Activando cuenta…' : 'Crear cuenta y entrar'}</button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500"><Link className="font-semibold text-slate-900 underline" to="/login">Volver a iniciar sesión</Link></p>
    </section>
  </main>;
}

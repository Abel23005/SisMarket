import { Store } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../lib/apiError';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Usuario o contraseña incorrectos'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-neutral-950 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute -right-32 -top-28 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-neutral-950"><Store className="h-6 w-6" /></span><span className="text-xl font-bold">SisMarket</span></div>
        <div className="relative max-w-xl"><p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Gestión de tu negocio</p><h1 className="text-5xl font-bold leading-tight xl:text-6xl">Todo tu minimarket, en un solo lugar.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Controla inventario, ventas y caja con información clara para tomar mejores decisiones.</p></div>
        <p className="relative text-sm text-slate-400">Acceso seguro para tu equipo.</p>
      </section>
      <section className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 sm:px-8 lg:bg-white">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center lg:hidden">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white"><Store className="h-6 w-6" /></div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">SisMarket</h1>
          <p className="mt-1 text-sm text-gray-500">Gestión operativa para tu negocio</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7"><h2 className="text-2xl font-bold tracking-tight text-gray-950">Inicia sesión</h2><p className="mt-2 text-sm text-gray-500">Ingresa tus credenciales para continuar.</p></div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full rounded-xl bg-neutral-950 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
      </section>
    </main>
  );
}

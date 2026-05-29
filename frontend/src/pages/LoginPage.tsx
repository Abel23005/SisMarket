import { Store } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TEST_USERS = [
  { label: 'Dueño', username: 'juan.perez', password: 'admin123' },
  { label: 'Cajero', username: 'maria.lopez', password: 'cajero123' },
  { label: 'Almacenero', username: 'carlos.ruiz', password: 'almacen123' },
];

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
    } catch {
      setError('Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  }

  function fillTestUser(testUsername: string, testPassword: string) {
    setUsername(testUsername);
    setPassword(testPassword);
    setError('');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            SisMarket
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sistema de gestión operativa
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
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
              disabled={loading}
              className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              className="font-semibold text-gray-900 hover:underline"
            >
              Regístrate aquí
            </Link>
          </p>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <p className="mb-3 text-center text-xs font-medium text-gray-500">
              Usuarios de prueba:
            </p>
            <div className="space-y-2">
              {TEST_USERS.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => fillTestUser(u.username, u.password)}
                  className="w-full rounded-lg bg-gray-50 px-3 py-2 text-left text-xs text-gray-600 transition hover:bg-gray-100"
                >
                  <span className="font-medium text-gray-800">{u.label}:</span>{' '}
                  {u.username} / {u.password}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

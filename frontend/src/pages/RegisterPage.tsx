import { Store } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../lib/apiError';

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          'No se pudo crear la cuenta. Verifica los datos.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Crear cuenta</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(['username', 'email', 'fullName', 'password'] as const).map(
            (field) => (
              <div key={field}>
                <label className="mb-1 block text-sm font-medium">
                  {field === 'fullName'
                    ? 'Nombre completo'
                    : field === 'username'
                      ? 'Usuario'
                      : field === 'password'
                        ? 'Contraseña'
                        : 'Correo'}
                </label>
                <input
                  type={
                    field === 'password'
                      ? 'password'
                      : field === 'email'
                        ? 'email'
                        : 'text'
                  }
                  value={form[field]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-900"
                  required
                  minLength={field === 'password' ? 6 : undefined}
                />
              </div>
            ),
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-gray-900">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

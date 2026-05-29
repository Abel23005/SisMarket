import { LogOut, Package, Receipt, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: string;
  stock: number;
  category: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  dueno: 'Dueño',
  cajero: 'Cajero',
  almacenero: 'Almacenero',
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Product[]>('/products')
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">SisMarket</h1>
            <p className="text-sm text-gray-500">
              {user?.fullName} · {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Package className="h-5 w-5" />}
            label="Productos activos"
            value={String(products.length)}
          />
          <StatCard
            icon={<Receipt className="h-5 w-5" />}
            label="Módulo ventas"
            value="API lista"
          />
          <StatCard
            icon={<Wallet className="h-5 w-5" />}
            label="Caja"
            value="API lista"
          />
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold">Inventario</h2>
            <p className="text-sm text-gray-500">
              Productos desde PostgreSQL vía API NestJS
            </p>
          </div>

          {loading ? (
            <p className="px-6 py-8 text-sm text-gray-500">Cargando...</p>
          ) : products.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-500">
              No hay productos. Inicia Docker y el backend.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Producto</th>
                    <th className="px-6 py-3 font-medium">SKU</th>
                    <th className="px-6 py-3 font-medium">Categoría</th>
                    <th className="px-6 py-3 font-medium">Precio</th>
                    <th className="px-6 py-3 font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {p.name}
                      </td>
                      <td className="px-6 py-3 text-gray-600">{p.sku}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {p.category ?? '—'}
                      </td>
                      <td className="px-6 py-3">S/ {Number(p.price).toFixed(2)}</td>
                      <td className="px-6 py-3">
                        <span
                          className={
                            p.stock <= 10
                              ? 'font-medium text-amber-600'
                              : 'text-gray-700'
                          }
                        >
                          {p.stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
        {icon}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

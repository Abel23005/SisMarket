import {
  AlertTriangle,
  BarChart3,
  Bot,
  Boxes,
  Building2,
  CreditCard,
  Grid2X2,
  LogOut,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  Receipt,
  Save,
  Search,
  Settings,
  ShoppingCart,
  TrendingUp,
  Truck,
  Trash2,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import {
  useMemo,
  useState,
  type FormEvent,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import api from '../../lib/api';
import {
  getOwnerSectionSubtitle,
  getOwnerSectionTitle,
  type OwnerSection,
} from './ownerNavigation';
import type { CashSession, Product, Sale, SystemUser } from './types';
import {
  buildWeeklySales,
  countSaleItems,
  exportProducts,
  formatCurrency,
  formatMoney,
  formatTime,
  getCategoryDistribution,
  getFilterTone,
  getLowStockFromProducts,
  getStockStatus,
  getTopProducts,
  isTodaySale,
  optionalText,
  toNumber,
} from './ownerUtils';

interface ProductFormState {
  name: string;
  sku: string;
  barcode: string;
  price: string;
  stock: string;
  minStock: string;
  category: string;
  imageUrl: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  time: string;
}

type SettingsTab = 'subscription' | 'company' | 'users';

const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: '',
  sku: '',
  barcode: '',
  price: '',
  stock: '',
  minStock: '5',
  category: '',
  imageUrl: '',
};

const PROVIDERS = [
  { name: 'Alicorp S.A.', contact: 'Roberto Sanchez', email: 'ventas@alicorp.com.pe', phone: '+51 987 654 321', total: 2450.8, lastOrder: '2026-04-10' },
  { name: 'Gloria S.A.', contact: 'Patricia Vega', email: 'pedidos@gloria.com.pe', phone: '+51 987 123 456', total: 1890.5, lastOrder: '2026-04-11' },
  { name: 'AJE Group', contact: 'Miguel Flores', email: 'distribucion@ajegroup.com', phone: '+51 999 888 777', total: 1250, lastOrder: '2026-04-09' },
  { name: 'Kimberly Clark Peru', contact: 'Sofia Ramirez', email: 'clientes@kimberly.pe', phone: '+51 988 777 666', total: 985.4, lastOrder: '2026-04-08' },
  { name: 'Procter & Gamble Peru', contact: 'Carlos Mendoza', email: 'ventas@pg.com.pe', phone: '+51 987 555 444', total: 1560.2, lastOrder: '2026-04-07' },
];

export default function OwnerDashboard({
  fullName,
  products,
  lowStockProducts,
  sales,
  cashSessions,
  systemUsers,
  loading,
  onProductsChanged,
  onLogout,
}: {
  fullName: string;
  products: Product[];
  lowStockProducts: Product[];
  sales: Sale[];
  cashSessions: CashSession[];
  systemUsers: SystemUser[];
  loading: boolean;
  onProductsChanged: () => Promise<void> | void;
  onLogout: () => void;
}) {
  const [activeSection, setActiveSection] = useState<OwnerSection>('dashboard');

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-950 lg:grid lg:grid-cols-[320px_1fr]">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold tracking-normal">SisMarket</h1>
          <p className="mt-2 text-base text-slate-500">Gestion Operativa</p>
        </div>

        <nav className="flex gap-2 overflow-x-auto border-t border-slate-100 px-5 py-4 lg:flex-1 lg:flex-col lg:overflow-visible">
          <SidebarItem active={activeSection === 'dashboard'} icon={<Grid2X2 />} label="Dashboard" onClick={() => setActiveSection('dashboard')} />
          <SidebarItem active={activeSection === 'pos'} icon={<CreditCard />} label="Punto de Venta" onClick={() => setActiveSection('pos')} />
          <SidebarItem active={activeSection === 'inventory'} icon={<Boxes />} label="Inventario" onClick={() => setActiveSection('inventory')} />
          <SidebarItem active={activeSection === 'sales'} icon={<ShoppingCart />} label="Ventas" onClick={() => setActiveSection('sales')} />
          <SidebarItem active={activeSection === 'cash'} icon={<Wallet />} label="Caja" onClick={() => setActiveSection('cash')} />
          <SidebarItem active={activeSection === 'providers'} icon={<Truck />} label="Proveedores" onClick={() => setActiveSection('providers')} />
          <SidebarItem active={activeSection === 'reports'} icon={<BarChart3 />} label="Reportes" onClick={() => setActiveSection('reports')} />
          <SidebarItem active={activeSection === 'assistant'} icon={<Bot />} label="Asistente IA" onClick={() => setActiveSection('assistant')} />
          <SidebarItem active={activeSection === 'settings'} icon={<Settings />} label="Configuracion" onClick={() => setActiveSection('settings')} />
        </nav>

        <div className="hidden border-t border-slate-200 px-9 py-8 lg:block">
          <p className="font-semibold">{fullName}</p>
          <p className="mb-7 text-sm text-slate-500">Dueno</p>
          <button onClick={onLogout} className="inline-flex items-center gap-3 text-sm font-semibold text-slate-900 transition hover:text-red-600">
            <LogOut className="h-5 w-5" />
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="px-5 py-6 sm:px-8 lg:px-10 lg:py-7">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-normal">{getOwnerSectionTitle(activeSection)}</h2>
            <p className="mt-1 text-sm text-slate-500">{getOwnerSectionSubtitle(activeSection)}</p>
          </div>
          <button onClick={onLogout} className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:text-red-600 lg:hidden">
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </button>
        </div>

        {activeSection === 'dashboard' && <DashboardView products={products} lowStockProducts={lowStockProducts} sales={sales} cashSessions={cashSessions} loading={loading} />}
        {activeSection === 'inventory' && <InventoryView products={products} lowStockProducts={lowStockProducts} loading={loading} onProductsChanged={onProductsChanged} />}
        {activeSection === 'pos' && <PointOfSaleView products={products} loading={loading} onSaleCreated={onProductsChanged} />}
        {activeSection === 'sales' && <SalesView sales={sales} loading={loading} onNewSale={() => setActiveSection('pos')} />}
        {activeSection === 'cash' && <CashView cashSessions={cashSessions} sales={sales} onCashChanged={onProductsChanged} />}
        {activeSection === 'providers' && <ProvidersView products={products} />}
        {activeSection === 'reports' && <ReportsView products={products} sales={sales} />}
        {activeSection === 'assistant' && <AssistantView products={products} sales={sales} />}
        {activeSection === 'settings' && <SettingsView fullName={fullName} systemUsers={systemUsers} />}
      </main>
    </div>
  );
}

function SidebarItem({ active = false, icon, label, onClick }: { active?: boolean; icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-w-max items-center gap-4 rounded-lg px-4 py-3 text-left text-base transition lg:w-full ${active ? 'bg-neutral-950 font-medium text-white' : 'text-slate-800 hover:bg-slate-100'}`}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      {label}
    </button>
  );
}

function DashboardView({ products, lowStockProducts, sales, cashSessions, loading }: { products: Product[]; lowStockProducts: Product[]; sales: Sale[]; cashSessions: CashSession[]; loading: boolean }) {
  const todaySales = useMemo(() => sales.filter(isTodaySale), [sales]);
  const weeklySales = useMemo(() => buildWeeklySales(sales), [sales]);
  const topProducts = useMemo(() => getTopProducts(products, sales), [products, sales]);
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
  const todayTotal = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const openCashSessions = cashSessions.filter((session) => session.status === 'open').length;
  const stockItems = lowStockProducts.slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <OwnerStatCard icon={<Wallet />} tone="green" value={loading ? '...' : formatCurrency(todayTotal)} label="Ventas del dia" meta={`${todaySales.length} ventas`} />
        <OwnerStatCard icon={<ShoppingCart />} tone="blue" value={loading ? '...' : String(todaySales.length)} label="Transacciones" meta="Hoy" />
        <OwnerStatCard icon={<Package />} tone="violet" value={loading ? '...' : totalStock.toLocaleString('es-PE')} label="Productos en stock" meta={`${products.length} productos`} />
        <OwnerStatCard icon={<AlertTriangle />} tone="orange" value={loading ? '...' : String(lowStockProducts.length)} label="Productos con stock bajo" meta={openCashSessions > 0 ? `${openCashSessions} caja abierta` : 'Revisar'} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,0.95fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-2xl font-bold">Ventas de la semana</h3>
          <p className="mt-2 text-sm text-slate-500">Soles (S/)</p>
          <SalesChart data={weeklySales} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-2xl font-bold">Stock bajo</h3>
          <p className="mt-2 text-sm text-slate-500">Requieren reposicion</p>
          {loading ? (
            <p className="mt-8 text-sm text-slate-500">Cargando stock...</p>
          ) : stockItems.length === 0 ? (
            <p className="mt-8 text-sm text-slate-500">No hay productos por debajo del stock minimo.</p>
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {stockItems.map((product) => <LowStockRow key={product.id} name={product.name} stock={product.stock} minStock={product.minStock ?? 5} />)}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold">Productos mas vendidos</h3>
        <p className="mt-1 text-sm text-slate-500">Hoy</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Producto</th>
                <th className="px-5 py-3 font-medium">Unidades</th>
                <th className="px-5 py-3 font-medium">Ingresos</th>
                <th className="px-5 py-3 font-medium">Participacion</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product) => (
                <tr key={product.name} className="border-t border-slate-100">
                  <td className="px-5 py-4 font-semibold">{product.name}</td>
                  <td className="px-5 py-4">{product.units}</td>
                  <td className="px-5 py-4">{formatMoney(product.income)}</td>
                  <td className="px-5 py-4">
                    <div className="h-2 w-32 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-neutral-950" style={{ width: `${product.percent}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OwnerStatCard({ icon, tone, value, label, meta }: { icon: ReactNode; tone: 'green' | 'blue' | 'violet' | 'orange'; value: string; label: string; meta: string }) {
  const tones = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    violet: 'bg-violet-100 text-violet-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${tones[tone]} [&>svg]:h-6 [&>svg]:w-6`}>{icon}</div>
        <div className={`text-sm ${tone === 'orange' ? 'text-orange-600' : 'text-slate-500'}`}>{meta}</div>
      </div>
      <p className="text-4xl font-bold tracking-normal">{value}</p>
      <p className="mt-2 text-base text-slate-500">{label}</p>
    </article>
  );
}

function SalesChart({ data }: { data: { day: string; value: number }[] }) {
  const width = 860;
  const height = 300;
  const padding = { top: 18, right: 24, bottom: 36, left: 48 };
  const highestValue = Math.max(...data.map((item) => item.value), 0);
  const maxValue = Math.max(1000, Math.ceil(highestValue / 100) * 100);
  const xStep = (width - padding.left - padding.right) / (data.length - 1);
  const plotHeight = height - padding.top - padding.bottom;
  const yFor = (value: number) => padding.top + plotHeight - (value / maxValue) * plotHeight;
  const xFor = (index: number) => padding.left + index * xStep;
  const points = data.map((item, index) => `${xFor(index)},${yFor(item.value)}`);

  return (
    <div className="mt-5 w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px] w-full" role="img" aria-label="Ventas de la semana">
        {[maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0].map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="5 5" />
              <text x={padding.left - 8} y={y + 5} textAnchor="end" className="fill-slate-500 text-xs">{Math.round(tick)}</text>
            </g>
          );
        })}
        {data.map((item, index) => {
          const x = xFor(index);
          return (
            <g key={item.day}>
              <line x1={x} x2={x} y1={padding.top} y2={height - padding.bottom} stroke="#e5e7eb" strokeDasharray="5 5" />
              <text x={x} y={height - 12} textAnchor="middle" className="fill-slate-500 text-xs">{item.day}</text>
            </g>
          );
        })}
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="#9ca3af" />
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="#9ca3af" />
        <polyline points={points.join(' ')} fill="none" stroke="#1f2937" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {data.map((item, index) => <circle key={`${item.day}-dot`} cx={xFor(index)} cy={yFor(item.value)} r="4" fill="white" stroke="#1f2937" strokeWidth="3" />)}
      </svg>
    </div>
  );
}

function LowStockRow({ name, stock, minStock }: { name: string; stock: number; minStock: number }) {
  const percent = Math.min(Math.max((stock / Math.max(minStock, 1)) * 100, 8), 100);

  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="min-w-0 truncate text-sm font-medium">{name}</p>
        <span className="shrink-0 text-xs text-slate-500">{stock} uds</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-orange-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function InventoryView({ products, lowStockProducts, loading, onProductsChanged }: { products: Product[]; lowStockProducts: Product[]; loading: boolean; onProductsChanged: () => Promise<void> | void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [stockFilter, setStockFilter] = useState('Todos');
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(products.map((product) => product.category).filter(Boolean)))] as string[], [products]);
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !normalizedQuery || [product.name, product.sku, product.category ?? '', product.barcode ?? ''].join(' ').toLowerCase().includes(normalizedQuery);
      const matchesCategory = category === 'Todos' || product.category === category;
      const status = getStockStatus(product);
      const matchesStatus = stockFilter === 'Todos' || stockFilter === status.label;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [products, query, category, stockFilter]);

  function updateField(field: keyof ProductFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY_PRODUCT_FORM);
    setEditingProductId(null);
    setShowForm(false);
    setError('');
    setMessage('');
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    setShowForm(true);
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode ?? '',
      price: String(product.price),
      stock: String(product.stock),
      minStock: String(product.minStock ?? 5),
      category: product.category ?? '',
      imageUrl: product.imageUrl ?? '',
    });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: optionalText(form.barcode),
      price: toNumber(form.price),
      stock: toNumber(form.stock),
      minStock: toNumber(form.minStock),
      category: optionalText(form.category),
      imageUrl: optionalText(form.imageUrl),
    };

    if (!payload.name || !payload.sku) {
      setSaving(false);
      setError('Completa nombre y SKU.');
      return;
    }

    try {
      if (editingProductId) {
        await api.patch(`/products/${editingProductId}`, payload);
        setMessage('Producto actualizado.');
      } else {
        await api.post('/products', payload);
        setMessage('Producto creado.');
      }
      resetForm();
      await Promise.resolve(onProductsChanged());
    } catch {
      setError('No se pudo guardar. Revisa que el SKU no este repetido.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(`Eliminar ${product.name}?`);
    if (!confirmed) return;
    setSaving(true);
    try {
      await api.delete(`/products/${product.id}`);
      await Promise.resolve(onProductsChanged());
    } catch {
      setError('No se pudo eliminar el producto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => exportProducts(products)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <Save className="h-4 w-4" />
          Exportar
        </button>
        <button type="button" onClick={() => setShowForm(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800">
          <Plus className="h-4 w-4" />
          Agregar producto
        </button>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-700">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">{lowStockProducts.length} productos con stock bajo</p>
              <p className="mt-1">Algunos productos estan por debajo del stock minimo y requieren reposicion.</p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold">{editingProductId ? 'Editar producto' : 'Agregar producto'}</h3>
            <button type="button" onClick={resetForm} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600" title="Cerrar formulario">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={saveProduct} className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr_auto]">
            <InventoryInput label="Nombre" value={form.name} onChange={(value) => updateField('name', value)} placeholder="Aceite Primor 1L" />
            <InventoryInput label="SKU" value={form.sku} onChange={(value) => updateField('sku', value)} placeholder="ACE-001" />
            <InventoryInput label="Categoria" value={form.category} onChange={(value) => updateField('category', value)} placeholder="Abarrotes" />
            <InventoryInput label="Precio" value={form.price} onChange={(value) => updateField('price', value)} placeholder="9.90" inputMode="decimal" />
            <InventoryInput label="Stock" value={form.stock} onChange={(value) => updateField('stock', value)} placeholder="45" inputMode="numeric" />
            <InventoryInput label="Minimo" value={form.minStock} onChange={(value) => updateField('minStock', value)} placeholder="5" inputMode="numeric" />
            <button type="submit" disabled={saving} className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? 'Guardando' : 'Guardar'}
            </button>
          </form>
          {(error || message) && <p className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{error || message}</p>}
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar productos..." className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-slate-400" />
          </div>
          <FilterGroup label="Categoria" value={category} options={categories} onChange={setCategory} />
          <FilterGroup label="Estado de stock" value={stockFilter} options={['Todos', 'Normal', 'Medio', 'Bajo', 'Agotado']} onChange={setStockFilter} counts={{ Bajo: lowStockProducts.length, Agotado: products.filter((product) => product.stock === 0).length }} />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Cargando productos...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No se encontraron productos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Producto</th>
                  <th className="px-6 py-3 font-medium">Categoria</th>
                  <th className="px-6 py-3 font-medium">Stock</th>
                  <th className="px-6 py-3 font-medium">Stock min.</th>
                  <th className="px-6 py-3 font-medium">Costo</th>
                  <th className="px-6 py-3 font-medium">Precio venta</th>
                  <th className="px-6 py-3 font-medium">Proveedor</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product);
                  return (
                    <tr key={product.id} className="border-t border-slate-100">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-950">{product.name}</p>
                        <p className="mt-1 text-xs text-slate-500">ID: {product.sku}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs">{product.category ?? 'Sin categoria'}</span></td>
                      <td className="px-6 py-4 font-semibold">{product.stock}</td>
                      <td className="px-6 py-4 text-slate-600">{product.minStock ?? 5}</td>
                      <td className="px-6 py-4">{formatMoney(Number(product.price) * 0.75)}</td>
                      <td className="px-6 py-4 font-semibold">{formatMoney(product.price)}</td>
                      <td className="px-6 py-4 text-slate-600">{getProductProvider(product)}</td>
                      <td className="px-6 py-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => editProduct(product)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:border-blue-200 hover:text-blue-600" title="Editar producto"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => deleteProduct(product)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:border-red-200 hover:text-red-600" title="Eliminar producto"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FilterGroup({ label, value, options, counts, onChange }: { label: string; value: string; options: string[]; counts?: Record<string, number>; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase text-slate-500">{label}:</span>
      {options.map((option) => (
        <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${value === option ? 'bg-neutral-950 text-white' : getFilterTone(option)}`}>
          {option}
          {counts?.[option] ? ` (${counts[option]})` : ''}
        </button>
      ))}
    </div>
  );
}

function PointOfSaleView({ products, loading, onSaleCreated }: { products: Product[]; loading: boolean; onSaleCreated: () => Promise<void> | void }) {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products
      .filter((product) => product.stock > 0)
      .filter((product) => !normalizedQuery || [product.name, product.category ?? '', product.sku].join(' ').toLowerCase().includes(normalizedQuery));
  }, [products, query]);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  function addToCart(product: Product) {
    setMessage('');
    setError('');
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      }
      return [...current, { product, quantity: 1 }];
    });
  }

  function updateCartQuantity(productId: string, quantity: number) {
    setCart((current) => current.map((item) => item.product.id === productId ? { ...item, quantity: Math.min(Math.max(quantity, 1), item.product.stock) } : item).filter((item) => item.quantity > 0));
  }

  async function registerSale() {
    if (cart.length === 0) {
      setError('Agrega al menos un producto.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.post('/sales', {
        paymentMethod,
        items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      });
      setCart([]);
      setMessage('Venta registrada correctamente.');
      await Promise.resolve(onSaleCreated());
    } catch {
      setError('No se pudo registrar la venta. Revisa stock o permisos.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,0.95fr)]">
      <section className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar productos por nombre..." className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-slate-400" />
          </div>
        </div>
        {loading ? <p className="text-sm text-slate-500">Cargando productos...</p> : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <button key={product.id} type="button" onClick={() => addToCart(product)} className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-400">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold">{product.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{product.category ?? 'Sin categoria'}</p>
                  </div>
                  <span className="text-xs text-slate-500">Stock: {product.stock}</span>
                </div>
                <p className="mt-4 text-lg font-bold">{formatMoney(product.price)}</p>
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Registro de venta</h3>
        {cart.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center text-center text-sm text-slate-500">
            <Receipt className="mb-3 h-12 w-12 text-slate-300" />
            No hay productos agregados
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.product.name}</p>
                  <p className="text-sm text-slate-500">{formatMoney(item.product.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} className="h-8 w-8 rounded-lg border border-slate-200">-</button>
                  <span className="w-8 text-center font-semibold">{item.quantity}</span>
                  <button type="button" onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} className="h-8 w-8 rounded-lg border border-slate-200">+</button>
                </div>
              </div>
            ))}
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
            </select>
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
              <div className="flex justify-between"><span>IGV</span><strong>{formatMoney(tax)}</strong></div>
              <div className="flex justify-between text-lg"><span>Total</span><strong>{formatMoney(total)}</strong></div>
            </div>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            {message && <p className="text-sm font-medium text-green-600">{message}</p>}
            <button type="button" onClick={registerSale} disabled={saving} className="h-11 w-full rounded-lg bg-neutral-950 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Registrando...' : 'Registrar venta'}</button>
          </div>
        )}
      </section>
    </div>
  );
}

function SalesView({ sales, loading, onNewSale }: { sales: Sale[]; loading: boolean; onNewSale: () => void }) {
  const [query, setQuery] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const todaySales = useMemo(() => sales.filter(isTodaySale), [sales]);
  const filteredSales = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sales;
    return sales.filter((sale) => [sale.ticketNumber, sale.status, sale.paymentMethod ?? ''].join(' ').toLowerCase().includes(normalizedQuery));
  }, [sales, query]);
  const selectedSale = sales.find((sale) => sale.id === selectedSaleId) ?? null;
  const todayTotal = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const averageTicket = todaySales.length > 0 ? todayTotal / todaySales.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={onNewSale} className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Nueva venta</button>
      </div>
      <section className="grid gap-5 md:grid-cols-3">
        <SalesMetric label="Total del dia" value={formatMoney(todayTotal)} />
        <SalesMetric label="Transacciones" value={String(todaySales.length)} />
        <SalesMetric label="Ticket promedio" value={formatMoney(averageTicket)} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.7fr)]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por numero de venta..." className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none" />
            </div>
          </div>
          {loading ? <p className="p-6 text-sm text-slate-500">Cargando ventas...</p> : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr><th className="px-5 py-3 font-medium">Venta</th><th className="px-5 py-3 font-medium">Hora</th><th className="px-5 py-3 font-medium">Items</th><th className="px-5 py-3 font-medium">Total</th><th className="px-5 py-3 font-medium">Pago</th><th className="px-5 py-3 font-medium">Estado</th></tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id} onClick={() => setSelectedSaleId(sale.id)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold">{sale.ticketNumber}</td>
                    <td className="px-5 py-4">{formatTime(sale.createdAt)}</td>
                    <td className="px-5 py-4">{countSaleItems(sale)}</td>
                    <td className="px-5 py-4 font-semibold">{formatMoney(sale.total)}</td>
                    <td className="px-5 py-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs">{sale.paymentMethod ?? 'Efectivo'}</span></td>
                    <td className="px-5 py-4"><span className="rounded-md bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">{sale.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {selectedSale ? (
            <div>
              <h3 className="text-xl font-bold">{selectedSale.ticketNumber}</h3>
              <p className="mt-1 text-sm text-slate-500">{new Date(selectedSale.createdAt).toLocaleString('es-PE')}</p>
              <div className="mt-6 space-y-3">
                {(selectedSale.items ?? []).map((item) => (
                  <div key={item.id} className="flex justify-between gap-4 border-b border-slate-100 pb-3 text-sm">
                    <span>{item.product?.name ?? 'Producto'}</span>
                    <strong>{item.quantity} x {formatMoney(item.unitPrice ?? 0)}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-between text-lg font-bold"><span>Total</span><span>{formatMoney(selectedSale.total)}</span></div>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-sm text-slate-500">
              <Receipt className="mb-3 h-12 w-12 text-slate-300" />
              Selecciona una venta para ver el detalle
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function SalesMetric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p></article>;
}

function CashView({ cashSessions, sales, onCashChanged }: { cashSessions: CashSession[]; sales: Sale[]; onCashChanged: () => Promise<void> | void }) {
  const [savingCash, setSavingCash] = useState(false);
  const [cashMessage, setCashMessage] = useState('');
  const [cashError, setCashError] = useState('');
  const activeSession = cashSessions.find((session) => session.status === 'open') ?? null;
  const displayedSession = activeSession ?? cashSessions[0] ?? null;
  const todayTotal = sales.filter(isTodaySale).reduce((sum, sale) => sum + Number(sale.total), 0);
  const openingAmount = displayedSession ? Number(displayedSession.openingAmount) : 0;
  const currentBalance = openingAmount + todayTotal;
  const recentSales = sales.slice(0, 7);

  async function openTurn() {
    const value = window.prompt('Saldo inicial de caja', '200');
    if (!value) return;
    setSavingCash(true);
    setCashMessage('');
    setCashError('');
    try {
      await api.post('/cash-register/open', { openingAmount: toNumber(value) });
      setCashMessage('Turno abierto correctamente.');
      await Promise.resolve(onCashChanged());
    } catch {
      setCashError('No se pudo abrir el turno. Puede que ya tengas una caja abierta.');
    } finally {
      setSavingCash(false);
    }
  }

  async function closeTurn() {
    if (!activeSession) {
      setCashError('No hay un turno activo para cerrar.');
      return;
    }
    const value = window.prompt('Monto contado al cierre', String(currentBalance.toFixed(2)));
    if (!value) return;
    setSavingCash(true);
    setCashMessage('');
    setCashError('');
    try {
      await api.patch(`/cash-register/${activeSession.id}/close`, { closingAmount: toNumber(value), notes: 'Cierre realizado desde panel de dueno' });
      setCashMessage('Turno cerrado correctamente.');
      await Promise.resolve(onCashChanged());
    } catch {
      setCashError('No se pudo cerrar el turno.');
    } finally {
      setSavingCash(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end"><button type="button" onClick={openTurn} disabled={savingCash || Boolean(activeSession)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Wallet className="h-4 w-4" />Abrir turno</button></div>
      <section className="rounded-lg border border-green-200 bg-green-50 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700"><Wallet className="h-5 w-5" /></span><div><p className="font-bold text-green-900">{activeSession ? 'Turno activo' : 'Ultimo turno'}</p><p className="text-sm text-green-800">Caja principal</p></div></div>
          <button type="button" onClick={closeTurn} disabled={savingCash || !activeSession} className="w-fit rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Cerrar turno</button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <CashSummary label="Hora inicio" value={displayedSession ? formatTime(displayedSession.openedAt) : '--:--'} />
          <CashSummary label="Saldo inicial" value={formatMoney(openingAmount)} />
          <CashSummary label="Ventas" value={formatMoney(todayTotal)} />
          <CashSummary label="Saldo actual" value={formatMoney(currentBalance)} />
        </div>
        {(cashMessage || cashError) && <p className={`mt-4 text-sm font-semibold ${cashError ? 'text-red-700' : 'text-green-700'}`}>{cashError || cashMessage}</p>}
      </section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><h3 className="text-xl font-bold">Historial de turnos</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Cajero</th><th className="px-5 py-3 font-medium">Fecha</th><th className="px-5 py-3 font-medium">Horario</th><th className="px-5 py-3 font-medium">Ventas</th><th className="px-5 py-3 font-medium">Saldo final</th><th className="px-5 py-3 font-medium">Estado</th></tr></thead>
              <tbody>
                {cashSessions.map((session) => <tr key={session.id} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">Caja</td><td className="px-5 py-4">{new Date(session.openedAt).toLocaleDateString('es-PE')}</td><td className="px-5 py-4">{formatTime(session.openedAt)} - {session.closedAt ? formatTime(session.closedAt) : 'Activo'}</td><td className="px-5 py-4">{formatMoney(todayTotal)}</td><td className="px-5 py-4">{session.expectedAmount ? formatMoney(session.expectedAmount) : '--'}</td><td className="px-5 py-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${session.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{session.status === 'open' ? 'Activo' : 'Cerrado'}</span></td></tr>)}
                {cashSessions.length === 0 && <tr><td className="px-5 py-8 text-slate-500" colSpan={6}>No hay turnos registrados.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-bold">Movimientos del turno</h3><p className="mt-1 text-sm text-slate-500">Ultimas operaciones</p>
          <div className="mt-4 divide-y divide-slate-100">
            {recentSales.map((sale) => <div key={sale.id} className="flex items-start justify-between gap-4 py-3"><div className="flex gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700"><TrendingUp className="h-4 w-4" /></span><div><p className="font-semibold">Venta</p><p className="text-xs text-slate-500">{formatTime(sale.createdAt)}</p><p className="text-xs text-slate-400">Ticket: {sale.ticketNumber}</p></div></div><span className="font-semibold text-green-600">+{formatMoney(sale.total)}</span></div>)}
            {recentSales.length === 0 && <p className="py-8 text-sm text-slate-500">No hay movimientos recientes.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function CashSummary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-sm text-green-700">{label}</p><p className="mt-2 text-lg font-bold text-green-950">{value}</p></div>;
}

function ProvidersView({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const filteredProviders = PROVIDERS.filter((provider) => [provider.name, provider.contact, provider.email].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const selected = PROVIDERS.find((provider) => provider.name === selectedProvider);
  const recentOrders = PROVIDERS.slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="flex justify-end"><button type="button" onClick={() => window.alert('Formulario de nuevo proveedor listo para conectar al modulo de proveedores.')} className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Nuevo proveedor</button></div>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proveedores..." className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none" /></div></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Proveedor</th><th className="px-5 py-3 font-medium">Contacto</th><th className="px-5 py-3 font-medium">Productos</th><th className="px-5 py-3 font-medium">Ultimo pedido</th><th className="px-5 py-3 font-medium">Total mes</th><th className="px-5 py-3 font-medium">Estado</th></tr></thead>
              <tbody>{filteredProviders.map((provider, index) => <tr key={provider.name} onClick={() => setSelectedProvider(provider.name)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"><td className="px-5 py-4"><p className="font-bold">{provider.name}</p><p className="text-xs text-slate-500">{provider.email}</p></td><td className="px-5 py-4"><p className="font-medium">{provider.contact}</p><p className="text-xs text-slate-500">{provider.phone}</p></td><td className="px-5 py-4">{Math.max(5, products.length + index)}</td><td className="px-5 py-4">{provider.lastOrder}</td><td className="px-5 py-4 font-semibold">{formatMoney(provider.total)}</td><td className="px-5 py-4"><span className="rounded-md bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">Activo</span></td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">{selected ? <div><h3 className="text-xl font-bold">{selected.name}</h3><p className="mt-1 text-sm text-slate-500">{selected.email}</p><div className="mt-6 space-y-3 text-sm"><DetailLine label="Contacto" value={selected.contact} /><DetailLine label="Telefono" value={selected.phone} /><DetailLine label="Ultimo pedido" value={selected.lastOrder} /><DetailLine label="Total mes" value={formatMoney(selected.total)} /></div></div> : <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-sm text-slate-500"><Users className="mb-3 h-12 w-12 text-slate-300" />Selecciona un proveedor para ver los detalles</div>}</aside>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-bold">Pedidos recientes</h3><p className="mt-1 text-sm text-slate-500">Ultimas ordenes de compra</p>
        <table className="mt-5 w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Fecha</th><th className="px-5 py-3 font-medium">Proveedor</th><th className="px-5 py-3 font-medium">Items</th><th className="px-5 py-3 font-medium">Total</th><th className="px-5 py-3 font-medium">Estado</th></tr></thead><tbody>{recentOrders.map((provider, index) => <tr key={provider.name} className="border-t border-slate-100"><td className="px-5 py-4">{provider.lastOrder}</td><td className="px-5 py-4">{provider.name}</td><td className="px-5 py-4">{8 + index * 3}</td><td className="px-5 py-4">{formatMoney(provider.total / 4)}</td><td className="px-5 py-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${index === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{index === 3 ? 'Pendiente' : 'Entregado'}</span></td></tr>)}</tbody></table>
      </section>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-slate-500">{label}</span><strong className="text-right">{value}</strong></div>;
}

function ReportsView({ products, sales }: { products: Product[]; sales: Sale[] }) {
  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const soldUnits = sales.reduce((sum, sale) => sum + countSaleItems(sale), 0);
  const averageTicket = sales.length > 0 ? totalSales / sales.length : 0;
  const grossMargin = totalSales * 0.406;
  const topProducts = getTopProducts(products, sales);
  const categoryRows = getCategoryDistribution(products);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-2"><button className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Ultimo mes</button><button className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Ultimo trimestre</button><button className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Ultimo ano</button></div><div className="flex gap-3"><input className="h-10 rounded-lg border border-slate-200 px-3 text-sm" type="date" defaultValue="2026-04-01" /><input className="h-10 rounded-lg border border-slate-200 px-3 text-sm" type="date" defaultValue="2026-04-12" /></div></section>
      <section className="grid gap-5 md:grid-cols-4"><ReportCard icon={<TrendingUp />} tone="green" label="Ventas totales" value={formatMoney(totalSales)} detail="+12% vs mes anterior" /><ReportCard icon={<ShoppingCart />} tone="blue" label="Margen bruto" value={formatMoney(grossMargin)} detail="40.6% de margen" /><ReportCard icon={<Package />} tone="violet" label="Productos vendidos" value={String(soldUnits)} detail="Unidades" /><ReportCard icon={<Users />} tone="orange" label="Ticket promedio" value={formatMoney(averageTicket)} detail="Por transaccion" /></section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.65fr)]"><BarReportChart totalSales={totalSales} /><CategoryReport rows={categoryRows} /></section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold">Productos mas vendidos</h3><p className="mt-1 text-sm text-slate-500">Top 5 del periodo</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Posicion</th><th className="px-5 py-3 font-medium">Producto</th><th className="px-5 py-3 font-medium">Unidades vendidas</th><th className="px-5 py-3 font-medium">Ingresos</th><th className="px-5 py-3 font-medium">Participacion</th></tr></thead><tbody>{topProducts.map((product, index) => <tr key={product.name} className="border-t border-slate-100"><td className="px-5 py-4"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-950 font-bold text-white">{index + 1}</span></td><td className="px-5 py-4 font-semibold">{product.name}</td><td className="px-5 py-4">{product.units}</td><td className="px-5 py-4 font-semibold">{formatMoney(product.income)}</td><td className="px-5 py-4"><div className="h-2 w-36 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-neutral-950" style={{ width: `${product.percent}%` }} /></div></td></tr>)}</tbody></table></div></section>
    </div>
  );
}

function ReportCard({ icon, tone, label, value, detail }: { icon: ReactNode; tone: 'green' | 'blue' | 'violet' | 'orange'; label: string; value: string; detail: string }) {
  const tones = { green: 'bg-green-100 text-green-600', blue: 'bg-blue-100 text-blue-600', violet: 'bg-violet-100 text-violet-600', orange: 'bg-orange-100 text-orange-600' };
  return <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]} [&>svg]:h-5 [&>svg]:w-5`}>{icon}</div><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p><p className="mt-2 text-sm text-slate-600">{detail}</p></article>;
}

function BarReportChart({ totalSales }: { totalSales: number }) {
  const base = Math.max(totalSales, 1000);
  const rows = [{ month: 'Ene', sales: base * 0.75, cost: base * 0.56 }, { month: 'Feb', sales: base * 0.82, cost: base * 0.61 }, { month: 'Mar', sales: base * 0.9, cost: base * 0.68 }, { month: 'Abr', sales: base * 0.52, cost: base * 0.4 }];
  const max = Math.max(...rows.flatMap((row) => [row.sales, row.cost]));
  return <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold">Ventas y costos mensuales</h3><p className="mt-1 text-sm text-slate-500">Comparativa en soles</p><div className="mt-8 h-72"><div className="flex h-56 items-end justify-around border-b border-l border-slate-300 px-6">{rows.map((row) => <div key={row.month} className="flex items-end gap-2"><div className="w-10 bg-neutral-950" style={{ height: `${(row.sales / max) * 200}px` }} /><div className="w-10 bg-slate-400" style={{ height: `${(row.cost / max) * 200}px` }} /></div>)}</div><div className="mt-2 flex justify-around px-8 text-xs text-slate-500">{rows.map((row) => <span key={row.month}>{row.month}</span>)}</div></div></div>;
}

function CategoryReport({ rows }: { rows: { name: string; percent: number }[] }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold">Distribucion por categoria</h3><p className="mt-1 text-sm text-slate-500">Participacion en ventas</p><div className="mt-8 flex justify-center"><div className="h-40 w-40 rounded-full" style={{ background: 'conic-gradient(#111827 0 35%, #4b5563 35% 63%, #737373 63% 78%, #a3a3a3 78% 90%, #d4d4d4 90% 100%)' }}><div className="m-auto mt-8 h-24 w-24 rounded-full bg-white" /></div></div><div className="mt-7 space-y-3">{rows.map((row) => <div key={row.name} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-700" />{row.name}</span><strong>{row.percent}%</strong></div>)}</div></div>;
}

function AssistantView({ products, sales }: { products: Product[]; sales: Sale[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'welcome', sender: 'assistant', text: 'Hola! Soy tu asistente inteligente. Puedo ayudarte a consultar informacion sobre tu minimarket. Que te gustaria saber?', time: '11:03 a. m.' }]);
  const [question, setQuestion] = useState('');
  const suggestions = ['Cuanto llevo vendido hoy?', 'Que productos tienen stock bajo?', 'Cuales son los mas vendidos?', 'Dame un resumen del negocio'];
  function sendQuestion(value = question) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const time = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    setMessages((current) => [...current, { id: `${Date.now()}-u`, sender: 'user', text: trimmed, time }, { id: `${Date.now()}-a`, sender: 'assistant', text: buildAssistantAnswer(trimmed, products, sales), time }]);
    setQuestion('');
  }
  return <section className="mx-auto flex h-[calc(100vh-150px)] max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="flex-1 space-y-4 overflow-y-auto p-6">{messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>{message.sender === 'assistant' && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white"><Bot className="h-4 w-4" /></span>}<div className={`max-w-[680px] rounded-2xl px-5 py-4 text-sm ${message.sender === 'user' ? 'bg-neutral-950 text-white' : 'bg-slate-100 text-slate-950'}`}><p>{message.text}</p><p className="mt-2 text-xs text-slate-500">{message.time}</p></div></div>)}</div><div className="border-t border-slate-100 p-4"><div className="mb-3 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => sendQuestion(suggestion)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{suggestion}</button>)}</div><div className="flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendQuestion(); }} placeholder="Escribe tu pregunta..." className="h-11 flex-1 rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-slate-400" /><button type="button" onClick={() => sendQuestion()} className="flex h-11 w-12 items-center justify-center rounded-lg bg-neutral-500 text-white hover:bg-neutral-700"><MessageCircle className="h-5 w-5" /></button></div></div></section>;
}

function buildAssistantAnswer(question: string, products: Product[], sales: Sale[]) {
  const normalized = question.toLowerCase();
  const todaySales = sales.filter(isTodaySale);
  const todayTotal = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const lowStock = getLowStockFromProducts(products);
  const topProducts = getTopProducts(products, sales);
  if (normalized.includes('vendido') || normalized.includes('venta')) return `Hoy llevas ${formatMoney(todayTotal)} en ventas y ${todaySales.length} transacciones registradas.`;
  if (normalized.includes('stock')) return lowStock.length === 0 ? 'No tienes productos por debajo del stock minimo.' : `Productos con stock bajo: ${lowStock.slice(0, 5).map((product) => `${product.name} (${product.stock} uds)`).join(', ')}.`;
  if (normalized.includes('mas vendidos') || normalized.includes('más vendidos')) return `Tus productos destacados son: ${topProducts.slice(0, 3).map((product) => `${product.name} (${product.units} uds)`).join(', ')}.`;
  return `Resumen rapido: ${products.length} productos activos, ${lowStock.length} con stock bajo, ${sales.length} ventas registradas y ${formatMoney(todayTotal)} vendido hoy.`;
}

function SettingsView({ fullName, systemUsers }: { fullName: string; systemUsers: SystemUser[] }) {
  const [tab, setTab] = useState<SettingsTab>('subscription');
  return <div className="grid gap-5 lg:grid-cols-[230px_1fr]"><aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><SettingsTabButton active={tab === 'subscription'} icon={<CreditCard />} label="Suscripcion" onClick={() => setTab('subscription')} /><SettingsTabButton active={tab === 'company'} icon={<Building2 />} label="Datos de la Empresa" onClick={() => setTab('company')} /><SettingsTabButton active={tab === 'users'} icon={<Users />} label="Usuarios" onClick={() => setTab('users')} /></aside><div className="space-y-5">{tab === 'subscription' && <SubscriptionSettings />}{tab === 'company' && <CompanySettings />}{tab === 'users' && <UsersSettings ownerName={fullName} systemUsers={systemUsers} />}</div></div>;
}

function SettingsTabButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold ${active ? 'bg-neutral-950 text-white' : 'text-slate-700 hover:bg-slate-50'}`}><span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>{label}</button>;
}

function SubscriptionSettings() {
  return <><section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-xl font-bold">Plan Actual</h3><p className="mt-1 text-sm text-slate-500">Renovacion automatica el 15 de Mayo, 2026</p></div><span className="inline-flex w-fit items-center gap-2 rounded-lg bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700"><Zap className="h-4 w-4" />Plan Profesional</span></div><div className="mt-6 grid gap-4 sm:grid-cols-4"><DetailMetric label="Tiendas activas" value="2 / 3" /><DetailMetric label="Usuarios" value="8" /><DetailMetric label="Proximo pago" value="S/ 129" /><DetailMetric label="Metodo de pago" value="Visa **** 4532" /></div></section><section><h3 className="text-xl font-bold">Planes disponibles</h3><p className="mt-1 text-sm text-slate-500">Elige el plan que mejor se adapte a tu negocio</p><div className="mt-5 grid gap-5 xl:grid-cols-3"><PlanCard title="Plan Basico" price="S/ 49" tone="blue" features={['1 tienda activa', 'Gestion de inventario', 'Punto de venta', 'Reportes basicos', 'Soporte por email', 'Comprobantes electronicos']} /><PlanCard current title="Plan Profesional" price="S/ 129" tone="violet" features={['Hasta 3 tiendas', 'Todo del Plan Basico', 'Asistente inteligente con IA', 'Reportes avanzados', 'Soporte prioritario 24/7', 'Integracion con proveedores', 'Multi-usuario sin limite']} /><PlanCard title="Plan Enterprise" price="S/ 299" tone="orange" features={['Tiendas ilimitadas', 'Todo del Plan Profesional', 'API personalizada', 'Gerente de cuenta dedicado', 'Capacitacion personalizada', 'SLA garantizado 99.9%', 'Backup automatico diario', 'Personalizacion de marca']} /></div></section><section className="rounded-lg border border-blue-200 bg-blue-50 p-6"><h3 className="font-bold text-blue-900">Tienes mas de 10 tiendas?</h3><p className="mt-2 text-sm text-blue-700">Contactanos para crear un plan personalizado con descuentos por volumen, capacitacion dedicada y soporte empresarial premium.</p><button type="button" onClick={() => window.alert('Solicitud enviada al equipo comercial.')} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Contactar a ventas</button></section></>;
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-2 font-bold">{value}</p></div>;
}

function PlanCard({ title, price, tone, features, current = false }: { title: string; price: string; tone: 'blue' | 'violet' | 'orange'; features: string[]; current?: boolean }) {
  const tones = { blue: 'bg-blue-100 text-blue-600', violet: 'bg-violet-100 text-violet-600', orange: 'bg-orange-100 text-orange-600' };
  return <article className={`relative rounded-lg border bg-white p-6 shadow-sm ${current ? 'border-neutral-950' : 'border-slate-200'}`}>{current && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-950 px-3 py-1 text-xs font-bold text-white">Mas Popular</span>}<div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${tones[tone]}`}><Zap className="h-5 w-5" /></div><h4 className="font-bold">{title}</h4><p className="mt-4 text-3xl font-bold">{price}<span className="text-sm font-normal text-slate-500"> /mes</span></p><p className="mt-1 text-xs text-slate-500">+ IGV</p><ul className="mt-6 space-y-3 text-sm">{features.map((feature) => <li key={feature} className="flex gap-2"><span className="text-green-600">✓</span>{feature}</li>)}</ul><button type="button" onClick={() => window.alert(current ? 'Ya estas usando este plan.' : `Solicitud para cambiar a ${title} registrada.`)} disabled={current} className={`mt-6 h-11 w-full rounded-lg text-sm font-semibold ${current ? 'bg-slate-100 text-slate-400' : 'bg-neutral-950 text-white hover:bg-neutral-800'}`}>{current ? 'Plan Actual' : 'Cambiar plan'}</button></article>;
}

function CompanySettings() {
  return <><section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-6 flex items-start justify-between"><div><h3 className="text-xl font-bold">Informacion de la Empresa</h3><p className="mt-1 text-sm text-slate-500">Datos registrados ante SUNAT</p></div><button type="button" onClick={() => window.alert('Edicion de datos de empresa pendiente de conectar al backend.')} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Editar</button></div><div className="grid gap-6 sm:grid-cols-2"><DetailMetric label="RUC" value="20612345678" /><DetailMetric label="Razon Social" value="Minimarket San Jose S.A.C." /><DetailMetric label="Nombre Comercial" value="Minimarket San Jose" /><DetailMetric label="Telefono" value="+51 987 654 321" /><DetailMetric label="Direccion Fiscal" value="Av. Los Alamos 456, San Isidro, Lima" /><DetailMetric label="Email Corporativo" value="contacto@minimarketsj.pe" /></div></section><section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold">Representante Legal</h3><div className="mt-5 grid gap-6 sm:grid-cols-2"><DetailMetric label="Nombre Completo" value="Juan Carlos Perez Garcia" /><DetailMetric label="DNI" value="12345678" /></div></section><section className="rounded-lg border border-blue-200 bg-blue-50 p-6"><div className="flex gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><Receipt className="h-5 w-5" /></span><div><h3 className="font-bold text-blue-900">Certificado Digital SUNAT</h3><p className="mt-2 text-sm text-blue-700">Estado: Activo - Valido hasta: 15/08/2026</p><button type="button" onClick={() => window.alert('Solicitud de renovacion de certificado registrada.')} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Renovar certificado</button></div></div></section></>;
}

function UsersSettings({ ownerName, systemUsers }: { ownerName: string; systemUsers: SystemUser[] }) {
  const users = systemUsers.length > 0 ? systemUsers : [{ id: 'owner-fallback', fullName: ownerName, email: 'usuario@minimarket.pe', role: 'dueno', active: true }];
  const activeUsers = users.filter((user) => user.active !== false).length;
  return <><section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-6 flex items-start justify-between gap-4"><div><h3 className="text-xl font-bold">Usuarios del Sistema</h3><p className="mt-1 text-sm text-slate-500">Gestiona el acceso y permisos de tu equipo</p></div><button type="button" onClick={() => window.alert('Invitacion preparada. Falta conectar el envio al backend de usuarios.')} className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white"><Users className="h-4 w-4" />Invitar usuario</button></div><div className="grid gap-4 sm:grid-cols-4"><UserMetric label="Total usuarios" value={String(users.length)} /><UserMetric active label="Activos" value={String(activeUsers)} /><UserMetric label="Duenos" value={String(users.filter((user) => user.role === 'dueno').length)} /><UserMetric label="Cajeros" value={String(users.filter((user) => user.role === 'cajero').length)} /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Usuario</th><th className="px-5 py-3 font-medium">Rol</th><th className="px-5 py-3 font-medium">Tienda</th><th className="px-5 py-3 font-medium">Estado</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-slate-100"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold">{user.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div><p className="font-semibold">{user.fullName}</p><p className="text-xs text-slate-500">{user.email}</p></div></div></td><td className="px-5 py-4"><span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{user.role}</span></td><td className="px-5 py-4">Tienda Principal</td><td className="px-5 py-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${user.active === false ? 'bg-slate-100 text-slate-700' : 'bg-green-100 text-green-700'}`}>{user.active === false ? 'Inactivo' : 'Activo'}</span></td></tr>)}</tbody></table></div></section><section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold">Permisos por Rol</h3><div className="mt-5 grid gap-4 md:grid-cols-3"><RoleCard title="Dueno" items={['Acceso completo', 'Gestion de suscripcion', 'Reportes avanzados', 'Asistente IA']} /><RoleCard title="Cajero" items={['Punto de venta', 'Registro de ventas', 'Control de caja', 'Dashboard basico']} /><RoleCard title="Almacenero" items={['Gestion de inventario', 'Control de stock', 'Gestion de proveedores', 'Dashboard basico']} /></div></section></>;
}

function UserMetric({ label, value, active = false }: { label: string; value: string; active?: boolean }) {
  return <div className={`rounded-lg p-4 ${active ? 'bg-green-50' : 'bg-slate-50'}`}><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}

function RoleCard({ title, items }: { title: string; items: string[] }) {
  return <article className="rounded-lg border border-slate-200 p-5"><h4 className="font-bold">{title}</h4><ul className="mt-3 space-y-2 text-sm text-slate-600">{items.map((item) => <li key={item}>- {item}</li>)}</ul></article>;
}

function InventoryInput({ label, value, onChange, placeholder, inputMode }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'] }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400" /></label>;
}

function getProductProvider(product: Product) {
  const value = `${product.name} ${product.category ?? ''}`.toLowerCase();
  if (value.includes('aceite') || value.includes('fideo')) return 'Alicorp';
  if (value.includes('leche')) return 'Gloria';
  if (value.includes('bebida') || value.includes('kola') || value.includes('cola')) return 'AJE Group';
  if (value.includes('limpieza') || value.includes('papel')) return 'Kimberly Clark';
  return 'No registrado';
}

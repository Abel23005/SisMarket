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
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Truck,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type HTMLAttributes,
  type HTMLInputTypeAttribute,
  type ReactNode,
} from 'react';
import api from '../../lib/api';
import { BrandMark } from '../../components/BrandMark';
import { CulqiCheckoutButton } from '../../components/CulqiCheckoutButton';
import { getApiErrorMessage } from '../../lib/apiError';
import {
  getOwnerSectionSubtitle,
  getOwnerSectionTitle,
  type OwnerSection,
} from './ownerNavigation';
import type { CashSession, InventoryMovement, Product, PurchaseOrder, Sale, StockAlert, Supplier, SystemUser } from './types';
import {
  buildWeeklySales,
  countSaleItems,
  exportProducts,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatMoney,
  formatTime,
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
  supplierId: string;
}

interface SupplierFormState {
  name: string;
  contact: string;
  email: string;
  phone: string;
  lastOrder: string;
  monthlyTotal: string;
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

type SettingsTab = 'subscription' | 'company' | 'users' | 'audit';

const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: '',
  sku: '',
  barcode: '',
  price: '',
  stock: '',
  minStock: '5',
  category: '',
  imageUrl: '',
  supplierId: '',
};

const EMPTY_SUPPLIER_FORM: SupplierFormState = {
  name: '',
  contact: '',
  email: '',
  phone: '',
  lastOrder: '',
  monthlyTotal: '0',
};

function isOpenCashSession(session: CashSession) {
  return ['abierta', 'open'].includes(session.status);
}

function getCashSessionLabel(session: CashSession) {
  return isOpenCashSession(session) ? 'Activo' : 'Cerrado';
}

function getPaymentMethodLabel(method?: string) {
  const labels: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    yape: 'Yape',
    plin: 'Plin',
  };
  return method ? labels[method] ?? method : 'Efectivo';
}

export default function OwnerDashboard({
  fullName,
  currentUserId,
  entitlements,
  onEntitlementsChanged,
  products,
  lowStockProducts,
  sales,
  cashSessions,
  systemUsers,
  suppliers,
  stockAlerts,
  loading,
  loadWarning,
  onProductsChanged,
  onDataChanged,
  onAlertsChanged,
  onLogout,
}: {
  fullName: string;
  currentUserId: string;
  entitlements: { enforced: boolean; planCode: string | null; basic: boolean; standard: boolean; premium: boolean };
  onEntitlementsChanged: () => Promise<void> | void;
  products: Product[];
  lowStockProducts: Product[];
  sales: Sale[];
  cashSessions: CashSession[];
  systemUsers: SystemUser[];
  suppliers: Supplier[];
  stockAlerts: StockAlert[];
  loading: boolean;
  loadWarning: string;
  onProductsChanged: () => Promise<void> | void;
  onDataChanged: () => Promise<void> | void;
  onAlertsChanged: () => Promise<void> | void;
  onLogout: () => void;
}) {
  const [activeSection, setActiveSection] = useState<OwnerSection>('dashboard');
  useEffect(() => { if (entitlements.enforced && !entitlements.basic) setActiveSection('settings'); }, [entitlements.enforced, entitlements.basic]);

  return (
    <div className="min-h-screen min-w-0 bg-[#f7f7f8] text-slate-950 lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="border-t-[3px] border-[var(--brand-red)] px-6 py-7">
          <div className="flex items-center gap-3"><BrandMark compact /><div><h1 className="text-2xl font-bold tracking-tight">SisMarket</h1><p className="mt-0.5 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Gestión del negocio</p></div></div>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f8f1e7] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#72552b]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-gold)]" />Comercio peruano</p>
        </div>

        <nav className="flex gap-2 overflow-x-auto border-t border-slate-100 px-5 py-4 lg:flex-1 lg:flex-col lg:overflow-visible">
          {(!entitlements.enforced || entitlements.basic) && <><SidebarItem active={activeSection === 'dashboard'} icon={<Grid2X2 />} label="Dashboard" onClick={() => setActiveSection('dashboard')} /><SidebarItem active={activeSection === 'pos'} icon={<CreditCard />} label="Punto de Venta" onClick={() => setActiveSection('pos')} /><SidebarItem active={activeSection === 'inventory'} icon={<Boxes />} label="Inventario" onClick={() => setActiveSection('inventory')} /><SidebarItem active={activeSection === 'sales'} icon={<ShoppingCart />} label="Ventas" onClick={() => setActiveSection('sales')} /><SidebarItem active={activeSection === 'cash'} icon={<Wallet />} label="Caja" onClick={() => setActiveSection('cash')} /></>}
          {(!entitlements.enforced || entitlements.standard) && <><SidebarItem active={activeSection === 'providers'} icon={<Truck />} label="Proveedores" onClick={() => setActiveSection('providers')} /><SidebarItem active={activeSection === 'reports'} icon={<BarChart3 />} label="Reportes" onClick={() => setActiveSection('reports')} /></>}
          {(!entitlements.enforced || entitlements.premium) && <SidebarItem active={activeSection === 'assistant'} icon={<Bot />} label="Asistente IA" onClick={() => setActiveSection('assistant')} />}
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

      <main className="min-w-0 px-4 py-5 sm:px-8 lg:px-10 lg:py-7">
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

        {loadWarning && !(entitlements.enforced && !entitlements.basic) && <div role="alert" className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"><p>{loadWarning}</p><button type="button" onClick={() => void onDataChanged()} className="h-10 shrink-0 rounded-lg border border-amber-300 bg-white px-4 font-semibold hover:bg-amber-100">Actualizar</button></div>}

        {entitlements.enforced && !entitlements.basic ? <section className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-6"><h3 className="text-xl font-bold text-amber-950">Activa un plan para continuar</h3><p className="mt-2 text-sm text-amber-900">El negocio no tiene un plan activo. Selecciona Básico, Estándar o Premium en Suscripción para habilitar el sistema.</p><button type="button" onClick={() => setActiveSection('settings')} className="mt-4 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Ver planes</button></section> : <>
        {activeSection === 'dashboard' && <DashboardView products={products} lowStockProducts={lowStockProducts} stockAlerts={stockAlerts} sales={sales} cashSessions={cashSessions} loading={loading} onAlertsChanged={onAlertsChanged} />}
        {activeSection === 'inventory' && <InventoryView products={products} suppliers={suppliers} lowStockProducts={lowStockProducts} loading={loading} onProductsChanged={onProductsChanged} />}
        {activeSection === 'pos' && <PointOfSaleView products={products} cashSessions={cashSessions} loading={loading} allowPremium={entitlements.premium || !entitlements.enforced} onSaleCreated={onProductsChanged} />}
        {activeSection === 'sales' && <SalesView sales={sales} loading={loading} onNewSale={() => setActiveSection('pos')} onSalesChanged={onDataChanged} />}
        {activeSection === 'cash' && <CashView cashSessions={cashSessions} sales={sales} onCashChanged={onProductsChanged} />}
        {activeSection === 'providers' && entitlements.standard && <ProvidersView products={products} suppliers={suppliers} onSuppliersChanged={onDataChanged} />}
        {activeSection === 'reports' && entitlements.standard && <ReportsView products={products} />}
        {activeSection === 'assistant' && entitlements.premium && <AssistantView products={products} sales={sales} />}
        {activeSection === 'settings' && <SettingsView currentUserId={currentUserId} systemUsers={systemUsers} onUsersChanged={onDataChanged} onEntitlementsChanged={onEntitlementsChanged} />}
        </>}
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

function DashboardView({ products, lowStockProducts, stockAlerts, sales, cashSessions, loading, onAlertsChanged }: { products: Product[]; lowStockProducts: Product[]; stockAlerts: StockAlert[]; sales: Sale[]; cashSessions: CashSession[]; loading: boolean; onAlertsChanged: () => Promise<void> | void }) {
  const todaySales = useMemo(() => sales.filter((sale) => sale.status === 'completada' && isTodaySale(sale)), [sales]);
  const weeklySales = useMemo(() => buildWeeklySales(sales), [sales]);
  const topProducts = useMemo(() => getTopProducts(products, sales), [products, sales]);
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
  const todayTotal = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const openCashSessions = cashSessions.filter(isOpenCashSession).length;
  const stockItems = lowStockProducts.slice(0, 4);

  return (
    <div className="space-y-6">
      {stockAlerts.length > 0 && <section className="rounded-xl border border-orange-200 bg-orange-50 p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-orange-950">Alertas de stock pendientes</h3><span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800">{stockAlerts.length}</span></div><div className="mt-3 divide-y divide-orange-200">{stockAlerts.slice(0, 6).map((alert) => <div key={alert.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><p className="text-orange-950"><strong>{alert.product.name}</strong> · quedan {alert.product.stock}, mínimo {alert.minimumStock}</p><button type="button" onClick={async () => { await api.patch(`/alerts/${alert.id}/acknowledge`); await onAlertsChanged(); }} className="rounded-md border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-900 hover:bg-orange-100">Marcar atendida</button></div>)}</div></section>}
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

function InventoryView({ products, suppliers, lowStockProducts, loading, onProductsChanged }: { products: Product[]; suppliers: Supplier[]; lowStockProducts: Product[]; loading: boolean; onProductsChanged: () => Promise<void> | void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [stockFilter, setStockFilter] = useState('Todos');
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

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
      supplierId: product.supplierId ?? product.supplier?.id ?? '',
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
      supplierId: form.supplierId || null,
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

  async function showMovements(product: Product) {
    setMovementProduct(product);
    setLoadingMovements(true);
    try {
      const { data } = await api.get<InventoryMovement[]>(`/products/${product.id}/movements`);
      setMovements(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo cargar el historial de stock.'));
    } finally {
      setLoadingMovements(false);
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
          <form onSubmit={saveProduct} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr_1fr_auto]">
            <InventoryInput label="Nombre" value={form.name} onChange={(value) => updateField('name', value)} placeholder="Aceite Primor 1L" />
            <InventoryInput label="SKU" value={form.sku} onChange={(value) => updateField('sku', value)} placeholder="ACE-001" />
            <InventoryInput label="Categoria" value={form.category} onChange={(value) => updateField('category', value)} placeholder="Abarrotes" />
            <InventoryInput label="Precio" value={form.price} onChange={(value) => updateField('price', value)} placeholder="9.90" inputMode="decimal" />
            <InventoryInput label="Stock" value={form.stock} onChange={(value) => updateField('stock', value)} placeholder="45" inputMode="numeric" />
            <InventoryInput label="Minimo" value={form.minStock} onChange={(value) => updateField('minStock', value)} placeholder="5" inputMode="numeric" />
            <label className="block text-sm font-medium text-slate-700">Proveedor<select value={form.supplierId} onChange={(event) => updateField('supplierId', event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"><option value="">Sin proveedor</option>{suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
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
                      <td className="px-6 py-4 font-semibold">{formatMoney(product.price)}</td>
                      <td className="px-6 py-4 text-slate-600">{getProductProvider(product)}</td>
                      <td className="px-6 py-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => void showMovements(product)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:border-slate-400" title="Ver historial de stock"><Receipt className="h-4 w-4" />Historial</button>
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
      {movementProduct && <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h3 className="text-lg font-bold">Historial de stock</h3><p className="mt-1 text-sm text-slate-500">{movementProduct.name} · stock actual {movementProduct.stock}</p></div><button type="button" onClick={() => setMovementProduct(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">Cerrar</button></div>
        {loadingMovements ? <p className="p-5 text-sm text-slate-500">Cargando movimientos…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Fecha</th><th className="px-5 py-3 font-medium">Tipo</th><th className="px-5 py-3 font-medium">Variación</th><th className="px-5 py-3 font-medium">Stock después</th><th className="px-5 py-3 font-medium">Usuario</th><th className="px-5 py-3 font-medium">Detalle</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id} className="border-t border-slate-100"><td className="px-5 py-3">{formatDateTime(movement.createdAt)}</td><td className="px-5 py-3">{({ opening: 'Inicial', sale: 'Venta', purchase: 'Compra', adjustment: 'Ajuste', return: 'Devolución' } as const)[movement.type]}</td><td className={`px-5 py-3 font-semibold ${movement.quantityChange > 0 ? 'text-green-700' : 'text-red-700'}`}>{movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}</td><td className="px-5 py-3">{movement.stockAfter}</td><td className="px-5 py-3">{movement.user?.fullName ?? 'Sistema'}</td><td className="px-5 py-3">{movement.reason ?? '—'}</td></tr>)}{movements.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No hay movimientos registrados todavía.</td></tr>}</tbody></table></div>}
      </section>}
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

function PointOfSaleView({ products, cashSessions, loading, allowPremium, onSaleCreated }: { products: Product[]; cashSessions: CashSession[]; loading: boolean; allowPremium: boolean; onSaleCreated: () => Promise<void> | void }) {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [documentType, setDocumentType] = useState<'boleta' | 'factura'>('boleta');
  const [customerDocumentNumber, setCustomerDocumentNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [emittingDocument, setEmittingDocument] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [culqiConfig, setCulqiConfig] = useState<{ enabled: boolean; publicKey: string | null }>({ enabled: false, publicKey: null });

  useEffect(() => { api.get<{ enabled: boolean; publicKey: string | null }>('/payments/culqi/config').then(({ data }) => setCulqiConfig(data)).catch(() => setCulqiConfig({ enabled: false, publicKey: null })); }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products
      .filter((product) => product.stock > 0)
      .filter((product) => !normalizedQuery || [product.name, product.category ?? '', product.sku, product.barcode ?? ''].join(' ').toLowerCase().includes(normalizedQuery));
  }, [products, query]);
  const total = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const activeCashSession = cashSessions.find(isOpenCashSession) ?? null;

  function addToCart(product: Product) {
    setMessage('');
    setError('');
    setLastSale(null);
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      }
      return [...current, { product, quantity: 1 }];
    });
  }

  function updateCartQuantity(productId: string, quantity: number) {
    setCart((current) => current.map((item) => item.product.id === productId ? { ...item, quantity: Math.min(Math.max(quantity, 0), item.product.stock) } : item).filter((item) => item.quantity > 0));
  }

  function startNewSale() {
    setCart([]);
    setMessage('');
    setError('');
    setLastSale(null);
    setDocumentType('boleta');
    setCustomerDocumentNumber('');
    setCustomerName('');
    setCustomerAddress('');
    setCustomerEmail('');
  }

  async function emitElectronicDocument() {
    if (!lastSale) return;
    setEmittingDocument(true); setError(''); setMessage('');
    try {
      const { data } = await api.post<Sale>(`/sales/${lastSale.id}/emit-document`);
      setLastSale(data);
      setMessage(data.nubefactStatus === 'accepted' ? 'Comprobante aceptado por Nubefact.' : `Respuesta del proveedor: ${data.nubefactStatus ?? 'sin estado'}.`);
      await Promise.resolve(onSaleCreated());
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo emitir el comprobante. Verifica las credenciales y los datos fiscales.'));
    } finally { setEmittingDocument(false); }
  }

  async function registerSale(culqiToken?: string) {
    if (!activeCashSession) {
      setError('Abre un turno de caja antes de registrar ventas.');
      return;
    }
    if (cart.length === 0) {
      setError('Agrega al menos un producto.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    setLastSale(null);
    try {
      const { data } = await api.post<Sale>('/sales', {
        paymentMethod,
        culqiToken,
        cashSessionId: activeCashSession?.id,
        documentType,
        customerDocumentNumber: customerDocumentNumber || undefined,
        customerName: customerName || undefined,
        customerAddress: customerAddress || undefined,
        customerEmail: customerEmail || undefined,
        items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      });
      setCart([]);
      setLastSale(data);
      setMessage(data.status === 'pendiente_pago' ? `${data.ticketNumber}: pago pendiente de conciliación. ${data.culqiChargeId ? `ID Culqi: ${data.culqiChargeId}. ` : ''}Revisa Culqi antes de volver a cobrar.` : data.nubefactStatus === 'accepted'
        ? 'Venta registrada y comprobante aceptado por Nubefact.'
        : 'Venta registrada. Todavía no hay confirmación de emisión electrónica.');
      await Promise.resolve(onSaleCreated());
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo registrar la venta. Revisa stock o permisos.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(390px,0.95fr)]">
      <section className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar productos por nombre, SKU o codigo..." className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-slate-400" />
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
                  <span className={`rounded-md px-2 py-1 text-xs ${product.stock <= (product.minStock ?? 5) ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>Stock: {product.stock}</span>
                </div>
                <p className="mt-4 text-lg font-bold">{formatMoney(product.price)}</p>
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">Registro de venta</h3>
              <p className="mt-1 text-xs text-slate-500">Registra la venta y el tipo de comprobante</p>
            </div>
            {lastSale && <span className={`rounded-md px-2 py-1 text-xs font-semibold ${lastSale.nubefactStatus === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>{lastSale.nubefactStatus === 'accepted' ? 'Aceptado' : 'No confirmado'}</span>}
          </div>
          {cart.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center text-center text-sm text-slate-500">
              <Receipt className="mb-3 h-12 w-12 text-slate-300" />
              {lastSale ? 'Venta guardada. Puedes iniciar una nueva venta.' : 'No hay productos agregados'}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.product.name}</p>
                    <p className="text-sm text-slate-500">{formatMoney(item.product.price)} x {item.quantity}</p>
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
                {allowPremium && <option value="tarjeta">Tarjeta (Culqi)</option>}
                <option value="yape">Yape (confirmado manualmente)</option>
                <option value="plin">Plin (confirmado manualmente)</option>
              </select>
              {paymentMethod === 'tarjeta' && documentType !== 'factura' && <label className="block text-sm font-medium">Correo del cliente<input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} required placeholder="cliente@correo.com" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3" /></label>}
              <label className="block text-sm font-medium">Comprobante<select value={documentType} onChange={(event) => setDocumentType(event.target.value as 'boleta' | 'factura')} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3"><option value="boleta">Boleta</option>{allowPremium && <option value="factura">Factura</option>}</select></label>
              {documentType === 'factura' && <div className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2"><label className="text-sm font-medium">RUC<input required inputMode="numeric" maxLength={11} pattern="[0-9]{11}" value={customerDocumentNumber} onChange={(event) => setCustomerDocumentNumber(event.target.value)} placeholder="11 dígitos" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3" /></label><label className="text-sm font-medium">Razón social<input required maxLength={160} value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3" /></label><label className="text-sm font-medium">Dirección<input maxLength={240} value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3" /></label><label className="text-sm font-medium">Email<input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3" /></label></div>}
              <p className="text-xs text-slate-500">Yape/Plin se confirman manualmente. La tarjeta se tokeniza y procesa mediante Culqi.</p>
              <div className="rounded-lg bg-slate-50 p-4 text-sm">
                <div className="flex justify-between text-lg"><span>Total</span><strong>{formatMoney(total)}</strong></div>
              </div>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}
              {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">{message}</p>}
              {!activeCashSession && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Abre un turno en Caja para registrar esta venta.</p>}
              {paymentMethod === 'tarjeta' ? <CulqiCheckoutButton publicKey={culqiConfig.enabled ? culqiConfig.publicKey : null} amount={total} email={customerEmail} disabled={saving || !activeCashSession} busy={saving} onToken={(token) => void registerSale(token)} onError={setError} /> : <button type="button" onClick={() => void registerSale()} disabled={saving || !activeCashSession} className="h-11 w-full rounded-lg bg-neutral-950 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Registrando...' : 'Registrar venta'}</button>}
            </div>
          )}
          {lastSale && <button type="button" onClick={startNewSale} className="mt-4 h-10 w-full rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Nueva venta</button>}
        </div>
        {lastSale && <ElectronicReceipt sale={lastSale} onEmit={() => void emitElectronicDocument()} emitting={emittingDocument} allowPremium={allowPremium} />}
      </section>
    </div>
  );
}

function ElectronicReceipt({ sale, onEmit, emitting, allowPremium }: { sale: Sale; onEmit: () => void; emitting: boolean; allowPremium: boolean }) {
  const total = Number(sale.total ?? 0);
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div id="electronic-receipt" className="rounded-lg border border-slate-300 bg-white p-5 text-sm text-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-xl font-bold">SisMarket</h3>
          </div>
          <div className="rounded-lg border border-slate-300 px-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase text-slate-500">{sale.nubefactStatus === 'accepted' ? `Comprobante electrónico · ${sale.documentType ?? 'boleta'}` : 'Constancia interna de venta'}</p>
            <p className="mt-1 font-bold">{sale.ticketNumber}</p>
          </div>
        </div>
        <div className="grid gap-2 border-b border-slate-200 py-4 text-xs sm:grid-cols-2">
          <p><span className="font-semibold">Fecha:</span> {formatDateTime(sale.createdAt)}</p>
          <p><span className="font-semibold">Pago:</span> {getPaymentMethodLabel(sale.paymentMethod)}</p>
          <p><span className="font-semibold">Cliente:</span> {sale.customerName || 'Consumidor final'}</p>
          {sale.customerDocumentNumber && <p><span className="font-semibold">Documento:</span> {sale.customerDocumentNumber}</p>}
          <p><span className="font-semibold">Estado de emisión:</span> {sale.nubefactStatus === 'accepted' ? 'Aceptado' : sale.nubefactStatus === 'rejected' ? 'Rechazado' : sale.nubefactStatus === 'error' ? 'Error de conexión' : 'No emitido'}</p>
        </div>
        <div className="py-4">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr><th className="py-2">Producto</th><th className="py-2 text-center">Cant.</th><th className="py-2 text-right">Importe</th></tr>
            </thead>
            <tbody>
              {(sale.items ?? []).map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-2 font-medium">{item.product?.name ?? item.productId}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{formatMoney(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ml-auto w-full max-w-[240px] border-t border-slate-200 pt-4 text-sm">
          <div className="flex justify-between text-lg"><span>Total</span><strong>{formatMoney(total)}</strong></div>
        </div>

        {sale.nubefactPdfUrl && <a href={sale.nubefactPdfUrl} target="_blank" rel="noreferrer" className="mt-5 block rounded-lg bg-green-50 p-3 text-center text-xs font-semibold text-green-700">Ver PDF emitido por Nubefact</a>}
        {sale.nubefactStatus !== 'accepted' && <p className="mt-5 rounded-lg bg-amber-50 p-3 text-center text-xs text-amber-800">Esta impresión es una constancia interna de venta, no un comprobante electrónico emitido por SUNAT.</p>}
      </div>
      {allowPremium && sale.nubefactStatus !== 'accepted' && <button type="button" onClick={onEmit} disabled={emitting} className="mt-4 h-10 w-full rounded-lg border border-slate-200 text-sm font-semibold disabled:opacity-50">{emitting ? 'Enviando…' : 'Emitir comprobante con Nubefact'}</button>}
      {sale.nubefactPdfUrl && <a href={sale.nubefactPdfUrl} target="_blank" rel="noreferrer" className="mt-3 block rounded-lg bg-neutral-950 px-4 py-3 text-center text-sm font-semibold text-white">Ver PDF del comprobante</a>}
      <button type="button" onClick={() => window.print()} className="mt-3 h-10 w-full rounded-lg bg-neutral-950 text-sm font-semibold text-white">Imprimir constancia</button>
    </article>
  );
}
function SalesView({ sales, loading, onNewSale, onSalesChanged }: { sales: Sale[]; loading: boolean; onNewSale: () => void; onSalesChanged: () => Promise<void> | void }) {
  const [query, setQuery] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [chargeId, setChargeId] = useState('');
  const [reconcileBusy, setReconcileBusy] = useState(false);
  const [reconcileError, setReconcileError] = useState('');
  const todaySales = useMemo(() => sales.filter((sale) => sale.status === 'completada' && isTodaySale(sale)), [sales]);
  const filteredSales = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sales;
    return sales.filter((sale) => [sale.ticketNumber, sale.status, sale.paymentMethod ?? ''].join(' ').toLowerCase().includes(normalizedQuery));
  }, [sales, query]);
  const selectedSale = sales.find((sale) => sale.id === selectedSaleId) ?? null;
  const todayTotal = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const averageTicket = todaySales.length > 0 ? todayTotal / todaySales.length : 0;

  async function confirmPendingPayment() {
    if (!selectedSale || !chargeId.trim()) return;
    setReconcileBusy(true); setReconcileError('');
    try { await api.post(`/sales/${selectedSale.id}/confirm-payment`, { chargeId: chargeId.trim() }); setChargeId(''); await Promise.resolve(onSalesChanged()); }
    catch (error) { setReconcileError(getApiErrorMessage(error, 'Culqi no pudo confirmar ese cargo para esta venta.')); }
    finally { setReconcileBusy(false); }
  }

  async function cancelPendingPayment() {
    if (!selectedSale || !window.confirm('Confirma en Culqi que no se cobró. Esta acción anula la venta y devuelve los productos al inventario.')) return;
    setReconcileBusy(true); setReconcileError('');
    try { await api.post(`/sales/${selectedSale.id}/cancel-pending-payment`); await Promise.resolve(onSalesChanged()); }
    catch (error) { setReconcileError(getApiErrorMessage(error, 'No se pudo cancelar el pago pendiente.')); }
    finally { setReconcileBusy(false); }
  }

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
                    <td className="px-5 py-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs">{getPaymentMethodLabel(sale.paymentMethod)}</span></td>
                    <td className="px-5 py-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${sale.status === 'completada' ? 'bg-green-100 text-green-700' : ['pendiente_pago', 'procesando_pago'].includes(sale.status) ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{sale.status === 'pendiente_pago' ? 'Pago pendiente' : sale.status === 'procesando_pago' ? 'Pago en proceso' : sale.status === 'completada' ? 'Completada' : 'Anulada'}</span></td>
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
              <p className="mt-1 text-sm text-slate-500">{formatDateTime(selectedSale.createdAt)}</p>
              <div className="mt-6 space-y-3">
                {(selectedSale.items ?? []).map((item) => (
                  <div key={item.id} className="flex justify-between gap-4 border-b border-slate-100 pb-3 text-sm">
                    <span>{item.product?.name ?? 'Producto'}</span>
                    <strong>{item.quantity} x {formatMoney(item.unitPrice ?? 0)}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-between text-lg font-bold"><span>Total</span><span>{formatMoney(selectedSale.total)}</span></div>
              {['pendiente_pago', 'procesando_pago'].includes(selectedSale.status) && <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-950">Pago sin confirmar</p><p className="mt-1 text-xs text-amber-900">Consulta el panel de Culqi. Si aparece exitoso, ingresa su ID; si no se cobró, cancela para liberar el stock.</p>{selectedSale.culqiChargeId && <p className="mt-2 text-xs text-amber-900">ID recibido: {selectedSale.culqiChargeId}</p>}<input value={chargeId || selectedSale.culqiChargeId || ''} onChange={(event) => setChargeId(event.target.value)} placeholder="chr_test_… o chr_live_…" className="mt-3 h-10 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm" />{reconcileError && <p role="alert" className="mt-2 text-xs text-red-700">{reconcileError}</p>}<button type="button" disabled={reconcileBusy} onClick={() => void confirmPendingPayment()} className="mt-3 h-9 w-full rounded-lg bg-neutral-950 text-xs font-semibold text-white disabled:opacity-50">Verificar cargo con Culqi</button><button type="button" disabled={reconcileBusy} onClick={() => void cancelPendingPayment()} className="mt-2 h-9 w-full rounded-lg border border-amber-300 text-xs font-semibold text-amber-950 disabled:opacity-50">Confirmar que no hubo cobro y anular</button></div>}
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
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const activeSession = cashSessions.find(isOpenCashSession) ?? null;
  const displayedSession = activeSession ?? cashSessions[0] ?? null;
  const getSessionSales = (session: CashSession) => sales.filter((sale) => sale.cashSessionId === session.id && sale.status === 'completada');
  const displayedSessionSales = displayedSession ? getSessionSales(displayedSession) : [];
  const cashSessionSales = displayedSessionSales.filter((sale) => sale.paymentMethod === 'efectivo');
  const displayedSalesTotal = cashSessionSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const openingAmount = displayedSession ? Number(displayedSession.openingAmount) : 0;
  const expectedBalance = displayedSession
    ? isOpenCashSession(displayedSession)
      ? openingAmount + displayedSalesTotal
      : Number(displayedSession.expectedAmount ?? openingAmount + displayedSalesTotal)
    : 0;
  const countedBalance = displayedSession?.closingAmount != null ? Number(displayedSession.closingAmount) : null;
  const balanceDifference = countedBalance == null ? null : countedBalance - expectedBalance;
  const recentSales = displayedSession ? displayedSessionSales.slice(0, 7) : [];

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
    const value = window.prompt('Monto contado al cierre', String(expectedBalance.toFixed(2)));
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
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <CashSummary label="Hora actual" value={formatTime(currentTime)} />
          <CashSummary label="Hora inicio" value={displayedSession ? formatTime(displayedSession.openedAt) : '--:--'} />
          <CashSummary label="Saldo inicial" value={formatMoney(openingAmount)} />
          <CashSummary label="Ventas en efectivo" value={formatMoney(displayedSalesTotal)} />
          <CashSummary label="Saldo esperado" value={formatMoney(expectedBalance)} />
          <CashSummary label={countedBalance == null ? 'Saldo actual' : 'Saldo contado'} value={formatMoney(countedBalance ?? expectedBalance)} />
        </div>
        {balanceDifference != null && <p className={`mt-4 text-sm font-semibold ${Math.abs(balanceDifference) < 0.01 ? 'text-green-700' : 'text-orange-700'}`}>Diferencia de cierre: {formatMoney(balanceDifference)}</p>}
        {(cashMessage || cashError) && <p className={`mt-4 text-sm font-semibold ${cashError ? 'text-red-700' : 'text-green-700'}`}>{cashError || cashMessage}</p>}
      </section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><h3 className="text-xl font-bold">Historial de turnos</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Cajero</th><th className="px-5 py-3 font-medium">Fecha</th><th className="px-5 py-3 font-medium">Horario</th><th className="px-5 py-3 font-medium">Inicial</th><th className="px-5 py-3 font-medium">Ventas</th><th className="px-5 py-3 font-medium">Esperado</th><th className="px-5 py-3 font-medium">Contado</th><th className="px-5 py-3 font-medium">Dif.</th><th className="px-5 py-3 font-medium">Estado</th></tr></thead>
              <tbody>
                {cashSessions.map((session) => {
                  const sessionSalesTotal = getSessionSales(session).filter((sale) => sale.paymentMethod === 'efectivo').reduce((sum, sale) => sum + Number(sale.total), 0);
                  const sessionOpening = Number(session.openingAmount);
                  const sessionExpected = isOpenCashSession(session) ? sessionOpening + sessionSalesTotal : Number(session.expectedAmount ?? sessionOpening + sessionSalesTotal);
                  const sessionCounted = session.closingAmount != null ? Number(session.closingAmount) : null;
                  const sessionDifference = sessionCounted == null ? null : sessionCounted - sessionExpected;
                  return <tr key={session.id} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">Caja</td><td className="px-5 py-4">{formatDate(session.openedAt)}</td><td className="px-5 py-4">{formatTime(session.openedAt)} - {session.closedAt ? formatTime(session.closedAt) : 'Activo'}</td><td className="px-5 py-4">{formatMoney(sessionOpening)}</td><td className="px-5 py-4">{formatMoney(sessionSalesTotal)}</td><td className="px-5 py-4 font-semibold">{formatMoney(sessionExpected)}</td><td className="px-5 py-4">{sessionCounted == null ? '--' : formatMoney(sessionCounted)}</td><td className={`px-5 py-4 font-semibold ${sessionDifference != null && Math.abs(sessionDifference) >= 0.01 ? 'text-orange-600' : 'text-slate-700'}`}>{sessionDifference == null ? '--' : formatMoney(sessionDifference)}</td><td className="px-5 py-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${isOpenCashSession(session) ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{getCashSessionLabel(session)}</span></td></tr>;
                })}
                {cashSessions.length === 0 && <tr><td className="px-5 py-8 text-slate-500" colSpan={9}>No hay turnos registrados.</td></tr>}
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

function ProvidersView({ products, suppliers, onSuppliersChanged }: { products: Product[]; suppliers: Supplier[]; onSuppliersChanged: () => Promise<void> | void }) {
  const [query, setQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [productCategory, setProductCategory] = useState('Todas');
  const [productStock, setProductStock] = useState('Todos');
  const [productSupplier, setProductSupplier] = useState('Todos');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SupplierFormState>(EMPTY_SUPPLIER_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState('');
  const [purchaseLines, setPurchaseLines] = useState([{ productId: '', quantity: '1', unitCost: '' }]);
  const [purchaseSaving, setPurchaseSaving] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [purchaseMessage, setPurchaseMessage] = useState('');
  const [orderActionId, setOrderActionId] = useState<string | null>(null);
  const providerRows = suppliers;
  const activeSuppliers = providerRows.filter((provider) => provider.active);
  const purchaseTotal = purchaseLines.reduce((sum, line) => sum + toNumber(line.quantity) * toNumber(line.unitCost), 0);

  useEffect(() => {
    api.get<PurchaseOrder[]>('/purchase-orders')
      .then(({ data }) => setPurchaseOrders(data))
      .catch((err) => setPurchaseError(getApiErrorMessage(err, 'No se pudieron cargar las órdenes de compra.')));
  }, []);

  function addPurchaseLine() {
    setPurchaseLines((current) => [...current, { productId: '', quantity: '1', unitCost: '' }]);
  }

  async function createPurchaseOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPurchaseError('');
    setPurchaseMessage('');
    setPurchaseSaving(true);
    try {
      const lines = purchaseLines.map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
        unitCost: Number(line.unitCost),
      }));
      const { data } = await api.post<PurchaseOrder>('/purchase-orders', {
        supplierId: purchaseSupplierId,
        items: lines,
      });
      setPurchaseOrders((current) => [data, ...current]);
      setPurchaseLines([{ productId: '', quantity: '1', unitCost: '' }]);
      setPurchaseSupplierId('');
      setShowPurchaseForm(false);
      setPurchaseMessage(`Orden ${data.orderNumber} creada. Al marcarla recibida se actualizará el stock.`);
    } catch (err) {
      setPurchaseError(getApiErrorMessage(err, 'No se pudo crear la orden de compra.'));
    } finally {
      setPurchaseSaving(false);
    }
  }

  async function updatePurchaseOrder(order: PurchaseOrder, action: 'receive' | 'cancel') {
    setOrderActionId(order.id);
    setPurchaseError('');
    setPurchaseMessage('');
    try {
      const { data } = await api.patch<PurchaseOrder>(`/purchase-orders/${order.id}/${action}`);
      setPurchaseOrders((current) => current.map((item) => item.id === data.id ? { ...item, ...data } : item));
      if (action === 'receive') await Promise.resolve(onSuppliersChanged());
      setPurchaseMessage(action === 'receive' ? `Orden ${order.orderNumber} recibida; el inventario fue actualizado.` : `Orden ${order.orderNumber} cancelada.`);
    } catch (err) {
      setPurchaseError(getApiErrorMessage(err, 'No se pudo actualizar la orden.'));
    } finally {
      setOrderActionId(null);
    }
  }
  const filteredProviders = providerRows.filter((provider) => [provider.name, provider.contact, provider.email ?? '', provider.phone ?? ''].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const selected = providerRows.find((provider) => provider.id === selectedProvider);
  const productCategories = Array.from(new Set(products.map((product) => product.category).filter((category): category is string => Boolean(category)))).sort((a, b) => a.localeCompare(b, 'es'));
  const filteredProducts = products.filter((product) => {
    const matchesQuery = [product.name, product.sku, product.barcode ?? '', product.category ?? ''].join(' ').toLowerCase().includes(productQuery.trim().toLowerCase());
    const matchesCategory = productCategory === 'Todas' || product.category === productCategory;
    const matchesStock = productStock === 'Todos' || (productStock === 'Bajo' ? product.stock <= (product.minStock ?? 5) : product.stock > (product.minStock ?? 5));
    const matchesSupplier = productSupplier === 'Todos' || (product.supplierId ?? product.supplier?.id ?? '') === productSupplier;
    return matchesQuery && matchesCategory && matchesStock && matchesSupplier;
  });

  async function createSupplier(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.post<Supplier>('/suppliers', {
        name: form.name.trim(),
        contact: form.contact.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        lastOrder: form.lastOrder || undefined,
        monthlyTotal: toNumber(form.monthlyTotal),
      });
      setForm(EMPTY_SUPPLIER_FORM);
      setShowForm(false);
      setMessage('Proveedor agregado correctamente.');
      await Promise.resolve(onSuppliersChanged());
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo agregar el proveedor.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h3 className="text-xl font-bold">Órdenes de compra</h3><p className="mt-1 text-sm text-slate-500">El stock aumenta únicamente al confirmar la recepción de una orden.</p></div>
          <button type="button" onClick={() => { setShowPurchaseForm((value) => !value); setPurchaseError(''); }} disabled={!activeSuppliers.length || !products.length} className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Nueva orden</button>
        </div>
        {(!activeSuppliers.length || !products.length) && <p className="mt-3 text-sm text-amber-700">Registra al menos un proveedor activo y un producto para crear una orden.</p>}
        {(purchaseError || purchaseMessage) && <p role={purchaseError ? 'alert' : 'status'} className={`mt-3 text-sm font-semibold ${purchaseError ? 'text-red-600' : 'text-green-700'}`}>{purchaseError || purchaseMessage}</p>}
        {showPurchaseForm && <form onSubmit={createPurchaseOrder} className="mt-5 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="block max-w-md text-sm font-medium">Proveedor<select required value={purchaseSupplierId} onChange={(event) => setPurchaseSupplierId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3"><option value="">Selecciona proveedor</option>{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          {purchaseLines.map((line, index) => <div key={index} className="grid gap-3 sm:grid-cols-[minmax(200px,1fr)_120px_150px]">
            <label className="text-sm font-medium">Producto<select required value={line.productId} onChange={(event) => setPurchaseLines((current) => current.map((item, i) => i === index ? { ...item, productId: event.target.value } : item))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3"><option value="">Selecciona producto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label>
            <label className="text-sm font-medium">Cantidad<input required type="number" min="1" step="1" value={line.quantity} onChange={(event) => setPurchaseLines((current) => current.map((item, i) => i === index ? { ...item, quantity: event.target.value } : item))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3" /></label>
            <label className="text-sm font-medium">Costo unitario<input required type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => setPurchaseLines((current) => current.map((item, i) => i === index ? { ...item, unitCost: event.target.value } : item))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3" /></label>
          </div>)}
          <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={addPurchaseLine} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold">Agregar producto</button><p className="font-bold">Total estimado: {formatMoney(purchaseTotal)}</p></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowPurchaseForm(false)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold">Cancelar</button><button type="submit" disabled={purchaseSaving} className="h-10 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{purchaseSaving ? 'Guardando…' : 'Crear orden'}</button></div>
        </form>}
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3 font-medium">Orden</th><th className="px-4 py-3 font-medium">Proveedor</th><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3 font-medium">Productos</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Estado / acción</th></tr></thead><tbody>{purchaseOrders.map((order) => <tr key={order.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{order.orderNumber}</td><td className="px-4 py-3">{order.supplier?.name ?? 'Proveedor'}</td><td className="px-4 py-3">{formatDate(order.createdAt)}</td><td className="px-4 py-3">{order.items?.map((item) => `${item.product?.name ?? 'Producto'} × ${item.quantity}`).join(', ')}</td><td className="px-4 py-3 font-semibold">{formatMoney(order.total)}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${order.status === 'received' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>{order.status === 'received' ? 'Recibida' : order.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}</span>{order.status === 'pending' && <><button type="button" disabled={orderActionId === order.id} onClick={() => void updatePurchaseOrder(order, 'receive')} className="rounded-md border border-green-200 px-2 py-1 text-xs font-semibold text-green-700 disabled:opacity-50">Recibir</button><button type="button" disabled={orderActionId === order.id} onClick={() => void updatePurchaseOrder(order, 'cancel')} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50">Cancelar</button></>}</div></td></tr>)}{purchaseOrders.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aún no hay órdenes de compra.</td></tr>}</tbody></table></div>
      </section>
      {providerRows.length === 0 && <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 sm:flex-row sm:items-center sm:justify-between"><p>Los nombres de proveedor que aparecían en Inventario se deducían del nombre del producto; no estaban guardados y podían ser incorrectos. Registra aquí los proveedores reales y asígnalos a tus productos desde Inventario.</p><button type="button" onClick={() => setShowForm(true)} className="h-10 shrink-0 rounded-lg bg-neutral-950 px-4 font-semibold text-white">Registrar proveedor</button></div>}
      <div className="flex justify-end"><button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Nuevo proveedor</button></div>
      {showForm && (
        <form onSubmit={createSupplier} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <InventoryInput label="Proveedor" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="Nombre comercial" />
            <InventoryInput label="Contacto" value={form.contact} onChange={(value) => setForm((current) => ({ ...current, contact: value }))} placeholder="Persona de contacto" />
            <InventoryInput label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} placeholder="correo@proveedor.pe" />
            <InventoryInput label="Telefono" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} placeholder="+51 999 999 999" />
            <InventoryInput label="Ultimo pedido" value={form.lastOrder} onChange={(value) => setForm((current) => ({ ...current, lastOrder: value }))} placeholder="2026-07-08" />
            <InventoryInput label="Total mes" value={form.monthlyTotal} onChange={(value) => setForm((current) => ({ ...current, monthlyTotal: value }))} placeholder="0.00" inputMode="decimal" />
          </div>
          {(message || error) && <p className={`mt-4 text-sm font-semibold ${error ? 'text-red-600' : 'text-green-700'}`}>{error || message}</p>}
          <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold">Cancelar</button><button type="submit" disabled={saving || !form.name.trim() || !form.contact.trim()} className="h-10 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar proveedor'}</button></div>
        </form>
      )}
      {!showForm && (message || error) && <p className={`text-sm font-semibold ${error ? 'text-red-600' : 'text-green-700'}`}>{error || message}</p>}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proveedores..." className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none" /></div></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Proveedor</th><th className="px-5 py-3 font-medium">Contacto</th><th className="px-5 py-3 font-medium">Productos asociados</th><th className="px-5 py-3 font-medium">Último pedido</th><th className="px-5 py-3 font-medium">Total mes</th><th className="px-5 py-3 font-medium">Estado</th></tr></thead>
              <tbody>{filteredProviders.map((provider) => <tr key={provider.id} onClick={() => setSelectedProvider(provider.id)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"><td className="px-5 py-4"><p className="font-bold">{provider.name}</p><p className="text-xs text-slate-500">{provider.email ?? 'Sin email'}</p></td><td className="px-5 py-4"><p className="font-medium">{provider.contact}</p><p className="text-xs text-slate-500">{provider.phone ?? 'Sin telefono'}</p></td><td className="px-5 py-4">{products.filter((product) => (product.supplierId ?? product.supplier?.id) === provider.id).length}</td><td className="px-5 py-4">{provider.lastOrder ? formatDate(provider.lastOrder) : 'Sin pedidos'}</td><td className="px-5 py-4 font-semibold">{formatMoney(provider.monthlyTotal)}</td><td className="px-5 py-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${provider.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{provider.active ? 'Activo' : 'Inactivo'}</span></td></tr>)}{filteredProviders.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">{providerRows.length === 0 ? 'No hay proveedores guardados. Registra uno y asígnalo a sus productos desde Inventario.' : 'No encontramos proveedores con esa búsqueda.'}</td></tr>}</tbody>
            </table>
          </div>
        </div>
        <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">{selected ? <div><h3 className="text-xl font-bold">{selected.name}</h3><p className="mt-1 text-sm text-slate-500">{selected.email ?? 'Sin email registrado'}</p><div className="mt-6 space-y-3 text-sm"><DetailLine label="Contacto" value={selected.contact} /><DetailLine label="Teléfono" value={selected.phone ?? 'Sin teléfono'} /><DetailLine label="Productos asociados" value={String(products.filter((product) => (product.supplierId ?? product.supplier?.id) === selected.id).length)} /><DetailLine label="Último pedido" value={selected.lastOrder ? formatDate(selected.lastOrder) : 'Sin pedidos'} /><DetailLine label="Total mes" value={formatMoney(selected.monthlyTotal)} /></div></div> : <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-sm text-slate-500"><Users className="mb-3 h-12 w-12 text-slate-300" />Selecciona un proveedor para ver los detalles</div>}</aside>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><h3 className="text-xl font-bold">Productos del inventario</h3><p className="mt-1 text-sm text-slate-500">Los proveedores se asignan desde el formulario de cada producto en Inventario.</p></div>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{filteredProducts.length} de {products.length} productos</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_200px_180px_220px]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Buscar por nombre, SKU o código..." className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-slate-400" /></div>
          <select aria-label="Filtrar por categoría" value={productCategory} onChange={(event) => setProductCategory(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"><option value="Todas">Todas las categorías</option>{productCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
          <select aria-label="Filtrar por stock" value={productStock} onChange={(event) => setProductStock(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"><option value="Todos">Todo el stock</option><option value="Bajo">Stock bajo</option><option value="Disponible">Stock disponible</option></select>
          <select aria-label="Filtrar por proveedor" value={productSupplier} onChange={(event) => setProductSupplier(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"><option value="Todos">Todos los proveedores</option><option value="">Sin proveedor</option>{suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3 font-medium">Producto</th><th className="px-4 py-3 font-medium">SKU / Código</th><th className="px-4 py-3 font-medium">Categoría</th><th className="px-4 py-3 font-medium">Proveedor asignado</th><th className="px-4 py-3 font-medium">Stock</th><th className="px-4 py-3 font-medium">Precio</th></tr></thead>
            <tbody>{filteredProducts.map((product) => { const lowStock = product.stock <= (product.minStock ?? 5); return <tr key={product.id} className="border-t border-slate-100"><td className="px-4 py-3"><p className="font-semibold">{product.name}</p><p className="text-xs text-slate-500">{product.imageUrl ? 'Imagen registrada' : 'Sin imagen'}</p></td><td className="px-4 py-3"><p>{product.sku || 'Sin SKU'}</p><p className="text-xs text-slate-500">{product.barcode || 'Sin código de barras'}</p></td><td className="px-4 py-3">{product.category || 'Sin categoría'}</td><td className="px-4 py-3">{getProductProvider(product)}</td><td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${lowStock ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{product.stock} unidades{lowStock ? ' · Bajo' : ''}</span></td><td className="px-4 py-3 font-semibold">{formatMoney(product.price)}</td></tr>; })}{filteredProducts.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No hay productos que coincidan con esos filtros.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-slate-500">{label}</span><strong className="text-right">{value}</strong></div>;
}

function ReportsView({ products }: { products: Product[] }) {
  const today = new Date();
  const [startDate, setStartDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() - 29); return date.toLocaleDateString('en-CA'); });
  const [endDate, setEndDate] = useState(() => today.toLocaleDateString('en-CA'));
  const invalidRange = startDate > endDate;
  const [reportSales, setReportSales] = useState<Sale[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  useEffect(() => {
    if (invalidRange) { setReportSales([]); setReportLoading(false); setReportError(''); return; }
    let active = true;
    setReportLoading(true); setReportError(''); setReportSales([]);
    api.get<Sale[]>('/sales/report', { params: { from: startDate, to: endDate } })
      .then(({ data }) => { if (active) setReportSales(data); })
      .catch((error) => { if (active) { setReportSales([]); setReportError(getApiErrorMessage(error, 'No se pudieron cargar las ventas de este periodo.')); } })
      .finally(() => { if (active) setReportLoading(false); });
    return () => { active = false; };
  }, [startDate, endDate, invalidRange]);
  const completedSales = invalidRange ? [] : reportSales;
  const totalSales = completedSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const soldUnits = completedSales.reduce((sum, sale) => sum + countSaleItems(sale), 0);
  const averageTicket = completedSales.length > 0 ? totalSales / completedSales.length : 0;
  const topProducts = getTopProducts(products, completedSales);
  const categoryRows = getSalesByCategory(completedSales);
  const setPreset = (days: number) => {
    const from = new Date(); from.setDate(from.getDate() - days + 1);
    setStartDate(from.toLocaleDateString('en-CA'));
    setEndDate(new Date().toLocaleDateString('en-CA'));
  };
  const exportCsv = () => {
    const rows = [
      ['Reporte de ventas', `${startDate} a ${endDate}`],
      ['Ventas totales', totalSales.toFixed(2)], ['Transacciones', String(completedSales.length)],
      ['Unidades vendidas', String(soldUnits)], ['Ticket promedio', averageTicket.toFixed(2)], [],
      ['Fecha', 'N° de venta', 'Medio de pago', 'Comprobante', 'Total'],
      ...completedSales.map((sale) => [new Date(sale.createdAt).toLocaleString('es-PE'), sale.ticketNumber, sale.paymentMethod ?? '', sale.documentType ?? 'boleta', Number(sale.total).toFixed(2)]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `reporte-ventas-${startDate}-${endDate}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <div id="report-print-root" className="space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setPreset(30)} className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Últimos 30 días</button><button type="button" onClick={() => setPreset(90)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Últimos 90 días</button><button type="button" onClick={() => setPreset(365)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Último año</button></div>
        <div className="flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Desde<input aria-label="Fecha inicial del reporte" className="mt-1 block h-10 rounded-lg border border-slate-200 px-3 text-sm" type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="text-sm font-medium">Hasta<input aria-label="Fecha final del reporte" className="mt-1 block h-10 rounded-lg border border-slate-200 px-3 text-sm" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></label><button type="button" onClick={exportCsv} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold">Exportar CSV</button><button type="button" onClick={() => window.print()} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold">Imprimir / Guardar PDF</button></div>
        {invalidRange && <p role="alert" className="text-sm text-red-700">La fecha inicial debe ser anterior a la fecha final.</p>}{reportError && <p role="alert" className="text-sm text-red-700">{reportError}</p>}{reportLoading && <p role="status" className="text-sm text-slate-500">Actualizando reporte…</p>}
      </section>
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><ReportCard icon={<TrendingUp />} tone="green" label="Ventas totales" value={formatMoney(totalSales)} detail="Periodo seleccionado" /><ReportCard icon={<ShoppingCart />} tone="blue" label="Transacciones" value={String(completedSales.length)} detail="Ventas completadas" /><ReportCard icon={<Package />} tone="violet" label="Productos vendidos" value={String(soldUnits)} detail="Unidades" /><ReportCard icon={<Users />} tone="orange" label="Ticket promedio" value={formatMoney(averageTicket)} detail="Por transacción" /></section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.65fr)]"><BarReportChart sales={completedSales} /><CategoryReport rows={categoryRows} /></section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold">Productos más vendidos</h3><p className="mt-1 text-sm text-slate-500">Top 5 del periodo</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-medium">Posición</th><th className="px-5 py-3 font-medium">Producto</th><th className="px-5 py-3 font-medium">Unidades vendidas</th><th className="px-5 py-3 font-medium">Ingresos</th><th className="px-5 py-3 font-medium">Participación</th></tr></thead><tbody>{topProducts.map((product, index) => <tr key={product.name} className="border-t border-slate-100"><td className="px-5 py-4"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-950 font-bold text-white">{index + 1}</span></td><td className="px-5 py-4 font-semibold">{product.name}</td><td className="px-5 py-4">{product.units}</td><td className="px-5 py-4 font-semibold">{formatMoney(product.income)}</td><td className="px-5 py-4"><div className="h-2 w-36 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-neutral-950" style={{ width: `${product.percent}%` }} /></div></td></tr>)}{topProducts.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No hay ventas en este periodo.</td></tr>}</tbody></table></div></section>
    </div>
  );
}

function ReportCard({ icon, tone, label, value, detail }: { icon: ReactNode; tone: 'green' | 'blue' | 'violet' | 'orange'; label: string; value: string; detail: string }) {
  const tones = { green: 'bg-green-100 text-green-600', blue: 'bg-blue-100 text-blue-600', violet: 'bg-violet-100 text-violet-600', orange: 'bg-orange-100 text-orange-600' };
  return <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]} [&>svg]:h-5 [&>svg]:w-5`}>{icon}</div><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p><p className="mt-2 text-sm text-slate-600">{detail}</p></article>;
}

function getSalesByCategory(sales: Sale[]) {
  const totals = new Map<string, number>();
  for (const sale of sales) for (const item of sale.items ?? []) {
    const name = item.product?.category?.trim() || 'Sin categoría';
    totals.set(name, (totals.get(name) ?? 0) + Number(item.subtotal ?? 0));
  }
  const grandTotal = [...totals.values()].reduce((sum, amount) => sum + amount, 0);
  return [...totals].map(([name, amount]) => ({ name, amount, percent: grandTotal ? Math.round(amount / grandTotal * 100) : 0 })).sort((a, b) => b.amount - a.amount);
}

function BarReportChart({ sales }: { sales: Sale[] }) {
  const buckets = new Map<string, number>();
  for (const sale of sales) {
    const date = new Date(sale.createdAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(month, (buckets.get(month) ?? 0) + Number(sale.total));
  }
  const rows = [...buckets].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, amount]) => ({ month: new Date(`${month}-01T12:00:00`).toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }), amount }));
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold">Ventas por mes</h3><p className="mt-1 text-sm text-slate-500">Importes reales de ventas completadas</p>{rows.length ? <div className="mt-8 h-72"><div className="flex h-56 items-end justify-around border-b border-l border-slate-300 px-6">{rows.map((row) => <div key={row.month} className="group relative flex h-full items-end"><span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-slate-500">{formatMoney(row.amount)}</span><div className="w-10 rounded-t bg-neutral-950" style={{ height: `${Math.max((row.amount / max) * 200, 3)}px` }} /></div>)}</div><div className="mt-2 flex justify-around px-8 text-xs text-slate-500">{rows.map((row) => <span key={row.month}>{row.month}</span>)}</div></div> : <p className="mt-8 py-20 text-center text-sm text-slate-500">Sin ventas para graficar.</p>}</div>;
}

function CategoryReport({ rows }: { rows: { name: string; percent: number }[] }) {
  const colors = ['#111827', '#475569', '#0f766e', '#b45309', '#7c3aed', '#be123c'];
  let cursor = 0;
  const slices = rows.map((row, index) => { const start = cursor; cursor += row.percent; return `${colors[index % colors.length]} ${start}% ${cursor}%`; });
  return <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold">Ventas por categoría</h3><p className="mt-1 text-sm text-slate-500">Participación del periodo</p><div className="mt-8 flex justify-center"><div className="flex h-40 w-40 items-center justify-center rounded-full" style={{ background: slices.length ? `conic-gradient(${slices.join(',')})` : '#e2e8f0' }}><div className="h-24 w-24 rounded-full bg-white" /></div></div><div className="mt-7 space-y-3">{rows.map((row, index) => <div key={row.name} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{row.name}</span><strong>{row.percent}%</strong></div>)}{rows.length === 0 && <p className="text-center text-sm text-slate-500">Sin detalle de productos en el periodo.</p>}</div></div>;
}

function AssistantView({ products, sales }: { products: Product[]; sales: Sale[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'welcome', sender: 'assistant', text: 'Hola! Soy tu asistente inteligente. Puedo ayudarte a consultar informacion sobre tu minimarket. Que te gustaria saber?', time: '11:03 a. m.' }]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const suggestions = ['Cuanto llevo vendido hoy?', 'Que productos tienen stock bajo?', 'Cuales son los mas vendidos?', 'Dame un resumen del negocio'];
  async function sendQuestion(value = question) {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    const time = formatTime(new Date());
    const pendingId = `${Date.now()}-pending`;
    setQuestion('');
    setSending(true);
    setMessages((current) => [...current, { id: `${Date.now()}-u`, sender: 'user', text: trimmed, time }, { id: pendingId, sender: 'assistant', text: 'Analizando tus datos...', time }]);
    try {
      const { data } = await api.post<{ answer: string }>('/assistant/chat', { message: trimmed });
      setMessages((current) => current.map((message) => message.id === pendingId ? { ...message, text: data.answer || buildAssistantAnswer(trimmed, products, sales) } : message));
    } catch {
      setMessages((current) => current.map((message) => message.id === pendingId ? { ...message, text: `${buildAssistantAnswer(trimmed, products, sales)}\n\nNota: Gemini no esta disponible ahora mismo, use el analisis local.` } : message));
    } finally {
      setSending(false);
    }
  }
  return <section className="mx-auto flex h-[calc(100vh-150px)] max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="flex-1 space-y-4 overflow-y-auto p-6">{messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>{message.sender === 'assistant' && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white"><Bot className="h-4 w-4" /></span>}<div className={`max-w-[680px] whitespace-pre-line rounded-2xl px-5 py-4 text-sm ${message.sender === 'user' ? 'bg-neutral-950 text-white' : 'bg-slate-100 text-slate-950'}`}><p>{message.text}</p><p className="mt-2 text-xs text-slate-500">{message.time}</p></div></div>)}</div><div className="border-t border-slate-100 p-4"><div className="mb-3 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => sendQuestion(suggestion)} disabled={sending} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{suggestion}</button>)}</div><div className="flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendQuestion(); }} disabled={sending} placeholder="Escribe tu pregunta..." className="h-11 flex-1 rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50" /><button type="button" onClick={() => sendQuestion()} disabled={sending} className="flex h-11 w-12 items-center justify-center rounded-lg bg-neutral-500 text-white hover:bg-neutral-700 disabled:opacity-60"><MessageCircle className="h-5 w-5" /></button></div></div></section>;
}
function buildAssistantAnswer(question: string, products: Product[], sales: Sale[]) {
  const normalized = question.toLowerCase();
  const completedSales = sales.filter((sale) => sale.status === 'completada');
  const todaySales = completedSales.filter(isTodaySale);
  const todayTotal = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const lowStock = getLowStockFromProducts(products);
  const topProducts = getTopProducts(products, completedSales);
  if (normalized.includes('vendido') || normalized.includes('venta')) return `Hoy llevas ${formatMoney(todayTotal)} en ventas y ${todaySales.length} transacciones registradas.`;
  if (normalized.includes('stock')) return lowStock.length === 0 ? 'No tienes productos por debajo del stock minimo.' : `Productos con stock bajo: ${lowStock.slice(0, 5).map((product) => `${product.name} (${product.stock} uds)`).join(', ')}.`;
  if (normalized.includes('mas vendidos') || normalized.includes('más vendidos')) return `Tus productos destacados son: ${topProducts.slice(0, 3).map((product) => `${product.name} (${product.units} uds)`).join(', ')}.`;
  return `Resumen rapido: ${products.length} productos activos, ${lowStock.length} con stock bajo, ${sales.length} ventas registradas y ${formatMoney(todayTotal)} vendido hoy.`;
}

function SettingsView({ currentUserId, systemUsers, onUsersChanged, onEntitlementsChanged }: { currentUserId: string; systemUsers: SystemUser[]; onUsersChanged: () => Promise<void> | void; onEntitlementsChanged: () => Promise<void> | void }) {
  const [tab, setTab] = useState<SettingsTab>('subscription');
  return <div className="grid gap-5 lg:grid-cols-[230px_1fr]"><aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><SettingsTabButton active={tab === 'subscription'} icon={<CreditCard />} label="Suscripcion" onClick={() => setTab('subscription')} /><SettingsTabButton active={tab === 'company'} icon={<Building2 />} label="Datos de la Empresa" onClick={() => setTab('company')} /><SettingsTabButton active={tab === 'users'} icon={<Users />} label="Usuarios" onClick={() => setTab('users')} /><SettingsTabButton active={tab === 'audit'} icon={<ShieldCheck />} label="Auditoría" onClick={() => setTab('audit')} /></aside><div className="space-y-5">{tab === 'subscription' && <SubscriptionSettings currentUser={systemUsers.find(user => user.id === currentUserId) ?? null} onSubscriptionChanged={onEntitlementsChanged} />}{tab === 'company' && <CompanySettings />}{tab === 'users' && <UsersSettings currentUserId={currentUserId} systemUsers={systemUsers} onUsersChanged={onUsersChanged} />}{tab === 'audit' && <AuthAuditSettings />}</div></div>;
}

function AuthAuditSettings() {
  const [rows, setRows] = useState<Array<{ id: string; username: string; event: string; successful: boolean; ip: string | null; userAgent: string | null; createdAt: string }>>([]);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/auth/audit').then(({ data }) => setRows(data)).catch(() => setError('No se pudo cargar la auditoría.')); }, []);
  return <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold">Auditoría de accesos</h3><p className="mt-1 text-sm text-slate-500">Últimos 100 inicios y cierres de sesión de esta empresa.</p>{error && <p className="mt-4 text-sm text-red-700">{error}</p>}<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Usuario</th><th className="px-3 py-2">Evento</th><th className="px-3 py-2">Resultado</th><th className="px-3 py-2">IP</th><th className="px-3 py-2">Navegador</th></tr></thead><tbody>{rows.map(row => <tr className="border-t border-slate-100" key={row.id}><td className="px-3 py-3">{formatDateTime(row.createdAt)}</td><td className="px-3 py-3">{row.username}</td><td className="px-3 py-3">{row.event === 'logout' ? 'Cierre de sesión' : 'Inicio de sesión'}</td><td className="px-3 py-3">{row.successful ? 'Correcto' : 'Fallido'}</td><td className="px-3 py-3">{row.ip ?? '—'}</td><td className="max-w-[220px] truncate px-3 py-3" title={row.userAgent ?? ''}>{row.userAgent ?? '—'}</td></tr>)}{rows.length === 0 && !error && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Todavía no hay eventos.</td></tr>}</tbody></table></div></section>;
}

function SettingsTabButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold ${active ? 'bg-neutral-950 text-white' : 'text-slate-700 hover:bg-slate-50'}`}><span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>{label}</button>;
}

function SubscriptionSettings({ currentUser, onSubscriptionChanged }: { currentUser: SystemUser | null; onSubscriptionChanged: () => Promise<void> | void }) {
  type Plan = { code: 'basico' | 'estandar' | 'premium'; name: string; amount: number; currency: string; interval: string; features: string[] };
  type CurrentSubscription = { id: string; planCode: string; amount: string; status: string; nextBillingAt: string | null; culqiSubscriptionId: string | null } | null;
  const [catalog, setCatalog] = useState<{ enabled: boolean; publicKey: string | null; plans: Plan[] }>({ enabled: false, publicKey: null, plans: [] });
  const [subscription, setSubscription] = useState<CurrentSubscription>(null);
  const [busy, setBusy] = useState(false);
  const [acceptedRecurringTerms, setAcceptedRecurringTerms] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const reload = async () => {
    const [plansResult, currentResult] = await Promise.all([api.get('/subscriptions/catalog'), api.get('/subscriptions/me')]);
    setCatalog(plansResult.data);
    setSubscription(currentResult.data);
    await Promise.resolve(onSubscriptionChanged());
  };
  useEffect(() => { reload().catch(() => setError('No se pudo consultar el estado de la suscripción.')); }, []);
  async function activate(planCode: Plan['code'], token: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      const { data } = await api.post<CurrentSubscription>('/subscriptions', { planCode, culqiToken: token, tyc: acceptedRecurringTerms });
      setSubscription(data);
      setMessage(data?.status === 'active' ? 'Suscripción activa. Culqi procesará los cobros mensuales.' : 'Solicitud enviada. Actualiza el estado en unos segundos para confirmar la activación.');
      await reload();
    } catch (err) { setError(getApiErrorMessage(err, 'No se pudo activar el plan.')); await reload().catch(() => undefined); }
    finally { setBusy(false); }
  }
  async function refreshStatus() {
    setBusy(true); setError('');
    try { const { data } = await api.post<CurrentSubscription>('/subscriptions/refresh'); setSubscription(data); await Promise.resolve(onSubscriptionChanged()); }
    catch (err) { setError(getApiErrorMessage(err, 'No se pudo actualizar el estado.')); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (!window.confirm('Culqi dejará de cobrar las renovaciones de este plan. ¿Quieres cancelar la suscripción?')) return;
    setBusy(true); setError(''); setMessage('');
    try { await api.post('/subscriptions/cancel'); setMessage('Suscripción cancelada.'); await reload(); }
    catch (err) { setError(getApiErrorMessage(err, 'No se pudo cancelar la suscripción.')); }
    finally { setBusy(false); }
  }
  const canCancel = subscription && ['active', 'pending', 'past_due'].includes(subscription.status);
  const statusLabel: Record<string, string> = { creating: 'Procesando', pending: 'Pendiente de confirmación', active: 'Activa', past_due: 'Pago pendiente', canceled: 'Cancelada', failed: 'Fallida' };
  return <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold">Planes y suscripción</h3><p className="mt-1 text-sm text-slate-500">Pago mensual en soles. Las renovaciones las gestiona Culqi.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}
    {subscription && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><div><p className="font-semibold">Plan {subscription.planCode} · {statusLabel[subscription.status] ?? subscription.status}</p><p className="mt-1 text-sm text-slate-600">S/ {Number(subscription.amount).toFixed(2)} al mes{subscription.nextBillingAt ? ` · próximo cobro ${formatDate(subscription.nextBillingAt)}` : ''}</p><p className="mt-1 text-xs text-slate-500">ID Culqi: {subscription.culqiSubscriptionId ?? 'esperando respuesta'}</p></div><div className="flex gap-2"><button type="button" onClick={() => void refreshStatus()} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">Actualizar estado</button>{canCancel && <button type="button" onClick={() => void cancel()} disabled={busy} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Cancelar</button>}</div></div>}
    {!catalog.enabled && <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">El cobro recurrente todavía no está configurado en el servidor. Se necesitan las llaves de facturación y los IDs de los planes mensuales creados en Culqi.</p>}
    {catalog.enabled && !subscription && <label className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-700"><input type="checkbox" checked={acceptedRecurringTerms} onChange={(event) => setAcceptedRecurringTerms(event.target.checked)} className="mt-0.5" /><span>Acepto los términos y autorizo el cobro inicial y las renovaciones automáticas mensuales del plan elegido hasta que cancele la suscripción.</span></label>}
    <div className="mt-5 grid gap-4 lg:grid-cols-3">{catalog.plans.map(plan => <article key={plan.code} className={`rounded-lg border p-5 ${subscription?.planCode === plan.code && subscription.status === 'active' ? 'border-neutral-950 ring-1 ring-neutral-950' : 'border-slate-200'}`}><h4 className="text-lg font-bold">{plan.name}</h4><p className="mt-2 text-2xl font-extrabold">S/ {plan.amount}<span className="text-sm font-normal text-slate-500"> / mes</span></p><ul className="mt-4 space-y-2 text-sm text-slate-600">{plan.features.map(feature => <li key={feature}>• {feature}</li>)}</ul>{catalog.enabled && !subscription && <CulqiCheckoutButton publicKey={catalog.publicKey} amount={plan.amount} email={currentUser?.email ?? ''} disabled={busy || !currentUser?.email || !acceptedRecurringTerms} busy={busy} onToken={token => void activate(plan.code, token)} onError={setError} />}{subscription?.planCode === plan.code && subscription.status === 'active' && <p className="mt-4 rounded-lg bg-green-50 p-3 text-center text-sm font-semibold text-green-700">Plan actual</p>}</article>)}</div>
    <p className="mt-5 text-xs text-slate-500">La tarjeta se tokeniza en el checkout de Culqi; SisMarket almacena solo los identificadores de cliente/tarjeta que devuelve Culqi.</p>
  </section>;
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-2 font-bold">{value}</p></div>;
}

function CompanySettings() {
  type Profile = {
    taxId: string | null;
    legalName: string | null;
    tradeName: string | null;
    email: string | null;
    phone: string | null;
    taxAddress: string | null;
    legalRepresentative: string | null;
    representativeDni: string | null;
    invoiceSeries: string;
    receiptSeries: string;
    nextInvoiceNumber: number;
    nextReceiptNumber: number;
    nubefactConfigured: boolean;
    nubefactToken: string;
    clearNubefactToken: boolean;
    culqiPublicKey: string | null;
    culqiConfigured: boolean;
    culqiSecretKey: string;
    clearCulqiSecretKey: boolean;
  };
  const initial: Profile = { taxId: '', legalName: '', tradeName: '', email: '', phone: '', taxAddress: '', legalRepresentative: '', representativeDni: '', invoiceSeries: 'F001', receiptSeries: 'B001', nextInvoiceNumber: 1, nextReceiptNumber: 1, nubefactConfigured: false, nubefactToken: '', clearNubefactToken: false, culqiPublicKey: '', culqiConfigured: false, culqiSecretKey: '', clearCulqiSecretKey: false };
  const [profile, setProfile] = useState<Profile>(initial);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<Profile>('/business-profile')
      .then(({ data }) => { if (active) setProfile({ ...initial, ...data }); })
      .catch((err) => { if (active) setError(getApiErrorMessage(err, 'No se pudo cargar la información de la empresa.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function setField<K extends keyof Profile>(field: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { nubefactConfigured: _nubefactConfigured, culqiConfigured: _culqiConfigured, ...editableProfile } = profile;
      const payload = Object.fromEntries(Object.entries(editableProfile).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || null : value]));
      const { data } = await api.patch<Profile>('/business-profile', payload);
      setProfile({ ...initial, ...data, nubefactToken: '', clearNubefactToken: false, culqiSecretKey: '', clearCulqiSecretKey: false });
      setEditing(false);
      setMessage('Datos de la empresa guardados.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron guardar los datos. Verifica el RUC, DNI y las series.'));
    } finally {
      setSaving(false);
    }
  }

  const display = (value: string | null | undefined) => value?.trim() || 'Sin configurar';
  if (loading) return <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">Cargando datos de la empresa…</section>;

  return <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
    <div className="mb-5 flex items-start justify-between gap-3"><div><h3 className="text-xl font-bold">Datos de la empresa</h3><p className="mt-1 text-sm text-slate-500">Información que se usará para configurar comprobantes.</p></div>{!editing && <button type="button" onClick={() => { setEditing(true); setError(''); setMessage(''); }} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold">Editar</button>}</div>
    {(message || error) && <p role={error ? 'alert' : 'status'} className={`mb-4 text-sm font-semibold ${error ? 'text-red-600' : 'text-green-700'}`}>{error || message}</p>}
    {editing ? <form onSubmit={saveProfile} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <InventoryInput label="RUC (11 dígitos)" value={profile.taxId ?? ''} onChange={(value) => setField('taxId', value)} placeholder="20123456789" inputMode="numeric" />
        <InventoryInput label="Razón social" value={profile.legalName ?? ''} onChange={(value) => setField('legalName', value)} placeholder="Empresa S.A.C." />
        <InventoryInput label="Nombre comercial" value={profile.tradeName ?? ''} onChange={(value) => setField('tradeName', value)} placeholder="Minimarket" />
        <InventoryInput label="Email corporativo" value={profile.email ?? ''} onChange={(value) => setField('email', value)} placeholder="contacto@empresa.pe" />
        <InventoryInput label="Teléfono" value={profile.phone ?? ''} onChange={(value) => setField('phone', value)} placeholder="+51 999 999 999" />
        <InventoryInput label="Dirección fiscal" value={profile.taxAddress ?? ''} onChange={(value) => setField('taxAddress', value)} placeholder="Dirección, distrito, Lima" />
        <InventoryInput label="Representante legal" value={profile.legalRepresentative ?? ''} onChange={(value) => setField('legalRepresentative', value)} placeholder="Nombres y apellidos" />
        <InventoryInput label="DNI del representante" value={profile.representativeDni ?? ''} onChange={(value) => setField('representativeDni', value)} placeholder="12345678" inputMode="numeric" />
        <InventoryInput label="Serie de boleta" value={profile.receiptSeries} onChange={(value) => setField('receiptSeries', value.toUpperCase())} placeholder="B001" />
        <InventoryInput label="Serie de factura" value={profile.invoiceSeries} onChange={(value) => setField('invoiceSeries', value.toUpperCase())} placeholder="F001" />
        <InventoryInput label="Siguiente número de boleta" type="number" min="1" value={String(profile.nextReceiptNumber)} onChange={(value) => setField('nextReceiptNumber', Math.max(1, Number(value) || 1))} />
        <InventoryInput label="Siguiente número de factura" type="number" min="1" value={String(profile.nextInvoiceNumber)} onChange={(value) => setField('nextInvoiceNumber', Math.max(1, Number(value) || 1))} />
        <InventoryInput label={profile.nubefactConfigured ? 'Cambiar token Nubefact (opcional)' : 'Token Nubefact'} type="password" value={profile.nubefactToken} onChange={(value) => setField('nubefactToken', value)} placeholder={profile.nubefactConfigured ? 'Guardado de forma cifrada' : 'Pega el token de API'} />
        {profile.nubefactConfigured && <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={profile.clearNubefactToken} onChange={(event) => setField('clearNubefactToken', event.target.checked)} />Eliminar el token guardado</label>}
        <InventoryInput label="Llave pública de Culqi" value={profile.culqiPublicKey ?? ''} onChange={(value) => setField('culqiPublicKey', value)} placeholder="pk_test_…" />
        <InventoryInput label={profile.culqiConfigured ? 'Cambiar llave secreta de Culqi' : 'Llave secreta de Culqi'} type="password" value={profile.culqiSecretKey} onChange={(value) => setField('culqiSecretKey', value)} placeholder={profile.culqiConfigured ? 'Guardada de forma cifrada' : 'sk_test_…'} />
        {profile.culqiConfigured && <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={profile.clearCulqiSecretKey} onChange={(event) => setField('clearCulqiSecretKey', event.target.checked)} />Eliminar la llave secreta de Culqi</label>}
      </div>
      <p className="text-xs text-slate-500">Configura el siguiente número libre para cada serie si ya emitías comprobantes. Nubefact y la llave secreta de Culqi se cifran en la base de datos; configura APP_ENCRYPTION_KEY en el backend. Empieza con llaves de prueba de Culqi.</p>
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold">Cancelar</button><button type="submit" disabled={saving} className="h-10 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar datos'}</button></div>
    </form> : <div className="grid gap-5 sm:grid-cols-2"><DetailMetric label="RUC" value={display(profile.taxId)} /><DetailMetric label="Razón social" value={display(profile.legalName)} /><DetailMetric label="Nombre comercial" value={display(profile.tradeName)} /><DetailMetric label="Teléfono" value={display(profile.phone)} /><DetailMetric label="Dirección fiscal" value={display(profile.taxAddress)} /><DetailMetric label="Email corporativo" value={display(profile.email)} /><DetailMetric label="Representante legal" value={display(profile.legalRepresentative)} /><DetailMetric label="DNI del representante" value={display(profile.representativeDni)} /><DetailMetric label="Serie de boleta" value={profile.receiptSeries || 'B001'} /><DetailMetric label="Serie de factura" value={profile.invoiceSeries || 'F001'} /><DetailMetric label="Siguiente número de boleta" value={String(profile.nextReceiptNumber)} /><DetailMetric label="Siguiente número de factura" value={String(profile.nextInvoiceNumber)} /><DetailMetric label="Emisión Nubefact" value={profile.nubefactConfigured ? 'Configurada' : 'Pendiente de configurar'} /><DetailMetric label="Pagos con tarjeta Culqi" value={profile.culqiConfigured ? 'Configurados' : 'Pendientes de configurar'} /></div>}
  </section>;
}
function UsersSettings({ currentUserId, systemUsers, onUsersChanged }: { currentUserId: string; systemUsers: SystemUser[]; onUsersChanged: () => Promise<void> | void }) {
  type Invitation = { id: string; email: string; fullName: string; role: string; status: string; expiresAt: string; createdAt: string };
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'cajero' | 'almacenero'>('cajero');
  const [invitationUrl, setInvitationUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [passwordUser, setPasswordUser] = useState<SystemUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadInvitations = () => api.get<Invitation[]>('/invitations').then(({ data }) => setInvitations(data));
  useEffect(() => { loadInvitations().catch((err) => setError(getApiErrorMessage(err, 'No se pudieron cargar las invitaciones.'))); }, []);

  async function changeRole(userId: string, role: string) {
    setSavingUserId(userId); setMessage(''); setError('');
    try { await api.patch(`/users/${userId}/role`, { role }); setMessage('Rol actualizado.'); await Promise.resolve(onUsersChanged()); }
    catch (err) { setError(getApiErrorMessage(err, 'No se pudo cambiar el rol.')); }
    finally { setSavingUserId(null); }
  }

  async function changeStatus(user: SystemUser) {
    const active = user.active === false;
    setSavingStatusId(user.id); setMessage(''); setError('');
    try { await api.patch(`/users/${user.id}/status`, { active }); setMessage(active ? 'Usuario activado.' : 'Usuario desactivado.'); await Promise.resolve(onUsersChanged()); }
    catch (err) { setError(getApiErrorMessage(err, 'No se pudo actualizar el estado del usuario.')); }
    finally { setSavingStatusId(null); }
  }

  async function resetUserPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordUser) return;
    setSavingPassword(true); setError(''); setMessage('');
    try {
      await api.patch(`/users/${passwordUser.id}/password`, { password: newPassword });
      setMessage(`Contraseña actualizada para ${passwordUser.fullName}.`);
      setPasswordUser(null); setNewPassword('');
    } catch (err) { setError(getApiErrorMessage(err, 'No se pudo cambiar la contraseña.')); }
    finally { setSavingPassword(false); }
  }

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage(''); setInvitationUrl('');
    try {
      const { data } = await api.post<{ invitationUrl: string; email: string }>('/invitations', { email: email.trim(), fullName: inviteName.trim(), role: inviteRole });
      setInvitationUrl(data.invitationUrl); setMessage(`Invitación creada para ${data.email}. El enlace vence en 7 días.`);
      setEmail(''); setInviteName(''); setInviteRole('cajero'); await loadInvitations();
    } catch (err) { setError(getApiErrorMessage(err, 'No se pudo crear la invitación.')); }
    finally { setSaving(false); }
  }

  async function revokeInvitation(invitation: Invitation) {
    setError(''); setMessage('');
    try { await api.delete(`/invitations/${invitation.id}`); setMessage(`Invitación para ${invitation.email} revocada.`); await loadInvitations(); }
    catch (err) { setError(getApiErrorMessage(err, 'No se pudo revocar la invitación.')); }
  }

  const activeUsers = systemUsers.filter((user) => user.active !== false).length;
  const pendingInvitations = invitations.filter((item) => item.status === 'pending' && new Date(item.expiresAt) > new Date());
  return <>
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-bold">Usuarios del sistema</h3><p className="mt-1 text-sm text-slate-500">Invita al equipo con un enlace seguro de un solo uso.</p></div><button type="button" onClick={() => { setShowInviteForm((value) => !value); setError(''); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white"><Users className="h-4 w-4" />Invitar usuario</button></div>
      <div className="grid gap-4 sm:grid-cols-4"><UserMetric label="Total usuarios" value={String(systemUsers.length)} /><UserMetric active label="Activos" value={String(activeUsers)} /><UserMetric label="Cajeros" value={String(systemUsers.filter((user) => user.role === 'cajero').length)} /><UserMetric label="Almaceneros" value={String(systemUsers.filter((user) => user.role === 'almacenero').length)} /></div>
      {(message || error) && <p role={error ? 'alert' : 'status'} className={`mt-4 text-sm font-semibold ${error ? 'text-red-600' : 'text-green-700'}`}>{error || message}</p>}
      {invitationUrl && <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4"><p className="text-sm font-semibold text-green-900">Comparte este enlace con la persona invitada</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input readOnly value={invitationUrl} className="h-10 min-w-0 flex-1 rounded-lg border border-green-200 bg-white px-3 text-sm" /><button type="button" onClick={() => void navigator.clipboard.writeText(invitationUrl).then(() => setMessage('Enlace copiado.')).catch(() => setError('No se pudo copiar; selecciona el enlace y cópialo manualmente.'))} className="h-10 rounded-lg border border-green-300 px-4 text-sm font-semibold text-green-900">Copiar enlace</button></div><p className="mt-2 text-xs text-green-800">El enlace se muestra ahora y no se guarda en la base de datos.</p></div>}
      {showInviteForm && <form onSubmit={createInvitation} className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"><label className="text-sm font-medium">Nombre completo<input required maxLength={120} value={inviteName} onChange={(event) => setInviteName(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3" /></label><label className="text-sm font-medium">Correo electrónico<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3" /></label><label className="text-sm font-medium">Rol<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as 'cajero' | 'almacenero')} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3"><option value="cajero">Cajero</option><option value="almacenero">Almacenero</option></select></label><div className="flex items-end justify-end gap-2"><button type="button" onClick={() => setShowInviteForm(false)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold">Cancelar</button><button disabled={saving} className="h-10 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Creando…' : 'Crear invitación'}</button></div><p className="text-xs text-slate-500 sm:col-span-2">El sistema no tiene envío de correo configurado; copia el enlace y compártelo por un canal seguro.</p></form>}
      {passwordUser && <form onSubmit={resetUserPassword} className="mt-5 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><label className="min-w-64 flex-1 text-sm font-medium">Nueva contraseña para {passwordUser.fullName}<input required type="password" minLength={12} maxLength={100} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3" /></label><button type="submit" disabled={savingPassword} className="h-10 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{savingPassword ? 'Guardando…' : 'Cambiar contraseña'}</button><button type="button" onClick={() => { setPasswordUser(null); setNewPassword(''); }} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold">Cancelar</button><p className="w-full text-xs text-slate-500">Usa al menos 12 caracteres. La contraseña no se mostrará nuevamente.</p></form>}
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3">Usuario</th><th className="px-5 py-3">Rol</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Acción</th></tr></thead><tbody>{systemUsers.map((user) => <tr key={user.id} className="border-t border-slate-100"><td className="px-5 py-4"><p className="font-semibold">{user.fullName}{user.id === currentUserId ? ' (tú)' : ''}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="px-5 py-4"><select value={user.role} onChange={(event) => void changeRole(user.id, event.target.value)} disabled={savingUserId === user.id || user.id === currentUserId} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs disabled:opacity-50"><option value="dueno">Dueño</option><option value="cajero">Cajero</option><option value="almacenero">Almacenero</option></select></td><td className="px-5 py-4">{user.active === false ? 'Inactivo' : 'Activo'}</td><td className="px-5 py-4"><div className="flex gap-2"><button type="button" onClick={() => { setPasswordUser(user); setNewPassword(''); setError(''); }} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold">Cambiar contraseña</button><button type="button" onClick={() => void changeStatus(user)} disabled={user.id === currentUserId || savingStatusId === user.id} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{user.active === false ? 'Activar' : 'Desactivar'}</button></div></td></tr>)}{systemUsers.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">No se pudieron cargar usuarios o aún no hay cuentas.</td></tr>}</tbody></table></div>
    </section>
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><h3 className="text-xl font-bold">Invitaciones</h3><p className="mt-1 text-sm text-slate-500">Pendientes: {pendingInvitations.length}</p></div></div><div className="mt-4 divide-y divide-slate-100">{invitations.map((invitation) => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{invitation.fullName} · {invitation.email}</p><p className="text-xs text-slate-500">{invitation.role} · vence {formatDateTime(invitation.expiresAt)}</p></div><div className="flex items-center gap-2"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{invitation.status === 'accepted' ? 'Aceptada' : invitation.status === 'revoked' ? 'Revocada' : new Date(invitation.expiresAt) <= new Date() ? 'Vencida' : 'Pendiente'}</span>{invitation.status === 'pending' && new Date(invitation.expiresAt) > new Date() && <button type="button" onClick={() => void revokeInvitation(invitation)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">Revocar</button>}</div></div>)}{invitations.length === 0 && <p className="py-5 text-sm text-slate-500">Todavía no hay invitaciones.</p>}</div></section>
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold">Permisos por rol</h3><div className="mt-5 grid gap-4 md:grid-cols-3"><RoleCard title="Dueño" items={['Acceso completo', 'Configuración de empresa', 'Reportes y caja', 'Asistente IA']} /><RoleCard title="Cajero" items={['Punto de venta', 'Registro de ventas', 'Apertura y cierre de caja']} /><RoleCard title="Almacenero" items={['Inventario y ajustes de stock', 'Proveedores', 'Órdenes de compra']} /></div></section>
  </>;
}
function UserMetric({ label, value, active = false }: { label: string; value: string; active?: boolean }) {
  return <div className={`rounded-lg p-4 ${active ? 'bg-green-50' : 'bg-slate-50'}`}><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}

function RoleCard({ title, items }: { title: string; items: string[] }) {
  return <article className="rounded-lg border border-slate-200 p-5"><h4 className="font-bold">{title}</h4><ul className="mt-3 space-y-2 text-sm text-slate-600">{items.map((item) => <li key={item}>- {item}</li>)}</ul></article>;
}

function InventoryInput({ label, value, onChange, placeholder, inputMode, type = 'text', min }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']; type?: HTMLInputTypeAttribute; min?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span><input type={type} min={min} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400" /></label>;
}

function getProductProvider(product: Product) {
  return product.supplier?.name ?? 'Sin proveedor asignado';
}

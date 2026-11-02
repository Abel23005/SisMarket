import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Boxes, LogOut, Plus, Search } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/apiError';
import type { CashSession, Product, PurchaseOrder, Sale, StockAlert, Supplier } from './owner/types';
import { formatDateTime, formatMoney } from './owner/ownerUtils';
import { CulqiCheckoutButton } from '../components/CulqiCheckoutButton';

const ROLE_LABELS: Record<string, string> = { dueno: 'Dueño', cajero: 'Cajero', almacenero: 'Almacenero' };
type Section = 'pos' | 'cash' | 'inventory' | 'orders';
type CartLine = { product: Product; quantity: number };

export default function StaffDashboard({ fullName, role, products, loading, loadWarning, onRefresh, onLogout, allowPremium, allowStandard }: {
  fullName?: string;
  role?: string;
  products: Product[];
  loading: boolean;
  loadWarning: string;
  onRefresh: () => Promise<void> | void;
  onLogout: () => void;
  allowPremium: boolean;
  allowStandard: boolean;
}) {
  const isCashier = role === 'cajero';
  const [section, setSection] = useState<Section>(isCashier ? 'pos' : 'inventory');
  const [session, setSession] = useState<CashSession | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [cashBusy, setCashBusy] = useState(false);
  const [cashMessage, setCashMessage] = useState('');
  const [cashError, setCashError] = useState('');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [culqiConfig, setCulqiConfig] = useState<{ enabled: boolean; publicKey: string | null }>({ enabled: false, publicKey: null });
  const [documentType, setDocumentType] = useState<'boleta' | 'factura'>('boleta');
  const [customerDocumentNumber, setCustomerDocumentNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [emittingDocument, setEmittingDocument] = useState(false);
  const [saleBusy, setSaleBusy] = useState(false);
  const [saleMessage, setSaleMessage] = useState('');
  const [saleError, setSaleError] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [orderLines, setOrderLines] = useState([{ productId: '', quantity: '1', unitCost: '' }]);
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderMessage, setOrderMessage] = useState('');

  useEffect(() => {
    if (!isCashier) return;
    api.get<CashSession | null>('/cash-register/open/current').then(({ data }) => setSession(data)).catch((err) => setCashError(getApiErrorMessage(err, 'No se pudo consultar tu caja.')));
    if (allowPremium) api.get<{ enabled: boolean; publicKey: string | null }>('/payments/culqi/config').then(({ data }) => setCulqiConfig(data)).catch(() => setCulqiConfig({ enabled: false, publicKey: null }));
    else setCulqiConfig({ enabled: false, publicKey: null });
  }, [isCashier, allowPremium]);

  useEffect(() => {
    if (isCashier) return;
    Promise.all([allowStandard ? api.get<Supplier[]>('/suppliers') : Promise.resolve({ data: [] as Supplier[] }), allowStandard ? api.get<PurchaseOrder[]>('/purchase-orders') : Promise.resolve({ data: [] as PurchaseOrder[] }), api.get<StockAlert[]>('/alerts')])
      .then(([supplierResponse, orderResponse, alertResponse]) => { setSuppliers(supplierResponse.data); setOrders(orderResponse.data); setStockAlerts(alertResponse.data); })
      .catch((err) => setOrderError(getApiErrorMessage(err, 'No se pudieron cargar proveedores y órdenes.')));
  }, [isCashier, allowStandard]);

  const visibleProducts = useMemo(() => products.filter((product) => [product.name, product.sku, product.barcode ?? '', product.category ?? ''].join(' ').toLowerCase().includes(query.trim().toLowerCase())), [products, query]);
  const cartTotal = cart.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);

  function addProduct(product: Product) {
    setSaleError('');
    setSaleMessage('');
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) return current.map((line) => line.product.id === product.id ? { ...line, quantity: Math.min(product.stock, line.quantity + 1) } : line);
      return [...current, { product, quantity: 1 }];
    });
  }

  async function registerSale(culqiToken?: string) {
    if (!session) { setSaleError('Abre tu caja antes de registrar ventas.'); return; }
    if (!cart.length) { setSaleError('Agrega al menos un producto.'); return; }
    setSaleBusy(true); setSaleError(''); setSaleMessage('');
    try {
      const { data } = await api.post<Sale>('/sales', {
        cashSessionId: session.id,
        paymentMethod,
        culqiToken,
        documentType,
        customerDocumentNumber: customerDocumentNumber || undefined,
        customerName: customerName || undefined,
        customerAddress: customerAddress || undefined,
        customerEmail: customerEmail || undefined,
        items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      });
      setCart([]);
      setLastSale(data);
      setSaleMessage(data.status === 'pendiente_pago' ? `${data.ticketNumber}: pago pendiente de conciliación. ${data.culqiChargeId ? `ID Culqi: ${data.culqiChargeId}. ` : ''}Revisa Culqi antes de volver a cobrar.` : `Venta ${data.ticketNumber} registrada por ${formatMoney(data.total)}. ${data.nubefactStatus === 'accepted' ? 'Comprobante aceptado por Nubefact.' : 'La venta está registrada; la emisión electrónica debe configurarse por separado.'}`);
      await Promise.resolve(onRefresh());
    } catch (err) { setSaleError(getApiErrorMessage(err, 'No se pudo registrar la venta. Verifica el stock disponible.')); }
    finally { setSaleBusy(false); }
  }

  async function emitLastDocument() {
    if (!lastSale) return;
    setEmittingDocument(true); setSaleError(''); setSaleMessage('');
    try {
      const { data } = await api.post<Sale>(`/sales/${lastSale.id}/emit-document`);
      setLastSale(data);
      setSaleMessage(data.nubefactStatus === 'accepted' ? 'Comprobante aceptado por Nubefact.' : `Estado del proveedor: ${data.nubefactStatus ?? 'sin estado'}.`);
    } catch (err) { setSaleError(getApiErrorMessage(err, 'No se pudo emitir el comprobante.')); }
    finally { setEmittingDocument(false); }
  }

  async function openCash(event: FormEvent) {
    event.preventDefault(); setCashBusy(true); setCashError(''); setCashMessage('');
    try {
      const { data } = await api.post<CashSession>('/cash-register/open', { openingAmount: Number(cashAmount) });
      setSession(data); setCashMessage('Turno de caja abierto.'); setCashAmount('');
    } catch (err) { setCashError(getApiErrorMessage(err, 'No se pudo abrir la caja.')); }
    finally { setCashBusy(false); }
  }

  async function closeCash(event: FormEvent) {
    event.preventDefault(); if (!session) return;
    setCashBusy(true); setCashError(''); setCashMessage('');
    try {
      await api.patch(`/cash-register/${session.id}/close`, { closingAmount: Number(cashAmount), notes: 'Cierre registrado desde el panel de caja' });
      setSession(null); setCashMessage('Turno cerrado correctamente.'); setCashAmount('');
    } catch (err) { setCashError(getApiErrorMessage(err, 'No se pudo cerrar la caja.')); }
    finally { setCashBusy(false); }
  }

  async function adjustStock(product: Product, delta: number) {
    if (product.stock + delta < 0) return;
    try { await api.patch(`/products/${product.id}`, { stock: product.stock + delta }); await Promise.resolve(onRefresh()); }
    catch (err) { setOrderError(getApiErrorMessage(err, 'No se pudo actualizar el stock.')); }
  }

  async function createOrder(event: FormEvent) {
    event.preventDefault(); setOrderBusy(true); setOrderError(''); setOrderMessage('');
    try {
      const { data } = await api.post<PurchaseOrder>('/purchase-orders', { supplierId, items: orderLines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity), unitCost: Number(line.unitCost) })) });
      setOrders((current) => [data, ...current]); setSupplierId(''); setOrderLines([{ productId: '', quantity: '1', unitCost: '' }]);
      setOrderMessage(`Orden ${data.orderNumber} creada. El stock se actualizará cuando recibas la mercadería.`);
    } catch (err) { setOrderError(getApiErrorMessage(err, 'No se pudo crear la orden.')); }
    finally { setOrderBusy(false); }
  }

  async function receiveOrder(order: PurchaseOrder) {
    setOrderBusy(true); setOrderError(''); setOrderMessage('');
    try {
      const { data } = await api.patch<PurchaseOrder>(`/purchase-orders/${order.id}/receive`);
      setOrders((current) => current.map((item) => item.id === data.id ? { ...item, ...data } : item));
      setOrderMessage(`Orden ${order.orderNumber} recibida y stock actualizado.`); await Promise.resolve(onRefresh());
    } catch (err) { setOrderError(getApiErrorMessage(err, 'No se pudo recibir la orden.')); }
    finally { setOrderBusy(false); }
  }

  async function acknowledgeAlert(id: string) {
    try {
      await api.patch(`/alerts/${id}/acknowledge`);
      setStockAlerts((current) => current.filter((alert) => alert.id !== id));
    } catch (err) {
      setOrderError(getApiErrorMessage(err, 'No se pudo marcar la alerta como atendida.'));
    }
  }

  const nav: Array<{ id: Section; label: string }> = isCashier
    ? [{ id: 'pos', label: 'Punto de venta' }, { id: 'cash', label: 'Caja' }]
    : [{ id: 'inventory', label: 'Inventario' }, ...(allowStandard ? [{ id: 'orders' as const, label: 'Órdenes de compra' }] : [])];

  return <div className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b border-slate-200 border-t-[3px] border-t-[var(--brand-red)] bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4"><div className="flex items-center gap-3"><BrandMark compact /><div><h1 className="text-xl font-bold">SisMarket</h1><p className="text-sm text-slate-500">{fullName} · {ROLE_LABELS[role ?? ''] ?? role}</p></div><span className="ml-2 hidden rounded-full bg-[#f8f1e7] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#72552b] sm:inline-flex">Perú</span></div><div className="flex items-center gap-3"><button type="button" onClick={() => void onRefresh()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">Actualizar</button><button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"><LogOut className="h-4 w-4" />Salir</button></div></div></header>
    <main className="mx-auto max-w-7xl space-y-5 px-5 py-6">
      {loadWarning && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{loadWarning}</div>}
      {!isCashier && stockAlerts.length > 0 && <section className="rounded-lg border border-orange-200 bg-orange-50 p-4"><h2 className="font-semibold text-orange-950">Alertas de stock pendientes</h2><div className="mt-2 space-y-2">{stockAlerts.map((alert) => <div key={alert.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{alert.product.name}: quedan {alert.product.stock}, mínimo {alert.minimumStock}</span><button type="button" onClick={() => void acknowledgeAlert(alert.id)} className="rounded border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold">Marcar atendida</button></div>)}</div></section>}
      <nav className="flex gap-2 overflow-x-auto">{nav.map((item) => <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${section === item.id ? 'bg-neutral-950 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{item.label}</button>)}</nav>
      {isCashier && section === 'pos' && <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5"><div className="relative mb-4"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto, SKU o código" className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm" /></div>{loading ? <p className="text-sm text-slate-500">Cargando inventario…</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleProducts.filter((product) => product.stock > 0).map((product) => <button key={product.id} type="button" onClick={() => addProduct(product)} className="rounded-lg border border-slate-200 p-4 text-left hover:border-slate-500"><p className="font-semibold">{product.name}</p><p className="mt-1 text-xs text-slate-500">{product.sku} · {product.stock} disponibles</p><p className="mt-3 font-bold">{formatMoney(product.price)}</p></button>)}</div>}</section>
        <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Venta actual</h2><p className="mb-4 mt-1 text-sm text-slate-500">{session ? 'Caja abierta' : 'Abre caja para poder cobrar'}</p>{cart.map((line) => <div key={line.product.id} className="flex items-center justify-between gap-2 border-t border-slate-100 py-3 text-sm"><div><p className="font-semibold">{line.product.name}</p><p className="text-slate-500">{formatMoney(line.product.price)} × {line.quantity}</p></div><div className="flex gap-1"><button type="button" onClick={() => setCart((current) => current.map((item) => item.product.id === line.product.id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item).filter((item) => item.quantity > 0))} className="h-8 w-8 rounded border">−</button><button type="button" onClick={() => addProduct(line.product)} className="h-8 w-8 rounded border">+</button></div></div>)}{cart.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Agrega productos para iniciar una venta.</p>}
          <label className="mt-3 block text-sm font-medium">Forma de pago<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3"><option value="efectivo">Efectivo</option>{allowPremium && <option value="tarjeta">Tarjeta (Culqi)</option>}<option value="yape">Yape (confirmado manualmente)</option><option value="plin">Plin (confirmado manualmente)</option></select></label>
          <label className="mt-3 block text-sm font-medium">Comprobante<select value={documentType} onChange={(event) => setDocumentType(event.target.value as 'boleta' | 'factura')} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3"><option value="boleta">Boleta</option>{allowPremium && <option value="factura">Factura</option>}</select></label>
          {documentType === 'factura' && <div className="mt-3 grid gap-2 sm:grid-cols-2"><input required inputMode="numeric" pattern="[0-9]{11}" maxLength={11} value={customerDocumentNumber} onChange={(event) => setCustomerDocumentNumber(event.target.value)} placeholder="RUC del cliente" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /><input required maxLength={160} value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Razón social" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /><input maxLength={240} value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} placeholder="Dirección fiscal" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /><input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Correo" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /></div>}
          <p className="mt-2 text-xs text-slate-500">Yape/Plin se confirman manualmente. Los datos de tarjeta se capturan directamente en Culqi.</p><p className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-lg"><span>Total</span><strong>{formatMoney(cartTotal)}</strong></p>
          {!session && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Abre un turno desde la sección Caja antes de registrar la venta.</p>}{(saleError || saleMessage) && <p role={saleError ? 'alert' : 'status'} className={`mt-3 text-sm ${saleError ? 'text-red-700' : 'text-green-700'}`}>{saleError || saleMessage}</p>}
          {paymentMethod === 'tarjeta' ? <>{documentType !== 'factura' && <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Correo del cliente (obligatorio para Culqi)" className="mt-3 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />}<CulqiCheckoutButton publicKey={culqiConfig.enabled ? culqiConfig.publicKey : null} amount={cartTotal} email={customerEmail} disabled={saleBusy || !session || !cart.length} busy={saleBusy} onToken={(token) => void registerSale(token)} onError={setSaleError} /></> : <button type="button" onClick={() => void registerSale()} disabled={saleBusy || !session || !cart.length} className="mt-4 h-11 w-full rounded-lg bg-neutral-950 text-sm font-semibold text-white disabled:opacity-50">{saleBusy ? 'Registrando…' : 'Registrar venta'}</button>}
          {lastSale && <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm"><p className="font-semibold">{lastSale.ticketNumber} · {lastSale.documentType}</p><p className="mt-1">{lastSale.nubefactStatus === 'accepted' ? 'Comprobante aceptado' : 'Constancia interna; no emitida electrónicamente'}</p>{allowPremium && lastSale.nubefactStatus !== 'accepted' && <button type="button" onClick={() => void emitLastDocument()} disabled={emittingDocument} className="mt-3 h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold disabled:opacity-50">{emittingDocument ? 'Enviando…' : 'Emitir por Nubefact'}</button>}{lastSale.nubefactPdfUrl && <a href={lastSale.nubefactPdfUrl} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-semibold underline">Ver PDF</a>}</div>}
        </section>
      </div>}
      {isCashier && section === 'cash' && <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Turno de caja</h2>{session ? <><p className="mt-2 text-sm text-green-700">Turno abierto desde {formatDateTime(session.openedAt)} con saldo inicial de {formatMoney(session.openingAmount)}.</p><form onSubmit={closeCash} className="mt-5 flex flex-wrap gap-3"><input required type="number" min="0" step="0.01" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} placeholder="Monto contado al cierre" className="h-11 min-w-56 flex-1 rounded-lg border border-slate-200 px-3" /><button disabled={cashBusy} className="rounded-lg bg-neutral-950 px-5 font-semibold text-white disabled:opacity-50">Cerrar caja</button></form></> : <form onSubmit={openCash} className="mt-5 flex flex-wrap gap-3"><p className="w-full text-sm text-slate-500">Registra el fondo inicial antes de empezar a vender.</p><input required type="number" min="0" step="0.01" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} placeholder="Saldo inicial en S/" className="h-11 min-w-56 flex-1 rounded-lg border border-slate-200 px-3" /><button disabled={cashBusy} className="rounded-lg bg-neutral-950 px-5 font-semibold text-white disabled:opacity-50">Abrir caja</button></form>}{(cashError || cashMessage) && <p role={cashError ? 'alert' : 'status'} className={`mt-4 text-sm ${cashError ? 'text-red-700' : 'text-green-700'}`}>{cashError || cashMessage}</p>}</section>}
      {!isCashier && section === 'inventory' && <section className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-100 p-5"><div className="flex items-center gap-2"><Boxes className="h-5 w-5" /><h2 className="text-lg font-bold">Inventario y ajustes</h2></div><p className="mt-1 text-sm text-slate-500">Cada ajuste queda guardado en el historial de movimientos.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3">Producto</th><th className="px-5 py-3">SKU</th><th className="px-5 py-3">Stock actual</th><th className="px-5 py-3">Stock mínimo</th><th className="px-5 py-3">Ajuste</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t border-slate-100"><td className="px-5 py-3 font-semibold">{product.name}</td><td className="px-5 py-3">{product.sku}</td><td className="px-5 py-3">{product.stock}</td><td className="px-5 py-3">{product.minStock ?? 5}</td><td className="px-5 py-3"><div className="flex gap-2"><button type="button" onClick={() => void adjustStock(product, -1)} disabled={product.stock <= 0} className="h-8 w-8 rounded border disabled:opacity-40">−</button><button type="button" onClick={() => void adjustStock(product, 1)} className="h-8 w-8 rounded border">+</button></div></td></tr>)}</tbody></table></div></section>}
      {!isCashier && section === 'orders' && <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"><section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Crear orden de compra</h2>{orderError && <p role="alert" className="mt-3 text-sm text-red-700">{orderError}</p>}{orderMessage && <p role="status" className="mt-3 text-sm text-green-700">{orderMessage}</p>}<form onSubmit={createOrder} className="mt-4 space-y-3"><select required value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3"><option value="">Selecciona proveedor</option>{suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>{orderLines.map((line, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_100px_130px]"><select required value={line.productId} onChange={(event) => setOrderLines((current) => current.map((item, i) => i === index ? { ...item, productId: event.target.value } : item))} className="h-10 rounded-lg border border-slate-200 bg-white px-2"><option value="">Producto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><input required type="number" min="1" value={line.quantity} onChange={(event) => setOrderLines((current) => current.map((item, i) => i === index ? { ...item, quantity: event.target.value } : item))} className="h-10 rounded-lg border border-slate-200 px-2" aria-label="Cantidad" /><input required type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => setOrderLines((current) => current.map((item, i) => i === index ? { ...item, unitCost: event.target.value } : item))} className="h-10 rounded-lg border border-slate-200 px-2" placeholder="Costo unitario" aria-label="Costo unitario" /></div>)}<button type="button" onClick={() => setOrderLines((current) => [...current, { productId: '', quantity: '1', unitCost: '' }])} className="inline-flex items-center gap-1 text-sm font-semibold"><Plus className="h-4 w-4" />Agregar línea</button><button disabled={orderBusy} className="block h-10 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-50">Crear orden pendiente</button></form></section><section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Órdenes</h2><div className="mt-4 space-y-3">{orders.map((order) => <article key={order.id} className="rounded-lg border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><p className="font-semibold">{order.orderNumber}</p><p className="text-sm text-slate-500">{order.supplier?.name} · {formatDateTime(order.createdAt)}</p></div><p className="font-bold">{formatMoney(order.total)}</p></div><p className="mt-2 text-xs text-slate-600">{order.items?.map((line) => `${line.product?.name ?? 'Producto'} × ${line.quantity}`).join(', ')}</p>{order.status === 'pending' && <button type="button" disabled={orderBusy} onClick={() => void receiveOrder(order)} className="mt-3 rounded-lg border border-green-200 px-3 py-2 text-xs font-semibold text-green-700 disabled:opacity-50">Confirmar recepción y actualizar stock</button>}<p className="mt-2 text-xs font-semibold text-slate-500">Estado: {order.status === 'received' ? 'Recibida' : order.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}</p></article>)}{orders.length === 0 && <p className="text-sm text-slate-500">No hay órdenes registradas.</p>}</div></section></div>}
    </main>
  </div>;
}

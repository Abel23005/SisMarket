import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import OwnerDashboard from './owner/OwnerDashboard';
import { getLowStockFromProducts } from './owner/ownerUtils';
import type { CashSession, Product, Sale, StockAlert, Supplier, SystemUser } from './owner/types';
import StaffDashboard from './StaffDashboard';

type PlanEntitlements = { enforced: boolean; planCode: string | null; basic: boolean; standard: boolean; premium: boolean };

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState('');
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);

  const loadEntitlements = useCallback(async () => {
    try { const { data } = await api.get<PlanEntitlements>('/subscriptions/entitlements'); setEntitlements(data); }
    catch { setEntitlements({ enforced: true, planCode: null, basic: false, standard: false, premium: false }); }
  }, []);

  useEffect(() => {
    void loadEntitlements();
  }, [loadEntitlements]);

  const loadOperationalData = useCallback(() => {
    setLoading(true);
    const isOwner = user?.role === 'dueno';
    const canManageStock = user?.role === 'dueno' || user?.role === 'almacenero';
    Promise.allSettled([
      api.get<Product[]>('/products'),
      isOwner ? api.get<Product[]>('/products/low-stock') : Promise.resolve({ data: [] as Product[] }),
      isOwner ? api.get<Sale[]>('/sales') : Promise.resolve({ data: [] as Sale[] }),
      isOwner ? api.get<CashSession[]>('/cash-register') : Promise.resolve({ data: [] as CashSession[] }),
      isOwner ? api.get<SystemUser[]>('/users') : Promise.resolve({ data: [] as SystemUser[] }),
      isOwner && entitlements?.standard ? api.get<Supplier[]>('/suppliers') : Promise.resolve({ data: [] as Supplier[] }),
      canManageStock ? api.get<StockAlert[]>('/alerts') : Promise.resolve({ data: [] as StockAlert[] }),
    ])
      .then(([productsRes, lowStockRes, salesRes, cashRes, usersRes, suppliersRes, alertsRes]) => {
        const loadedProducts =
          productsRes.status === 'fulfilled' ? productsRes.value.data : [];

        setProducts(loadedProducts);
        setLowStockProducts(
          lowStockRes.status === 'fulfilled'
            ? lowStockRes.value.data
            : getLowStockFromProducts(loadedProducts),
        );
        setSales(salesRes.status === 'fulfilled' ? salesRes.value.data : []);
        setCashSessions(
          cashRes.status === 'fulfilled' ? cashRes.value.data : [],
        );
        setSystemUsers(
          usersRes.status === 'fulfilled' ? usersRes.value.data : [],
        );
        setSuppliers(
          suppliersRes.status === 'fulfilled' ? suppliersRes.value.data : [],
        );
        setStockAlerts(alertsRes.status === 'fulfilled' ? alertsRes.value.data : []);
        const failedAreas = [
          productsRes.status === 'rejected' && 'inventario',
          user?.role === 'dueno' && salesRes.status === 'rejected' && 'ventas',
          user?.role === 'dueno' && cashRes.status === 'rejected' && 'caja',
          user?.role === 'dueno' && usersRes.status === 'rejected' && 'usuarios',
          user?.role === 'dueno' && entitlements?.standard && suppliersRes.status === 'rejected' && 'proveedores',
          canManageStock && alertsRes.status === 'rejected' && 'alertas',
        ].filter(Boolean);
        setLoadWarning(failedAreas.length ? `No se pudieron cargar ${failedAreas.join(', ')}. Comprueba que el backend y la base de datos estén disponibles e intenta actualizar.` : '');
      })
      .finally(() => setLoading(false));
  }, [user?.role, entitlements?.standard]);

  useEffect(() => {
    loadOperationalData();
  }, [loadOperationalData]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (user?.role === 'dueno') {
    return (
      <OwnerDashboard
        fullName={user.fullName}
        currentUserId={user.id}
        entitlements={entitlements ?? { enforced: false, planCode: null, basic: true, standard: false, premium: false }}
        onEntitlementsChanged={loadEntitlements}
        products={products}
        lowStockProducts={lowStockProducts}
        sales={sales}
        cashSessions={cashSessions}
        systemUsers={systemUsers}
        suppliers={suppliers}
        stockAlerts={stockAlerts}
        loading={loading}
        loadWarning={loadWarning}
        onProductsChanged={loadOperationalData}
        onDataChanged={loadOperationalData}
        onAlertsChanged={loadOperationalData}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <StaffDashboard
      fullName={user?.fullName}
      role={user?.role}
      allowPremium={entitlements?.premium ?? false}
      allowStandard={entitlements?.standard ?? false}
      products={products}
      loading={loading}
      loadWarning={loadWarning}
      onRefresh={loadOperationalData}
      onLogout={handleLogout}
    />
  );
}

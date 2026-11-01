import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import OwnerDashboard from './owner/OwnerDashboard';
import { getLowStockFromProducts } from './owner/ownerUtils';
import type { CashSession, Product, Sale, Supplier, SystemUser } from './owner/types';
import StaffDashboard from './StaffDashboard';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState('');

  const loadOperationalData = useCallback(() => {
    setLoading(true);
    const isOwner = user?.role === 'dueno';
    Promise.allSettled([
      api.get<Product[]>('/products'),
      isOwner ? api.get<Product[]>('/products/low-stock') : Promise.resolve({ data: [] as Product[] }),
      isOwner ? api.get<Sale[]>('/sales') : Promise.resolve({ data: [] as Sale[] }),
      isOwner ? api.get<CashSession[]>('/cash-register') : Promise.resolve({ data: [] as CashSession[] }),
      isOwner ? api.get<SystemUser[]>('/users') : Promise.resolve({ data: [] as SystemUser[] }),
      isOwner ? api.get<Supplier[]>('/suppliers') : Promise.resolve({ data: [] as Supplier[] }),
    ])
      .then(([productsRes, lowStockRes, salesRes, cashRes, usersRes, suppliersRes]) => {
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
        const failedAreas = [
          productsRes.status === 'rejected' && 'inventario',
          user?.role === 'dueno' && salesRes.status === 'rejected' && 'ventas',
          user?.role === 'dueno' && cashRes.status === 'rejected' && 'caja',
          user?.role === 'dueno' && usersRes.status === 'rejected' && 'usuarios',
          user?.role === 'dueno' && suppliersRes.status === 'rejected' && 'proveedores',
        ].filter(Boolean);
        setLoadWarning(failedAreas.length ? `No se pudieron cargar ${failedAreas.join(', ')}. Comprueba que el backend y la base de datos estén disponibles e intenta actualizar.` : '');
      })
      .finally(() => setLoading(false));
  }, [user?.role]);

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
        products={products}
        lowStockProducts={lowStockProducts}
        sales={sales}
        cashSessions={cashSessions}
        systemUsers={systemUsers}
        suppliers={suppliers}
        loading={loading}
        loadWarning={loadWarning}
        onProductsChanged={loadOperationalData}
        onDataChanged={loadOperationalData}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <StaffDashboard
      fullName={user?.fullName}
      role={user?.role}
      products={products}
      loading={loading}
      loadWarning={loadWarning}
      onRefresh={loadOperationalData}
      onLogout={handleLogout}
    />
  );
}

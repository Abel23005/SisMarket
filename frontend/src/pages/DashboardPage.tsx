import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import OwnerDashboard from './owner/OwnerDashboard';
import { getLowStockFromProducts } from './owner/ownerUtils';
import type { CashSession, Product, Sale, SystemUser } from './owner/types';
import StaffDashboard from './StaffDashboard';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOperationalData = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      api.get<Product[]>('/products'),
      api.get<Product[]>('/products/low-stock'),
      api.get<Sale[]>('/sales'),
      api.get<CashSession[]>('/cash-register'),
      api.get<SystemUser[]>('/users'),
    ])
      .then(([productsRes, lowStockRes, salesRes, cashRes, usersRes]) => {
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
      })
      .finally(() => setLoading(false));
  }, []);

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
        loading={loading}
        onProductsChanged={loadOperationalData}
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
      onLogout={handleLogout}
    />
  );
}

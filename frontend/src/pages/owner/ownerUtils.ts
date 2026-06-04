import type { Product, Sale } from './types';

export function getLowStockFromProducts(products: Product[]) {
  return products
    .filter((product) => product.stock <= (product.minStock ?? 5))
    .sort((a, b) => a.stock - b.stock);
}

export function isTodaySale(sale: Sale) {
  const createdAt = new Date(sale.createdAt);
  const now = new Date();
  return (
    createdAt.getFullYear() === now.getFullYear() &&
    createdAt.getMonth() === now.getMonth() &&
    createdAt.getDate() === now.getDate()
  );
}

export function buildWeeklySales(sales: Sale[]) {
  const labels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  const now = new Date();
  const dayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - dayIndex);

  return labels.map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const value = sales
      .filter((sale) => {
        const createdAt = new Date(sale.createdAt);
        return (
          createdAt.getFullYear() === date.getFullYear() &&
          createdAt.getMonth() === date.getMonth() &&
          createdAt.getDate() === date.getDate()
        );
      })
      .reduce((sum, sale) => sum + Number(sale.total), 0);

    return { day, value };
  });
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatMoney(value: number | string) {
  return `S/ ${Number(value).toFixed(2)}`;
}

export function countSaleItems(sale: Sale) {
  return (sale.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toNumber(value: string) {
  return Number(value.replace(',', '.'));
}

export function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getStockStatus(product: Product) {
  const minStock = product.minStock ?? 5;
  if (product.stock === 0) {
    return { label: 'Agotado', className: 'bg-red-100 text-red-700' };
  }
  if (product.stock <= minStock) {
    return { label: 'Bajo', className: 'bg-orange-100 text-orange-700' };
  }
  if (product.stock <= minStock * 2) {
    return { label: 'Medio', className: 'bg-yellow-100 text-yellow-700' };
  }
  return { label: 'Normal', className: 'bg-green-100 text-green-700' };
}

export function getFilterTone(option: string) {
  if (option === 'Normal') return 'bg-green-100 text-green-700';
  if (option === 'Medio') return 'bg-yellow-100 text-yellow-700';
  if (option === 'Bajo') return 'bg-orange-100 text-orange-700';
  if (option === 'Agotado') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700 hover:bg-slate-200';
}

export function getCategoryDistribution(products: Product[]) {
  const counts = products.reduce<Record<string, number>>((acc, product) => {
    const category = product.category ?? 'Sin categoria';
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});
  const total = Math.max(products.length, 1);

  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      percent: Math.round((count / total) * 100),
    }))
    .slice(0, 5);
}

export function getTopProducts(products: Product[], sales: Sale[]) {
  const soldByProduct = new Map<
    string,
    { name: string; units: number; income: number }
  >();

  sales.forEach((sale) => {
    (sale.items ?? []).forEach((item) => {
      const name = item.product?.name ?? item.productId ?? 'Producto';
      const current = soldByProduct.get(name) ?? { name, units: 0, income: 0 };
      current.units += item.quantity;
      current.income += Number(item.subtotal);
      soldByProduct.set(name, current);
    });
  });

  const rows =
    soldByProduct.size > 0
      ? Array.from(soldByProduct.values())
      : products.map((product, index) => ({
          name: product.name,
          units: Math.max(20, product.stock - index * 8),
          income:
            Number(product.price) * Math.max(20, product.stock - index * 8),
        }));

  const maxUnits = Math.max(...rows.map((row) => row.units), 1);
  return rows
    .sort((a, b) => b.units - a.units)
    .slice(0, 5)
    .map((row) => ({
      ...row,
      percent: Math.round((row.units / maxUnits) * 100),
    }));
}

export function exportProducts(products: Product[]) {
  const escapeHtml = (value: string | number) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const rows = products
    .map((product) => {
      const minStock = product.minStock ?? 5;
      const status =
        product.stock === 0
          ? 'Agotado'
          : product.stock <= minStock
            ? 'Bajo'
            : product.stock <= minStock * 2
              ? 'Medio'
              : 'Normal';

      return `
        <tr>
          <td>${escapeHtml(product.name)}</td>
          <td>${escapeHtml(product.sku)}</td>
          <td>${escapeHtml(product.category ?? 'Sin categoria')}</td>
          <td>${product.stock}</td>
          <td>${minStock}</td>
          <td>S/ ${Number(product.price).toFixed(2)}</td>
          <td>${status}</td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          p { color: #666; margin-top: 0; }
          table { border-collapse: collapse; width: 100%; }
          th {
            background: #111827;
            color: white;
            padding: 10px;
            border: 1px solid #d1d5db;
            text-align: left;
          }
          td {
            padding: 9px;
            border: 1px solid #d1d5db;
          }
          tr:nth-child(even) { background: #f9fafb; }
        </style>
      </head>
      <body>
        <h1>Inventario SisMarket</h1>
        <p>Exportado: ${new Date().toLocaleString('es-PE')}</p>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th>Categoria</th>
              <th>Stock</th>
              <th>Stock minimo</th>
              <th>Precio venta</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'inventario-sismarket.xls';
  link.click();
  URL.revokeObjectURL(url);
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  price: string;
  stock: number;
  minStock?: number;
  category: string | null;
  imageUrl?: string | null;
}

export interface SaleItem {
  id: string;
  productId?: string;
  quantity: number;
  unitPrice?: string | number;
  subtotal: string | number;
  product?: Product;
}

export interface Sale {
  id: string;
  ticketNumber: string;
  total: string | number;
  paymentMethod?: string;
  status: string;
  items?: SaleItem[];
  createdAt: string;
}

export interface CashSession {
  id: string;
  status: string;
  openingAmount: string | number;
  closingAmount: string | number | null;
  expectedAmount: string | number | null;
  openedAt: string;
  closedAt: string | null;
}

export interface SystemUser {
  id: string;
  username?: string;
  email: string;
  fullName: string;
  role: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

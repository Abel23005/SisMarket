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
  supplierId?: string | null;
  supplier?: Supplier | null;
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
  cashierId?: string;
  cashSessionId?: string | null;
  subtotal?: string | number;
  tax?: string | number;
  total: string | number;
  paymentMethod?: string;
  status: string;
  items?: SaleItem[];
  cashier?: SystemUser;
  createdAt: string;
  nubefactStatus?: string | null;
  nubefactPdfUrl?: string | null;
  nubefactXmlUrl?: string | null;
  nubefactCdrUrl?: string | null;
}

export interface CashSession {
  id: string;
  cashierId?: string;
  cashier?: SystemUser;
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

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email?: string | null;
  phone?: string | null;
  lastOrder?: string | null;
  monthlyTotal: string | number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

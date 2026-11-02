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
  documentType?: 'boleta' | 'factura';
  customerDocumentNumber?: string | null;
  customerName?: string;
  customerAddress?: string | null;
  customerEmail?: string | null;
  culqiChargeId?: string | null;
  cardLastFour?: string | null;
  paymentNotice?: string;
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

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: string | number;
  subtotal: string | number;
  product?: Product;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier?: Supplier;
  status: 'pending' | 'received' | 'cancelled';
  total: string | number;
  notes?: string | null;
  createdAt: string;
  receivedAt?: string | null;
  items: PurchaseOrderItem[];
}

export interface InventoryMovement {
  id: string;
  type: 'opening' | 'sale' | 'purchase' | 'adjustment' | 'return';
  quantityChange: number;
  stockAfter: number;
  reason?: string | null;
  createdAt: string;
  user?: SystemUser | null;
}

export interface StockAlert {
  id: string;
  status: 'open' | 'resolved';
  minimumStock: number;
  stockAtTrigger: number;
  createdAt: string;
  product: Product;
}

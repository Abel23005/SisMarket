export type OwnerSection =
  | 'dashboard'
  | 'inventory'
  | 'pos'
  | 'sales'
  | 'cash'
  | 'providers'
  | 'reports'
  | 'assistant'
  | 'settings';

export function getOwnerSectionTitle(section: OwnerSection) {
  const titles = {
    dashboard: 'Dashboard',
    inventory: 'Inventario',
    pos: 'Punto de Venta',
    sales: 'Ventas',
    cash: 'Caja',
    providers: 'Proveedores',
    reports: 'Reportes',
    assistant: 'Asistente Inteligente',
    settings: 'Configuracion',
  };
  return titles[section];
}

export function getOwnerSectionSubtitle(section: OwnerSection) {
  const subtitles = {
    dashboard: 'Resumen operativo del dia',
    inventory: 'Productos registrados',
    pos: 'Sistema de ventas y cobro',
    sales: 'Registro de transacciones',
    cash: 'Control de turnos y movimientos',
    providers: 'Proveedores registrados',
    reports: 'Analisis de rendimiento del negocio',
    assistant: 'Consulta informacion de tu negocio de forma conversacional',
    settings: 'Gestiona tu suscripcion y datos de la empresa',
  };
  return subtitles[section];
}

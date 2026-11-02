import { Store } from 'lucide-react';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-red)] text-white shadow-sm ${compact ? 'h-10 w-10' : 'h-12 w-12'}`} aria-hidden="true">
      <Store className={compact ? 'h-5 w-5' : 'h-6 w-6'} strokeWidth={1.8} />
      <span className="absolute -bottom-1 -right-1 flex h-3 w-5 overflow-hidden rounded-[2px] border border-white/90 shadow-sm">
        <span className="w-1/3 bg-[#c62835]" />
        <span className="w-1/3 bg-white" />
        <span className="w-1/3 bg-[#c62835]" />
      </span>
    </span>
  );
}

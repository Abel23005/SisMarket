import { useEffect, useState } from 'react';

type CulqiToken = { id: string };
type CulqiInstance = { open: () => void; close: () => void; culqi?: () => void; token?: CulqiToken; error?: { user_message?: string; merchant_message?: string } };
declare global { interface Window { CulqiCheckout?: new (key: string, config: Record<string, unknown>) => CulqiInstance; } }

export function CulqiCheckoutButton({ publicKey, amount, email, disabled, busy, onToken, onError }: {
  publicKey: string | null;
  amount: number;
  email: string;
  disabled?: boolean;
  busy?: boolean;
  onToken: (token: string) => void;
  onError: (message: string) => void;
}) {
  const [checkout, setCheckout] = useState<CulqiInstance | null>(null);
  useEffect(() => {
    if (!publicKey) { setCheckout(null); return; }
    let active = true;
    const initialize = () => {
      if (!active || !window.CulqiCheckout) return;
      const instance = new window.CulqiCheckout(publicKey, {
        settings: { title: 'SisMarket', currency: 'PEN', amount: Math.round(amount * 100) },
        client: { email },
        options: { lang: 'es', installments: false, modal: true, paymentMethods: { tarjeta: true, yape: false, billetera: false, bancaMovil: false, agente: false, cuotealo: false } },
        appearance: { theme: 'default' },
      });
      instance.culqi = () => {
        const result = instance;
        if (result?.token?.id) { const token = result.token.id; instance.close(); onToken(token); }
        else { const message = result?.error?.user_message ?? result?.error?.merchant_message; if (message) onError(message); }
      };
      setCheckout(instance);
    };
    if (window.CulqiCheckout) initialize();
    else {
      let script = document.querySelector<HTMLScriptElement>('script[data-culqi-checkout]');
      if (!script) { script = document.createElement('script'); script.src = 'https://js.culqi.com/checkout-js'; script.async = true; script.dataset.culqiCheckout = 'true'; document.body.appendChild(script); }
      script.addEventListener('load', initialize);
    }
    return () => { active = false; };
  }, [publicKey, amount, email, onToken, onError]);
  return <button type="button" disabled={disabled || busy || !checkout || !publicKey || !email} onClick={() => checkout?.open()} className="mt-4 h-11 w-full rounded-lg bg-neutral-950 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Procesando pago…' : !email ? 'Ingresa el correo para pagar con tarjeta' : !publicKey ? 'Configura Culqi para cobrar con tarjeta' : 'Pagar con tarjeta'}</button>;
}

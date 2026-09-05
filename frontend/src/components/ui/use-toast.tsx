import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

let toastCount = 0;
type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let subscribers: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

const notify = (message: string, type: ToastType = 'info') => {
  const id = ++toastCount;
  toasts = [...toasts, { id, message, type }];
  subscribers.forEach(sub => sub(toasts));
  setTimeout(() => removeToast(id), 4000);
};

const removeToast = (id: number) => {
  toasts = toasts.filter(t => t.id !== id);
  subscribers.forEach(sub => sub(toasts));
};

export const toast = {
  success: (msg: string) => notify(msg, 'success'),
  error: (msg: string) => notify(msg, 'error'),
  info: (msg: string) => notify(msg, 'info')
};

export function Toaster() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    subscribers.push(setCurrentToasts);
    return () => { subscribers = subscribers.filter(s => s !== setCurrentToasts); };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {currentToasts.map(t => (
        <div key={t.id} className="pointer-events-auto bg-white rounded-lg shadow-xl border border-border p-4 min-w-[300px] flex items-start gap-3 animate-in slide-in-from-right-8 fade-in duration-300">
           {t.type === 'success' && <CheckCircle className="w-5 h-5 text-success mt-0.5" />}
           {t.type === 'error' && <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />}
           {t.type === 'info' && <Info className="w-5 h-5 text-info mt-0.5" />}
           <div className="flex-1 font-medium text-sm text-slate-800">{t.message}</div>
           <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}

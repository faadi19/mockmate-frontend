import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { APP_TOAST_EVENT_NAME, type AppToastPayload } from "../../utils/toast";

type ToastItem = AppToastPayload & { id: string };

function typeClasses(type: ToastItem["type"]) {
  switch (type) {
    case "success":
      return "border-success/35 bg-success/10 text-text-primary";
    case "error":
      return "border-error/35 bg-error/10 text-text-primary";
    case "info":
    default:
      return "border-primary/35 bg-primary/10 text-text-primary";
  }
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const defaults = useMemo(() => ({ durationMs: 2400 }), []);

  useEffect(() => {
    const handler = (evt: Event) => {
      const custom = evt as CustomEvent<AppToastPayload>;
      const payload = custom.detail;
      if (!payload?.message) return;

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const durationMs = payload.durationMs ?? defaults.durationMs;

      const toast: ToastItem = { ...payload, id, durationMs };
      setToasts((prev) => [...prev, toast]);

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    };

    window.addEventListener(APP_TOAST_EVENT_NAME, handler);
    return () => window.removeEventListener(APP_TOAST_EVENT_NAME, handler);
  }, [defaults.durationMs]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex max-w-[90vw] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${typeClasses(
            t.type
          )}`}
        >
          <p className="text-sm leading-snug">{t.message}</p>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="ml-auto -mr-1 -mt-1 rounded-md p-1 text-text-secondary hover:bg-primary/10 hover:text-text-primary"
            aria-label="Dismiss toast"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}



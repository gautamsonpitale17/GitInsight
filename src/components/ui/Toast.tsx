"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AlertCircle from "lucide-react/dist/esm/icons/circle-alert.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Info from "lucide-react/dist/esm/icons/info.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";
import { cn } from "@/lib/utils";

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

export type ToastType = "success" | "error" | "info";

export type ToastInput = {
  type: ToastType;
  message: string;
  durationMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  success: (message: string) => string;
  error: (message: string) => string;
  info: (message: string) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const TOAST_STYLES: Record<
  ToastType,
  { border: string; icon: string; Icon: typeof Check }
> = {
  success: {
    border: "border-gh-green",
    icon: "text-gh-green",
    Icon: Check,
  },
  error: {
    border: "border-red-500",
    icon: "text-red-600 dark:text-red-400",
    Icon: AlertCircle,
  },
  info: {
    border: "border-gh-blue",
    icon: "text-gh-blue",
    Icon: Info,
  },
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const { border, icon, Icon } = TOAST_STYLES[item.type];

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border bg-gh-surface px-4 py-3 shadow-lg",
        border,
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", icon)} aria-hidden />
      <p className="min-w-0 flex-1 text-sm leading-snug text-gh-gray-7">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="gh-btn gh-btn-subtle tap-target-mobile -mr-1 shrink-0 p-1 text-gh-gray-4"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-relevant="additions text"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = createToastId();
      const durationMs = input.durationMs ?? AUTO_DISMISS_MS;

      setToasts((current) => {
        const next = [...current, { ...input, id }];
        return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
      });

      const timer = setTimeout(() => dismiss(id), durationMs);
      timersRef.current.set(id, timer);

      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message) => toast({ type: "success", message }),
      error: (message) => toast({ type: "error", message }),
      info: (message) => toast({ type: "info", message }),
      dismiss,
    }),
    [dismiss, toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

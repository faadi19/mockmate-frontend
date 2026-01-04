type ToastType = "success" | "error" | "info";

export type AppToastPayload = {
  type: ToastType;
  message: string;
  durationMs?: number;
};

const EVENT_NAME = "app-toast";

export function showToast(payload: AppToastPayload) {
  window.dispatchEvent(new CustomEvent<AppToastPayload>(EVENT_NAME, { detail: payload }));
}

export function toastSuccess(message: string, durationMs?: number) {
  showToast({ type: "success", message, durationMs });
}

export function toastError(message: string, durationMs?: number) {
  showToast({ type: "error", message, durationMs });
}

export function toastInfo(message: string, durationMs?: number) {
  showToast({ type: "info", message, durationMs });
}

export const APP_TOAST_EVENT_NAME = EVENT_NAME;



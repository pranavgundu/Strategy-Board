export type ToastKind = "info" | "success" | "warning" | "error";

export interface ToastMessage {
  id: number;
  text: string;
  kind: ToastKind;
}

let nextId = 1;
let messages = $state<ToastMessage[]>([]);

/** Lightweight global notifications; errors remain until explicitly dismissed. */
export const toast = {
  get messages(): readonly ToastMessage[] {
    return messages;
  },

  show(text: string, kind: ToastKind = "info", durationMs?: number): number {
    const id = nextId++;
    messages = [...messages, { id, text, kind }];
    if (durationMs && durationMs > 0) {
      window.setTimeout(() => this.dismiss(id), durationMs);
    }
    return id;
  },

  dismiss(id: number): void {
    messages = messages.filter((message) => message.id !== id);
  },

  clear(): void {
    messages = [];
  },
};

export type ToastKind = "info" | "error";

export interface ToastMessage {
  id: number;
  text: string;
  kind: ToastKind;
}

let nextId = 1;
let _messages = $state<ToastMessage[]>([]);

/**
 * Global toast notification store.
 *
 * Replaces the original app's blocking `alert()` calls (e.g. on IndexedDB
 * load failure, on startup failure) with a non-blocking, dismissible
 * notification queue.
 */
export const toast = {
  get messages(): ToastMessage[] {
    return _messages;
  },

  show(text: string, kind: ToastKind = "info"): void {
    const id = nextId++;
    _messages = [..._messages, { id, text, kind }];
  },

  dismiss(id: number): void {
    _messages = _messages.filter((m) => m.id !== id);
  },
};

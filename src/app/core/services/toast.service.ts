import { Injectable, signal } from '@angular/core';


import { Toast } from '../models/toast.model';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  private _toasts = signal<Toast[]>([]);
  toasts = this._toasts.asReadonly();

  constructor() { }

  show(toast: Omit<Toast, 'id'>): string {
    const id = crypto.randomUUID();
    this._toasts.update(t => [...t, { ...toast, id }]);

    const duration = toast.duration ?? 2500;
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  dismiss(id: string) {
    this._toasts.update(t => t.filter(x => x.id !== id));
  }

  success(title: string, body?: string, meta?: string) {
    return this.show({ type: 'success', title, body, meta });
  }

  error(title: string, body?: string, actions?: Toast['actions']) {
    return this.show({ type: 'error', title, body, actions, duration: 0 });
  }

  info(title: string, body?: string) {
    return this.show({ type: 'info', title, body });
  }

  warning(title: string, body?: string) {
    return this.show({ type: 'warning', title, body });
  }

  loading(title: string, body?: string): string {
    return this.show({ type: 'loading', title, body, duration: 0 });
  }
}

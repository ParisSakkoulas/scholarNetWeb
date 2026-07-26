export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    body?: string;
    meta?: string;
    actions?: { label: string; style: 'primary' | 'ghost'; fn: () => void }[];
    duration?: number;
}
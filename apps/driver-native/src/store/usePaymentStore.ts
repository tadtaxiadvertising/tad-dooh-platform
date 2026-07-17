import { create } from 'zustand';

interface PaymentState {
  isLocked: boolean;
  message: string | null;
  setLock: (isLocked: boolean, message?: string | null) => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  isLocked: false,
  message: null,
  setLock: (isLocked, message = null) => set({ isLocked, message }),
}));

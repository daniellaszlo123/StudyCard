let message = $state<string | null>(null);
let type = $state<'success' | 'error'>('success');
let timer: number | null = null;

export const toastStore = {
  get message() {
    return message;
  },
  get type() {
    return type;
  },
  show(msg: string, toastType: 'success' | 'error' = 'success') {
    message = msg;
    type = toastType;
    
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      message = null;
    }, 3000);
  },
  dismiss() {
    message = null;
    if (timer) clearTimeout(timer);
  }
};

// ─── TAD DOOH Player — KillSwitch Enforcement ───
// Intercepts /device/sync responses to detect killSwitch directive.
// Persists state to localStorage for offline resilience.
// Displays full-screen overlay blocking all content playback.

export class KillSwitchEnforcer {
  private active: boolean = false;
  private overlay: HTMLElement | null = null;
  private reasonEl: HTMLElement | null = null;
  private originalFetch: typeof window.fetch;

  constructor() {
    this.overlay = document.getElementById('tad-killswitch-overlay');
    this.reasonEl = document.getElementById('tad-killswitch-reason');
    this.originalFetch = window.fetch.bind(window);
  }

  init(): void {
    // Check cached killSwitch on load
    const cached = localStorage.getItem('TAD_KILLSWITCH_ACTIVE');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data && Date.now() - data.timestamp < 86_400_000) {
          this.activate(data.reason || 'SUBSCRIPTION_UNPAID');
        } else {
          localStorage.removeItem('TAD_KILLSWITCH_ACTIVE');
        }
      } catch {
        localStorage.removeItem('TAD_KILLSWITCH_ACTIVE');
      }
    }

    // Intercept fetch to detect killSwitch in sync responses
    this.patchFetch();
  }

  isActive(): boolean {
    return this.active;
  }

  activate(reason: string): void {
    this.active = true;
    window.tadKillSwitchActive = true;

    localStorage.setItem('TAD_KILLSWITCH_ACTIVE', JSON.stringify({
      reason,
      timestamp: Date.now(),
    }));

    if (this.overlay) this.overlay.style.display = 'block';
    if (this.reasonEl) this.reasonEl.textContent = `Motivo: ${reason}`;

    const player = document.getElementById('tad-player') as HTMLVideoElement;
    if (player) player.pause();

    window.dispatchEvent(new CustomEvent('TAD_UI_TOAST', {
      detail: 'KILLSWITCH ACTIVO — SUSCRIPCION PENDIENTE',
    }));
  }

  deactivate(): void {
    this.active = false;
    window.tadKillSwitchActive = false;
    localStorage.removeItem('TAD_KILLSWITCH_ACTIVE');

    if (this.overlay) this.overlay.style.display = 'none';
  }

  private patchFetch(): void {
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');

      return this.originalFetch(input, init).then(response => {
        if (typeof url === 'string' && (url.includes('/device/sync') || url.includes('/sync/'))) {
          const cloned = response.clone();
          cloned.json().then(data => {
            if (data.killSwitch === true) {
              this.activate(data.killSwitchReason || 'UNKNOWN');
            } else if (this.active) {
              this.deactivate();
            }
          }).catch(() => {});
        }
        return response;
      });
    };
  }

  restoreFetch(): void {
    window.fetch = this.originalFetch;
  }
}

// Service Worker registration and management utilities

// Define BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', this.registration);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              this.showUpdateNotification();
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));

      // Check for updates
      this.checkForUpdates();

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  private handleMessage(event: MessageEvent): void {
    const { data } = event;
    
    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('Cache updated:', data.payload);
        break;
      case 'OFFLINE_READY':
        this.showOfflineReadyNotification();
        break;
      case 'SYNC_COMPLETE':
        this.showSyncCompleteNotification(data.payload);
        break;
      default:
        console.log('Unknown message from service worker:', data);
    }
  }

  private showUpdateNotification(): void {    // Show update notification to user
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const notification = new Notification('SecureShare Update Available', {
        body: 'A new version is available. Refresh to update.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: 'update-available',
        requireInteraction: true
      });

      notification.onclick = () => {
        window.location.reload();
      };
    }
  }

  private showOfflineReadyNotification(): void {
    console.log('App is ready to work offline');
    // Optionally show user notification
  }
  private showSyncCompleteNotification(data: unknown): void {
    console.log('Background sync completed:', data);
    // Show success notification
  }

  async checkForUpdates(): Promise<void> {
    if (this.registration) {
      try {
        await this.registration.update();
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    }
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission;
    }
    return 'denied';
  }
  async scheduleBackgroundSync(tag: string): Promise<void> {
    if (this.registration && 'sync' in this.registration) {
      try {        await (this.registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(tag);
        console.log('Background sync scheduled:', tag);
      } catch (error) {
        console.error('Failed to schedule background sync:', error);
      }
    }
  }

  // PWA installation prompt
  async showInstallPrompt(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Show custom install prompt
      this.showCustomInstallPrompt(e);
    });
  }

  private showCustomInstallPrompt(installPromptEvent: Event): void {
    // Custom install prompt UI
    const installBanner = document.createElement('div');
    installBanner.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #2563eb;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        max-width: 90vw;
        text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <div style="font-weight: 600; margin-bottom: 8px;">
          Install SecureShare
        </div>
        <div style="font-size: 14px; margin-bottom: 12px; opacity: 0.9;">
          Get the full app experience with offline access
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="install-btn" style="
            background: white;
            color: #2563eb;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
          ">
            Install
          </button>
          <button id="dismiss-btn" style="
            background: transparent;
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
          ">
            Not Now
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(installBanner);    // Handle install button click
    installBanner.querySelector('#install-btn')?.addEventListener('click', async () => {
      // Show the install prompt
      (installPromptEvent as BeforeInstallPromptEvent).prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await (installPromptEvent as BeforeInstallPromptEvent).userChoice;
      console.log('Install prompt outcome:', outcome);
      
      // Remove the banner
      installBanner.remove();
    });

    // Handle dismiss button click
    installBanner.querySelector('#dismiss-btn')?.addEventListener('click', () => {
      installBanner.remove();
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      installBanner.remove();
    }, 10000);
  }
  // Check if app is installed
  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as Navigator & { standalone?: boolean }).standalone ||
           document.referrer.includes('android-app://');
  }

  // Get installation status
  getInstallationStatus(): 'installed' | 'installable' | 'not-installable' {
    if (this.isInstalled()) {
      return 'installed';
    }
    
    // Check if beforeinstallprompt event is supported
    if ('onbeforeinstallprompt' in window) {
      return 'installable';
    }
    
    return 'not-installable';
  }
}

// Export singleton instance
export const swManager = ServiceWorkerManager.getInstance();

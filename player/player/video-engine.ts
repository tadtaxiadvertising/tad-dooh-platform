import QRCode from 'qrcode';
import { EventQueue } from '../storage/event-queue';
import { VideoCache } from '../storage/video-cache';

export interface VideoAsset {
  id: string;
  url: string;
  duration: number;
  qrUrl?: string;
  campaignId?: string;
  advertiserId?: string;
  advertiserName?: string;
}

export class VideoEngine {
  private player: HTMLVideoElement | null;
  private qrContainer: HTMLElement | null;
  private playlist: VideoAsset[] = [];
  private currentIndex = 0;
  private deviceId: string;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  public playerStatus: "playing" | "error" | "stopped" = "stopped";

  private intermissionScreen: HTMLElement | null;
  private intermissionQr: HTMLImageElement | null;
  private intermissionName: HTMLElement | null;
  private intermissionTimerBar: HTMLElement | null;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
    this.player = document.querySelector('#tad-player');
    this.qrContainer = document.querySelector('#qr-container');
    
    // Intermission Elements
    this.intermissionScreen = document.querySelector('#intermission-screen');
    this.intermissionQr = document.querySelector('#intermission-qr') as HTMLImageElement;
    this.intermissionName = document.querySelector('#intermission-advertiser-name');
    this.intermissionTimerBar = document.querySelector('#intermission-timer-bar');

    if (this.player) {
      this.player.onended = () => this.handleTransition();
      this.player.onerror = (e) => {
        console.error('Player Error:', e);
        this.onPlaybackError();
      };
      this.player.addEventListener("playing", () => {
        this.playerStatus = "playing";
        this.resetWatchdog();
      });
    }
  }

  public setPlaylist(assets: VideoAsset[]) {
    this.playlist = assets;
    this.currentIndex = 0;
    if (this.playlist.length > 0) {
      this.playNext();
    } else {
      console.warn('Playlist empty, stopping playback...');
      this.playerStatus = "stopped";
      if (this.player) {
         this.player.pause();
         this.player.src = '';
         this.player.load();
      }
      if (this.intermissionScreen) {
         this.intermissionScreen.style.display = 'block';
      }
    }
  }

  private async handleTransition() {
    clearTimeout(this.watchdogTimer!);
    
    // Track playback of JUST finished video
    const playedVideo = this.playlist[this.currentIndex];
    this.trackPlayback(playedVideo);

    // Ciclo al siguiente
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    const nextVideo = this.playlist[this.currentIndex];

    // Mostrar Intermission (5s) antes de playNext
    if (nextVideo && this.intermissionScreen && this.intermissionQr) {
      await this.showIntermission(nextVideo);
    }
    
    this.playNext();
  }

  private async showIntermission(video: VideoAsset): Promise<void> {
    return new Promise((resolve) => {
      if (!this.intermissionScreen || !this.intermissionQr) return resolve();

      // Configurar Marca
      if (this.intermissionName) {
        this.intermissionName.textContent = video.advertiserName || 'TAD Advertiser';
      }

      // Enlace al HUB de anunciantes (Menú segmentado)
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const dashboardBase = isLocal ? "http://localhost:3001" : "https://proyecto-ia-tad-dashboard.rewvid.easypanel.host";
      const hubLink = `${dashboardBase}/p?ref=${video.advertiserId || 'nexus'}`;

      QRCode.toDataURL(hubLink, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      }).then(url => {
        if (this.intermissionQr) this.intermissionQr.src = url;
      });

      this.intermissionScreen.style.display = 'block';
      
      if (this.intermissionTimerBar) {
        this.intermissionTimerBar.style.transition = 'none';
        this.intermissionTimerBar.style.width = '0%';
        setTimeout(() => {
          if (this.intermissionTimerBar) {
            this.intermissionTimerBar.style.transition = 'width 5s linear';
            this.intermissionTimerBar.style.width = '100%';
          }
        }, 50);
      }

      setTimeout(() => {
        if (this.intermissionScreen) this.intermissionScreen.style.display = 'none';
        resolve();
      }, 5000);
    });
  }

  private async playNext() {
    if (this.playlist.length === 0) return;
    const currentVideo = this.playlist[this.currentIndex];
    if (!currentVideo || !this.player) return;

    if (this.qrContainer) this.qrContainer.style.display = 'none';

    try {
      // TAREA SW_001 & SW_004: 
      // 1. Obtener fuente (Caché local si existe)
      const sourceURL = await VideoCache.getVideoSource(currentVideo.url);
      
      // 2. Limpieza de memoria (Revocar Blob URL anterior para evitar leaks en RAM)
      const oldSrc = this.player.src;
      if (oldSrc.startsWith('blob:')) {
        URL.revokeObjectURL(oldSrc);
      }

      this.player.src = sourceURL;
      await this.player.play();
      this.playerStatus = "playing";
      this.resetWatchdog();
    } catch (err) {
      console.error('Playback stall:', err);
      this.onPlaybackError();
    }
  }

  private async trackPlayback(video: VideoAsset) {
    const payload = {
      device_id: this.deviceId,
      video_id: video.id,
      timestamp: new Date().toISOString()
    };

    // TAREA GPS_001: Siempre encolar para permitir Batching
    EventQueue.saveToQueue(payload);
    
    // Si hay red, intentar flush inmediato (batch)
    if (navigator.onLine) {
      EventQueue.flushQueue();
    }
  }

  private onPlaybackError() {
    this.playerStatus = "error";
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    setTimeout(() => this.playNext(), 2000);
  }

  private resetWatchdog() {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer = setTimeout(() => {
      this.playerStatus = "error";
      console.warn("Watchdog tripped");
    }, 120000);
  }
}

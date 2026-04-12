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
  private playlist: VideoAsset[] = [];
  private currentIndex = 0;
  private deviceId: string;
  private player: HTMLVideoElement | null = null;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  public playerStatus: "playing" | "error" | "stopped" = "stopped";

  private intermissionScreen: HTMLElement | null;
  private intermissionQr: HTMLImageElement | null;
  private intermissionName: HTMLElement | null;
  private intermissionTimerBar: HTMLElement | null;

  private consecutiveErrors = 0;
  private readonly MAX_CONSECUTIVE_ERRORS = 3;
  private readonly GENERIC_FALLBACK_URLS = [
    'https://proyecto-ia-tad.storage.googleapis.com/generic/TAD_GENERIC_LOOP_01.mp4',
    'https://proyecto-ia-tad.storage.googleapis.com/generic/TAD_GENERIC_LOOP_02.mp4'
  ];

  constructor(deviceId: string) {
    this.deviceId = deviceId;
    this.player = document.querySelector('#tad-player') as HTMLVideoElement;
    
    // Intermission Elements
    this.intermissionScreen = document.querySelector('#intermission-screen');
    this.intermissionQr = document.querySelector('#intermission-qr') as HTMLImageElement;
    this.intermissionName = document.querySelector('#intermission-advertiser-name');
    this.intermissionTimerBar = document.querySelector('#intermission-timer-bar');

    if (this.player) {
      this.player.onended = () => this.handleTransition();
      this.player.onerror = (e: string | Event) => {
        console.error('Player Error:', e);
        this.onPlaybackError();
      };
      this.player.addEventListener("playing", () => {
        this.playerStatus = "playing";
        this.consecutiveErrors = 0; // Reset errors on successful play
        this.resetWatchdog();
      });
    }
  }

  public setPlaylist(assets: VideoAsset[]) {
    this.playlist = assets;
    this.currentIndex = 0;
    this.consecutiveErrors = 0;
    
    if (this.playlist.length > 0) {
      this.playNext();
    } else {
      console.warn('Playlist empty, playing fallback loop...');
      this.playFallback();
    }
  }

  private async handleTransition() {
    clearTimeout(this.watchdogTimer!);
    
    // Track playback of JUST finished video if it wasn't a fallback
    const playedVideo = this.playlist[this.currentIndex];
    if (playedVideo && !this.GENERIC_FALLBACK_URLS.includes(playedVideo.url)) {
      this.trackPlayback(playedVideo);
    }

    // Ciclo al siguiente
    if (this.playlist.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
      const nextVideo = this.playlist[this.currentIndex];

      // Mostrar Intermission (5s) antes de playNext
      if (nextVideo && this.intermissionScreen && this.intermissionQr) {
        await this.showIntermission(nextVideo);
      }
      this.playNext();
    } else {
      this.playFallback();
    }
  }

  private async playFallback() {
    if (!this.player) return;
    
    // Pick a random fallback or use an internal index
    const fallbackUrl = this.GENERIC_FALLBACK_URLS[Math.floor(Math.random() * this.GENERIC_FALLBACK_URLS.length)];
    
    console.log('🛡️ Playing fallback:', fallbackUrl);
    
    try {
      if (this.intermissionScreen) this.intermissionScreen.style.display = 'none';
      
      const sourceURL = await VideoCache.getVideoSource(fallbackUrl);
      this.player.src = sourceURL;
      await this.player.play();
      this.playerStatus = "playing";
    } catch (e) {
      console.error('Critical fallback failure:', e);
      // If even fallback fails, retry after 5s
      setTimeout(() => this.playFallback(), 5000);
    }
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
    if (this.playlist.length === 0) {
      this.playFallback();
      return;
    }
    const currentVideo = this.playlist[this.currentIndex];
    if (!currentVideo || !this.player) return;

    try {
      const sourceURL = await VideoCache.getVideoSource(currentVideo.url);
      
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

    EventQueue.saveToQueue(payload);
    
    if (navigator.onLine) {
      EventQueue.flushQueue();
    }
  }

  private onPlaybackError() {
    this.playerStatus = "error";
    this.consecutiveErrors++;
    
    if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
      console.error('Too many errors, forcing fallback loop.');
      this.playFallback();
      return;
    }

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

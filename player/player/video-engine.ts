import QRCode from 'qrcode';
import { EventQueue } from '../storage/event-queue';
import { sendPlaybackEvent } from '../api/playback';
import { VideoCache } from '../storage/video-cache';

export interface VideoAsset {
  id: string;
  url: string;
  duration: number;
  qrUrl?: string; // Link de la marca (ej: tad.do/promo)
  campaignId?: string;
}

export class VideoEngine {
  private element: HTMLVideoElement;
  private qrContainer: HTMLElement | null;
  private qrImageElement: HTMLImageElement | null;
  private playlist: VideoAsset[] = [];
  private currentIndex = 0;
  private deviceId: string;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  public playerStatus: "playing" | "error" | "stopped" = "stopped";

  constructor(videoElementId: string, deviceId: string) {
    this.element = document.getElementById(videoElementId) as HTMLVideoElement;
    this.qrContainer = document.getElementById('qr-container');
    this.qrImageElement = document.getElementById('qr-code') as HTMLImageElement;
    this.deviceId = deviceId;
    
    // Auto cycle
    this.element.addEventListener("ended", this.onVideoEnded.bind(this));
    this.element.addEventListener("error", this.onPlaybackError.bind(this));
    this.element.addEventListener("playing", () => {
      this.playerStatus = "playing";
      this.resetWatchdog();
    });
  }

  public setPlaylist(videos: VideoAsset[]) {
    this.playlist = videos;
    this.currentIndex = 0;
    if (this.playlist.length > 0) {
      this.playNext();
    } else {
      this.playerStatus = "stopped";
    }
  }

  private async playNext() {
    if (this.playlist.length === 0) return;
    
    const currentVideo = this.playlist[this.currentIndex];
    
    // ============================================
    // QR CODE DYNAMIC OVERLAY
    // ============================================
    if (currentVideo.qrUrl && this.qrContainer && this.qrImageElement) {
      try {
        // Enlace de tracking con Proxy del Backend
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const apiBase = isLocal ? "http://localhost:3000/api" : "https://proyecto-ia-tad-api.rewvid.easypanel.host/api";
        const trackingLink = `${apiBase}/analytics/qr-scan?campaignId=${currentVideo.campaignId || 'manual'}&deviceId=${this.deviceId}`;
        
        // Generar QR (Negro sobre blanco)
        const qrDataUrl = await QRCode.toDataURL(trackingLink, {
          margin: 1,
          width: 300,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        this.qrImageElement.src = qrDataUrl;
        this.qrContainer.style.display = 'block';
        this.qrContainer.style.opacity = '1';
      } catch (qrErr) {
        console.warn("QR Generation failed: ", qrErr);
        this.qrContainer.style.display = 'none';
      }
    } else if (this.qrContainer) {
      this.qrContainer.style.display = 'none';
    }

    try {
      // Decode through Service Worker / Cache API allowing local >50MB fallback looping
      const localObjectURL = await VideoCache.getVideoSource(currentVideo.url);
      
      this.element.src = localObjectURL;
      this.element.load();
      await this.element.play();
      
      this.playerStatus = "playing";
      this.resetWatchdog();

    } catch (e) {
      console.error(`Playback failed for video ${currentVideo.id}`, e);
      this.onPlaybackError();
    }
  }

  private async onVideoEnded() {
    clearTimeout(this.watchdogTimer!);
    const playedVideo = this.playlist[this.currentIndex];
    
    // Proof of play payload
    const payload = {
      device_id: this.deviceId,
      video_id: playedVideo.id,
      timestamp: new Date().toISOString()
    };

    if (navigator.onLine) {
      const ok = await sendPlaybackEvent(payload);
      if (!ok) EventQueue.saveToQueue(payload);
    } else {
      EventQueue.saveToQueue(payload);
    }

    // Loop
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    this.playNext();
  }

  private onPlaybackError() {
    this.playerStatus = "error";
    console.error("Critical HTML5 playback rendering stall");
    // Skip to next video rather than hanging forever avoiding burn-in or black screens
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    setTimeout(() => this.playNext(), 2000);
  }

  private resetWatchdog() {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    
    // Hard stall threshold - if no "playing" / "ended" trips inside 2 minutes
    this.watchdogTimer = setTimeout(() => {
      this.playerStatus = "error";
      console.warn("Watchdog interval tripped - Player stagnant for 2 consecutive minutes without state resets"); 
    }, 120000);
  }
}

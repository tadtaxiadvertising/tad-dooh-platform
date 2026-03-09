import { VideoEngine } from './player/video-engine';
import { Scheduler } from './scheduler/daily-sync';

// Global Execution
(async () => {
    console.log("Initializing TAD DOOH Player Environment...");

    // Setup hardware identity natively
    let deviceId = localStorage.getItem('tad_device_id');
    if (!deviceId) {
        deviceId = `taxi-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('tad_device_id', deviceId);
    }
    console.log(`Mapping Node Identity: ${deviceId}`);

    // Register primary loop engine mapping onto DOM <video id="tad-player">
    const engine = new VideoEngine('tad-player', deviceId);
    
    // Inject Scheduler 
    const schedule = new Scheduler(deviceId, engine);
    await schedule.init();
})();

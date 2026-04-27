export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed: number;
}

export interface VirtualDriver {
  id: string;
  name: string;
  vehicleId: string;
  points: GpsPoint[];
}

export class DriverModule {
  private static firstNames = ['Juan', 'Pedro', 'Luis', 'Carlos', 'Ana', 'María', 'Rosa', 'José'];
  private static lastNames = ['Pérez', 'Gómez', 'Rodríguez', 'Santos', 'Martínez', 'López', 'Ramírez'];

  // Generates a complete fake profile (Dominican Republic context)
  static generateProfile(index: number = 1): VirtualDriver {
    const paddedId = String(index).padStart(4, '0');
    const firstName = this.firstNames[index % this.firstNames.length];
    const lastName = this.lastNames[index % this.lastNames.length];

    return {
      id: `SIM_PROFILE_${paddedId}`,
      name: `${firstName} ${lastName}`,
      vehicleId: `STI${paddedId}`,
      points: []
    };
  }

  // Simulates a batch of 10 GPS points starting from a base coordinate
  static generateGpsBatch(baseLat: number = 18.4861, baseLng: number = -69.9312): GpsPoint[] {
    const points: GpsPoint[] = [];
    const now = new Date();

    for (let i = 0; i < 10; i++) {
       // Slow movement simulation for city traffic
       const latOffset = (Math.random() - 0.5) * 0.001 * i;
       const lngOffset = (Math.random() - 0.5) * 0.001 * i;
       
       points.push({
         latitude: baseLat + latOffset,
         longitude: baseLng + lngOffset,
         timestamp: new Date(now.getTime() - (10 - i) * 3000).toISOString(),
         speed: Math.floor(Math.random() * 41) + 5 // km/h
       });
    }

    return points;
  }

  // Specific scenario generator: Santiago de los Caballeros
  static getSantiagoRef(): { lat: number, lng: number } {
    return { lat: 19.4517, lng: -70.6970 };
  }

  // Specific scenario generator: Santo Domingo (27 de Febrero)
  static getSantoDomingoRef(): { lat: number, lng: number } {
    return { lat: 18.4687, lng: -69.9320 };
  }
}

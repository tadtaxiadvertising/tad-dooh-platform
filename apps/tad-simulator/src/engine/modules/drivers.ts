import { fakerES as faker } from '@faker-js/faker';

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
  // Generates a complete fake profile (Dominican Republic context)
  static generateProfile(index: number = 1): VirtualDriver {
    const paddedId = String(index).padStart(4, '0');
    return {
      id: faker.string.uuid(), // This will be ignored/overridden if we use real driver IDs
      name: `${faker.person.firstName()} ${faker.person.lastName()}`,
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
         speed: faker.number.int({ min: 5, max: 45 }) // km/h
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

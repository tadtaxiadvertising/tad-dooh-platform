import { SimulationEngine } from './SimulationEngine';

const globalForSimulation = global as unknown as {
  simulationEngine?: SimulationEngine;
};

export function getSimulationEngine(): SimulationEngine {
  if (!globalForSimulation.simulationEngine) {
    globalForSimulation.simulationEngine = new SimulationEngine();
  }
  return globalForSimulation.simulationEngine;
}

export function getResolvedApiUrl(): string {
  const rawUrl = process.env.TAD_API_URL || '';
  // SRE: Forzar enrutamiento interno de Docker en producción para evitar ENOTFOUND
  if (process.env.NODE_ENV === 'production') {
    return 'http://tad-api:3000/api/v1';
  }
  return rawUrl || 'http://localhost:3000/api/v1';
}

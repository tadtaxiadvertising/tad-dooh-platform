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
  // SRE: Priorizar variable de entorno si está definida
  const envUrl = process.env.TAD_API_URL;
  if (envUrl) return envUrl;

  // Fallbacks por defecto para infraestructura interna Docker
  if (process.env.NODE_ENV === 'production') {
    return 'http://tad-api:3000/api/v1';
  }
  return 'http://localhost:3000/api/v1';
}

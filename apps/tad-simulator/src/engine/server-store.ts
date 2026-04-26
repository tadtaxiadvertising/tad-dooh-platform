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

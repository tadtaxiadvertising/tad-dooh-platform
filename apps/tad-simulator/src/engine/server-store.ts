import { SimulationNode } from './SimulationNode';

// Use a global variable to preserve the instance during HMR in development
// and act as a singleton in production.
const globalForSimulation = global as unknown as {
  simulationNode?: SimulationNode;
};

export function getSimulationNode(): SimulationNode {
  if (!globalForSimulation.simulationNode) {
    globalForSimulation.simulationNode = new SimulationNode({
      driverCount: 150,
      telemetryFreq: 30,
      errorRate: 0.05
    });
  }
  return globalForSimulation.simulationNode;
}

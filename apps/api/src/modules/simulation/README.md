# Simulation Module (TAD Simulator Engine)

Este módulo implementa un motor de simulación de alta fidelidad basado en escenarios para generar telemetría y comportamiento de flota realista dentro de la plataforma TAD DOOH.

## Arquitectura

El motor utiliza una estrategia de estado híbrida:
1. **Memoria (RAM)**: El estado dinámico de cada vehículo (latitud, longitud, dirección, velocidad) se mantiene en un `Map` dentro del `SimulationService` (clase `VirtualVehicle`). Esto evita lecturas constantes a la base de datos.
2. **Persistencia (Batch)**: Cada 30 segundos, el servicio proyecta el estado de todos los vehículos activos y realiza una inserción masiva (`createMany`) en la tabla `DriverLocation`.

## Componentes Principales

### `VirtualVehicle`

Clase interna que simula la física del movimiento:
* **Movimiento Haversine**: Calcula el desplazamiento basado en velocidad y tiempo.
* **Lógica de Contención**: Si un vehículo se sale del radio definido para el escenario, ajusta automáticamente su dirección hacia el centro del área (por defecto Santiago).
* **Simulación de Anomalías**: Basado en el `anomalyRate`, los vehículos pueden reportar errores o detenerse aleatoriamente.

### `SimulationService`

* **`loadScenario(config)`**: Inicializa un escenario. Limpia datos de prueba previos y crea N conductores y dispositivos virtuales.
* **`handleSimulationTick()`**: Ejecutado automáticamente mediante `@Interval`. Procesa el movimiento de toda la flota y persiste los resultados.
* **`clearTestData()`**: Método quirúrgico para eliminar registros con el flag `isSimulated: true`.

## API Endpoints

### 1. Iniciar/Cambiar Escenario

`POST /api/simulation/scenario`

**Payload:**
```json
{
  "name": "Hora Pico Santiago",
  "activeNodes": 50,
  "centerLat": 19.4517,
  "centerLng": -70.6970,
  "radiusKm": 8,
  "minSpeed": 15,
  "maxSpeed": 60,
  "anomalyRate": 0.02
}
```

### 2. Limpiar Datos de Prueba

`DELETE /api/simulation/purge`

Limpia todos los registros de `Driver`, `Device` y `DriverLocation` que tengan `isSimulated: true`.

## Consideraciones de SRE

* **Flag `isSimulated`**: Todos los datos generados están marcados con `isSimulated: true` para evitar contaminar las analíticas de producción reales.
* **Aislamiento**: Los escenarios limpian automáticamente los datos de pruebas anteriores antes de iniciar uno nuevo.
* **Rendimiento**: El uso de inserciones en lote protege el rendimiento del VPS durante pruebas de carga masivas.

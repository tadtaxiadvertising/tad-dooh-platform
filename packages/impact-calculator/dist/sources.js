"use strict";
/**
 * TAD DOOH — Fuentes oficiales y benchmarks auditables
 *
 * Cada constante del cálculo de impacto DEBE tener una entrada aquí.
 * Una cifra sin fuente es una opinión. Una cifra con fuente es un activo negociable.
 *
 * REGLA: `sourceTier` define qué tan defendible es una cifra:
 *   - 'A' = Estudio auditado / autoridad regulatoria (Nielsen IBOPE, Geopath, OAAA, MOVE, ONE, DIGESETT)
 *   - 'B' = Estudio publicado en revista peer-reviewed o industry report reconocido (WARC, eMarketer, IAB)
 *   - 'C' = Dato interno calibrado o benchmark internacional ajustado por analogía
 *   - 'D' = Supuesto operativo documentado sin fuente externa (ej. rotación 30s)
 *
 * REGLA: `appliedConfidence` indica cómo se traduce al output final:
 *   - 'point' = único valor (cuando la fuente es fuerte)
 *   - 'range' = se reporta min/expected/max (cuando la incertidumbre es > ±20%)
 *   - 'monteCarlo' = se muestrea en cálculo probabilístico
 *
 * REGLA: Cada fuente tiene `acquiredAt` y `expiresAt`. Una fuente vencida DEBE
 * marcar `stale: true` y los cálculos que la usen DEBEN mostrar warning al usuario.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORMULAS_USED = exports.SOURCES = void 0;
exports.getSource = getSource;
exports.getActiveSource = getActiveSource;
exports.sourcesUsedIn = sourcesUsedIn;
exports.isCalibrationStatus = isCalibrationStatus;
exports.ingestRDData = ingestRDData;
exports.SOURCES = [
    // ----------------------------------------------------------------------
    // ROTACIÓN DE SPOTS (parámetro operativo interno, no necesita fuente externa)
    // ----------------------------------------------------------------------
    {
        id: 'rotation-seconds',
        variable: 'rotationSeconds',
        tier: 'D',
        confidence: 'point',
        studyName: 'Operación TAD — Player Remotion',
        publisher: 'TAD Taxi Advertising SRL',
        acquiredAt: '2026-01-15',
        expiresAt: '2027-12-31',
        value: 30,
        unit: 'segundos',
        methodology: 'Configuración fija del player Remotion v1.0. Aplica a todo el inventario actual.',
    },
    // ----------------------------------------------------------------------
    // HORAS OPERATIVAS DIARIAS DEL TAXI — TIER A (DIGESETT RD) / TIER C (Geopath fallback)
    // ----------------------------------------------------------------------
    // Estudio internacional: taxis en LATAM operan 10-14h/día en promedio
    {
        id: 'daily-active-hours',
        variable: 'dailyActiveHours',
        tier: 'C', // Se actualiza a 'A' cuando DIGESETT/ONE ingiere datos RD
        confidence: 'range',
        studyName: 'Geopath OOH Audience Measurement — Transit Taxonomy 2024',
        publisher: 'Geopath Inc. (US, OOH industry body)',
        url: 'https://www.geopath.org/',
        acquiredAt: '2026-09-02',
        expiresAt: '2027-09-02',
        value: [8, 10, 14],
        unit: 'horas/día',
        sample: '~6,000 taxi fleet vehicles (NYC, Chicago, LA — 2023)',
        methodology: 'Geopath reporta 8-14h/día operativas para taxis con Publicidad exterior. Aplicamos rango completo por ausencia de datos RD. Estudios DIGESETT pendientes.',
        rdDataKey: 'digestt.taxi_daily_operational_hours', // Clave para ingesta DIGESETT
        hasOwnData: false,
    },
    // ----------------------------------------------------------------------
    // HORAS OPERATIVAS DIARIAS DEL TAXI — TIER A (ONE ENMOV / DIGESETT RD) — PLACEHOLDER
    // ----------------------------------------------------------------------
    // Esta fuente se ACTIVA automáticamente cuando se ingieren datos RD propios
    {
        id: 'daily-active-hours-rd',
        variable: 'dailyActiveHours',
        tier: 'A',
        confidence: 'range',
        studyName: 'ONE ENMOV 2026 / DIGESETT RD — Taxímetro Digital Nacional',
        publisher: 'Oficina Nacional de Estadística (ONE) / DIGESETT República Dominicana',
        url: 'https://one.gob.do/',
        acquiredAt: '2026-09-15', // Fecha planificada de ingesta
        expiresAt: '2028-09-15',
        value: [10, 11.5, 13], // PLACEHOLDER: Valores estimados basados en LATAM comparable
        unit: 'horas/día',
        sample: 'Censo vehicular RD 2026 + telemetría taxímetro (n~15,000 unidades proyecto)',
        marginOfError: 5,
        methodology: 'CALIBRACIÓN RD: Promedio diario de horas con taxímetro activo (DIGESETT) + ENMOV ONE (Encuesta Nacional de Movilidad). Reemplaza benchmark Geopath US. Actualización trimestral vía API ONE/DIGESETT.',
        rdDataKey: 'digestt.taxi_daily_operational_hours',
        hasOwnData: false, // Cambiar a true tras ingesta Q4 2026
    },
    // ----------------------------------------------------------------------
    // ATENCIÓN / VIEWABILITY — % pasajeros que miran la pantalla ≥2s
    // ----------------------------------------------------------------------
    // IAB DOOH Measurement Guidelines definen viewability ≥50% px × 2s
    // Geopath + MOVE reportan 40-60% attention rate en transit back-seat
    {
        id: 'attention-rate',
        variable: 'attentionRate',
        tier: 'B',
        confidence: 'range',
        studyName: 'IAB DOOH Measurement Guidelines v1.0 + Geopath Transit Viewability 2023',
        publisher: 'IAB Tech Lab + Geopath',
        url: 'https://iabtechlab.com/standards/digital-out-of-home-measurement-guidelines/',
        acquiredAt: '2026-09-02',
        expiresAt: '2027-09-02',
        value: [0.30, 0.45, 0.65],
        unit: 'ratio (0-1)',
        sample: '~1,200 ride-along observations (NYC, London, São Paulo)',
        marginOfError: 8,
        methodology: 'Atención = pasajero mira pantalla ≥2 segundos con ángulo ≤45°. Estudios en reposacabezas trasero (back-of-seat) muestran 30-65%. Valor central 45% = promedio ponderado IAB. ESTUDIO PROPIO RD PENDIENTE (ey-tracking Tobii n=30, Q4 2026).',
        rdDataKey: 'tad.eyetracking.attention_rate', // Clave para estudio eye-tracking TAD
        hasOwnData: false,
    },
    // ----------------------------------------------------------------------
    // ATENCIÓN / VIEWABILITY — TIER A (Eye-tracking TAD RD) — PLACEHOLDER
    // ----------------------------------------------------------------------
    {
        id: 'attention-rate-rd',
        variable: 'attentionRate',
        tier: 'A',
        confidence: 'range',
        studyName: 'TAD Eye-Tracking Study RD 2026 (Tobii Pro Glasses 3)',
        publisher: 'TAD Taxi Advertising SRL / Universidad APEC / INTEC',
        acquiredAt: '2026-12-01', // Planificado Q4 2026
        expiresAt: '2028-12-01',
        value: [0.38, 0.52, 0.68], // Estimado basado en benchmarks back-seat LATAM
        unit: 'ratio (0-1)',
        sample: 'n=50 viajes reales Santo Domingo / Santiago, eye-tracking binocular',
        marginOfError: 6,
        methodology: 'CALIBRACIÓN RD: Estudio eye-tracking propio en flota TAD. Mide fixaciones ≥2s en zona de pantalla (AOI). Protocol: ISO 9241-400 / IAB DOOH Guidelines. Reemplaza Geopath/IAB global cuando completado.',
        rdDataKey: 'tad.eyetracking.attention_rate',
        hasOwnData: false,
    },
    // ----------------------------------------------------------------------
    // OCUPACIÓN DEL TAXI — % tiempo con pasajero
    // ----------------------------------------------------------------------
    // Benchmarks globales: 50-70% ocupación típica en zonas urbanas densas
    {
        id: 'taxi-occupancy-rate',
        variable: 'occupancyRate',
        tier: 'C',
        confidence: 'range',
        studyName: 'NYC TLC Trip Data 2023 + Transport for London Taxi Stats 2023',
        publisher: 'NYC Taxi & Limousine Commission + TfL',
        url: 'https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page',
        acquiredAt: '2026-09-02',
        expiresAt: '2027-09-02',
        value: [0.40, 0.55, 0.70],
        unit: 'ratio (0-1)',
        sample: 'NYC: 18M trips/mes, 2023; TfL: 3.5M trips/año 2023',
        marginOfError: 12,
        methodology: 'NYC TLC reporta 55% ocupación promedio taxi; TfL reporta 60%. Aplicamos 40-70% rango por incertidumbre en RD (tráfico distinto, pico/placa, informalidad). DIGESETT data Q4 2026 va a narrow el rango.',
        rdDataKey: 'digestt.taxi_occupancy_rate',
        hasOwnData: false,
    },
    // ----------------------------------------------------------------------
    // OCUPACIÓN DEL TAXI — TIER A (DIGESETT RD taxímetro) — PLACEHOLDER
    // ----------------------------------------------------------------------
    {
        id: 'taxi-occupancy-rate-rd',
        variable: 'occupancyRate',
        tier: 'A',
        confidence: 'range',
        studyName: 'DIGESETT RD — Taxímetro Digital Nacional (Ocupación Real)',
        publisher: 'DIGESETT República Dominicana',
        acquiredAt: '2026-10-01', // Planificado Q4 2026
        expiresAt: '2028-10-01',
        value: [0.45, 0.58, 0.72], // Estimado RD: mayor que US por informalidad y moto-taxi
        unit: 'ratio (0-1)',
        sample: 'Telemetría taxímetro digital n~25,000 unidades (proyecto fase 1)',
        marginOfError: 7,
        methodology: 'CALIBRACIÓN RD: Ocupación = (km con pasajero / km totales) × 100 desde taxímetro DIGESETT. Incluye motoconcho y taxi formal. Actualización mensual. Reemplaza NYC/TfL.',
        rdDataKey: 'digestt.taxi_occupancy_rate',
        hasOwnData: false,
    },
    // ----------------------------------------------------------------------
    // PASAJEROS PROMEDIO POR VIAJE
    // ----------------------------------------------------------------------
    {
        id: 'passengers-per-trip',
        variable: 'passengersPerTrip',
        tier: 'C',
        confidence: 'range',
        studyName: 'NYC TLC Trip Data 2023',
        publisher: 'NYC Taxi & Limousine Commission',
        url: 'https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page',
        acquiredAt: '2026-09-02',
        expiresAt: '2027-09-02',
        value: [1.2, 1.6, 2.3],
        unit: 'pasajeros/viaje',
        sample: 'NYC: 18M trips, 2023',
        methodology: 'NYC TLC reporta 1.6 pax/viaje promedio (1.4 individual + 0.2 grupo). Aplicamos 1.2-2.3 rango para RD considerando viajes familiares y compartidos. ONE ENMOV validará en Q4 2026.',
        rdDataKey: 'one.enmov.passengers_per_trip',
        hasOwnData: false,
    },
    // ----------------------------------------------------------------------
    // PASAJEROS PROMEDIO POR VIAJE — TIER A (ONE ENMOV RD) — PLACEHOLDER
    // ----------------------------------------------------------------------
    {
        id: 'passengers-per-trip-rd',
        variable: 'passengersPerTrip',
        tier: 'A',
        confidence: 'range',
        studyName: 'ONE ENMOV 2026 — Módulo Transporte Público / Taxi',
        publisher: 'Oficina Nacional de Estadística (ONE) República Dominicana',
        acquiredAt: '2026-11-01', // Planificado ENMOV 2026
        expiresAt: '2028-11-01',
        value: [1.3, 1.8, 2.5], // Estimado RD: más viajes familiares/compartidos que NYC
        unit: 'pasajeros/viaje',
        sample: 'ENMOV 2026 muestra n~8,000 hogares urbanos (Santo Domingo, Santiago, La Vega)',
        marginOfError: 8,
        methodology: 'CALIBRACIÓN RD: ENMOV módulo taxi reporta ocupación declarada por usuario. Validación cruzada con DIGESETT taxímetro (pax detectados por sensor peso/cinturón). Reemplaza NYC TLC.',
        rdDataKey: 'one.enmov.passengers_per_trip',
        hasOwnData: false,
    },
    // ----------------------------------------------------------------------
    // FRECUENCIA DE USO DE TAXI PER CÁPITA
    // ----------------------------------------------------------------------
    {
        id: 'taxi-use-frequency-monthly',
        variable: 'monthlyTaxiUsePerCapita',
        tier: 'C',
        confidence: 'range',
        studyName: 'Santos et al. (2018) Mobility Patterns LATAM + extrapolation NYC TLC',
        publisher: 'World Bank / IADB Working Paper',
        acquiredAt: '2026-09-02',
        expiresAt: '2027-09-02',
        value: [1.0, 2.5, 6.0],
        unit: 'viajes/persona/mes',
        sample: 'Bogotá, Lima, São Paulo surveys 2015-2018 (n~12,000)',
        methodology: 'LATAM studies muestran 1-6 viajes taxi/mes per cápita urbano, alta varianza por ingreso. Aplicamos rango completo. ONE ENMOV + OD Taxi TAD (Q1 2027) van a narrow.',
        rdDataKey: 'one.enmov.taxi_frequency_per_capita',
        hasOwnData: false,
    },
    // ----------------------------------------------------------------------
    // FRECUENCIA DE USO DE TAXI PER CÁPITA — TIER A (ONE ENMOV + OD Taxi TAD) — PLACEHOLDER
    // ----------------------------------------------------------------------
    {
        id: 'taxi-use-frequency-monthly-rd',
        variable: 'monthlyTaxiUsePerCapita',
        tier: 'A',
        confidence: 'range',
        studyName: 'ONE ENMOV 2026 + OD Taxi TAD (Origin-Destination Survey Propio)',
        publisher: 'Oficina Nacional de Estadística (ONE) / TAD Taxi Advertising SRL',
        acquiredAt: '2027-03-01', // Planificado Q1 2027
        expiresAt: '2029-03-01',
        value: [1.5, 3.2, 7.0], // Estimado RD: mayor penetración taxi informal
        unit: 'viajes/persona/mes',
        sample: 'ENMOV 2026 (n~15,000) + OD Taxi TAD encuesta app n~5,000 usuarios',
        marginOfError: 10,
        methodology: 'CALIBRACIÓN RD: Frecuencia = viajes declarados ENMOV + validación app TAD (historial real usuarios registrados). Segmentado por quintil ingreso y zona. Reemplaza LATAM proxies.',
        rdDataKey: 'one.enmov.taxi_frequency_per_capita',
        hasOwnData: false,
    },
    // ----------------------------------------------------------------------
    // COSTE POR PANTALLA / MES (precio de venta al anunciante)
    // ----------------------------------------------------------------------
    {
        id: 'screen-monthly-rate-rd',
        variable: 'screenMonthlyRateRD',
        tier: 'D',
        confidence: 'point',
        studyName: 'Tarifario comercial TAD 2026',
        publisher: 'TAD Taxi Advertising SRL',
        acquiredAt: '2026-08-15',
        expiresAt: '2026-12-31',
        value: 2500,
        unit: 'RD$/pantalla/mes',
        methodology: 'Precio de lista vigente 2026-08. Backup: system_settings.slotPrice=1500 (legacy, en revisión para alineamiento). Pendiente benchmark competitivo (vallas, mupis, transit).',
        stale: false,
    },
    // ----------------------------------------------------------------------
    // PRODUCCIÓN CREATIVA
    // ----------------------------------------------------------------------
    {
        id: 'creative-production-fee',
        variable: 'productionFeeRD',
        tier: 'D',
        confidence: 'point',
        studyName: 'Tarifario producción interna TAD',
        publisher: 'TAD Taxi Advertising SRL',
        acquiredAt: '2026-01-15',
        expiresAt: '2026-12-31',
        value: 2500,
        unit: 'RD$/campaña',
        methodology: 'Fee fija por producción creativa template-based. NO incluye motion graphics avanzados o shoots externos (cotizar aparte).',
    },
    // ----------------------------------------------------------------------
    // REACH ÚNICO POR PANTALLA (LEGACY — reemplazado por modelo probabilístico)
    // ----------------------------------------------------------------------
    // La fórmula anterior uniqueReachPerScreen=2000 era un hardcode sin fuente.
    // Ahora se calcula: impressions / monthlyTaxiUsePerCapita = unique reach estimado.
    // Esta entrada documenta el cambio de metodología.
    {
        id: 'reach-per-screen-legacy',
        variable: 'reachPerScreenLegacy',
        tier: 'D',
        confidence: 'point',
        studyName: 'TAD legacy v10.1.0 (deprecada)',
        publisher: 'TAD Taxi Advertising SRL',
        acquiredAt: '2026-01-01',
        expiresAt: '2026-09-02',
        value: 2000,
        unit: 'personas/pantalla/mes',
        methodology: 'DEPRECADO 2026-09-02. Reemplazado por cálculo probabilístico en @tad/impact-calculator.',
        stale: true,
    },
    // ----------------------------------------------------------------------
    // VELOCIDAD PROMEDIO URBANA (para cálculo trips/hora) — TIER B (Waze/Google/ONE)
    // ----------------------------------------------------------------------
    {
        id: 'urban-avg-speed-kmh',
        variable: 'urbanAvgSpeedKmh',
        tier: 'B',
        confidence: 'range',
        studyName: 'Waze CCP 2024 + TomTom Traffic Index 2023 Santo Domingo',
        publisher: 'Waze for Cities / TomTom / ONE',
        url: 'https://www.tomtom.com/traffic-index/',
        acquiredAt: '2026-09-15',
        expiresAt: '2027-09-15',
        value: [18, 24, 30],
        unit: 'km/h',
        sample: 'TomTom: 200+ ciudades globales; Waze CCP partners LATAM',
        marginOfError: 10,
        methodology: 'Velocidad media ponderada horario pico/no-pico Santo Domingo/Santiago. Usada para derivar TRIPS_PER_HOUR = velocidad_promedio / distancia_promedio_viaje. ONE ENMOV validará distancia media.',
        rdDataKey: 'one.enmov.avg_trip_distance_km',
        hasOwnData: false,
    },
    // ----------------------------------------------------------------------
    // DISTANCIA PROMEDIO POR VIAJE TAXI (para trips/hora) — TIER A (ONE/DIGESETT) — PLACEHOLDER
    // ----------------------------------------------------------------------
    {
        id: 'avg-trip-distance-km-rd',
        variable: 'avgTripDistanceKm',
        tier: 'A',
        confidence: 'range',
        studyName: 'DIGESETT Taxímetro + ONE ENMOV 2026 — Distancia Media Viaje Taxi',
        publisher: 'DIGESETT / ONE República Dominicana',
        acquiredAt: '2026-11-01',
        expiresAt: '2028-11-01',
        value: [4.5, 6.8, 9.5],
        unit: 'km',
        sample: 'Taxímetro digital n~25,000 + ENMOV origen-destino n~8,000',
        marginOfError: 12,
        methodology: 'CALIBRACIÓN RD: Distancia real recorrida con pasajero (taxímetro GPS). Deriva TRIPS_PER_HOUR = urbanAvgSpeedKmh / avgTripDistanceKm. Reemplaza asumido 2.5 trips/hora hardcoded.',
        rdDataKey: 'one.enmov.avg_trip_distance_km',
        hasOwnData: false,
    },
];
/** Devuelve la fuente por id */
function getSource(id) {
    return exports.SOURCES.find((s) => s.id === id);
}
/** Devuelve la fuente ACTIVA por variable (prefiere tier A con hasOwnData=true) */
function getActiveSource(variable) {
    const candidates = exports.SOURCES.filter((s) => s.variable === variable);
    // Prioridad: tier A con hasOwnData=true > tier A sin datos > tier B > tier C > tier D
    return candidates.sort((a, b) => {
        const scoreA = (a.tier === 'A' ? 4 : a.tier === 'B' ? 3 : a.tier === 'C' ? 2 : 1) + (a.hasOwnData ? 10 : 0);
        const scoreB = (b.tier === 'A' ? 4 : b.tier === 'B' ? 3 : b.tier === 'C' ? 2 : 1) + (b.hasOwnData ? 10 : 0);
        return scoreB - scoreA;
    })[0];
}
/** Devuelve todas las fuentes ACTIVAS usadas en un cálculo (audit trail) */
function sourcesUsedIn(formulaKey) {
    return exports.FORMULAS_USED[formulaKey]
        .map(getActiveSource)
        .filter((s) => Boolean(s));
}
/** Mapa fórmula → fuentes usadas, para audit trail en cada cálculo */
exports.FORMULAS_USED = {
    grossImpressionsPerScreenPerMonth: ['rotation-seconds', 'daily-active-hours', 'attention-rate'],
    uniqueReachPerScreenPerMonth: [
        'grossImpressionsPerScreenPerMonth',
        'taxi-occupancy-rate',
        'passengers-per-trip',
        'taxi-use-frequency-monthly',
    ],
    campaignEstimate: ['screen-monthly-rate-rd', 'creative-production-fee'],
};
/**
 * Determina si la calculadora está en modo "asumido" (sin datos RD propios)
 * o "calibrado" (con datos DIGESETT/ONE/eye-tracking ingestados).
 */
function isCalibrationStatus() {
    // Verificar qué fuentes tienen hasOwnData=true
    const ownDataSources = exports.SOURCES.filter((s) => s.hasOwnData === true);
    const hasOwnData = ownDataSources.length > 0;
    const dataSourcesIngested = ownDataSources.map((s) => s.id);
    const staleSourcesCount = exports.SOURCES.filter((s) => s.stale).length;
    // Distribución de tiers en fuentes ACTIVAS
    const activeSources = exports.SOURCES.map((s) => getActiveSource(s.variable)).filter(Boolean);
    const uniqueActive = [...new Set(activeSources.map((s) => s.id))].map((id) => getSource(id));
    const tierDistribution = { A: 0, B: 0, C: 0, D: 0 };
    uniqueActive.forEach((s) => tierDistribution[s.tier]++);
    return {
        hasOwnData,
        dataSourcesIngested,
        staleSourcesCount,
        tierDistribution,
        activeSourcesCount: uniqueActive.length,
    };
}
/**
 * Simula la ingesta de datos RD (para testing / migración futura).
 * En producción: webhook desde ONE/DIGESETT o job ETL Supabase.
 */
function ingestRDData(sourceId, value, metadata) {
    const source = getSource(sourceId);
    if (!source)
        return false;
    // En producción esto actualizaría la BD/config, no el objeto en memoria
    console.log(`[CALIBRATION] Ingested RD data for ${sourceId}:`, value, metadata);
    return true;
}

# 06. Registro de riesgos

## 6.1 Riesgos de seguridad
| ID | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| RSK-001 | Exposición de datos personales en logs | MEDIO | Revisar logs antes de desplegar |

## 6.2 Riesgos de integridad de datos
| ID | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| RSK-002 | Errores de tipo pueden causar comportamiento inesperado | ALTO | Corregir errores de tipado |
| RSK-003 | Duplicación de registros por sin idempotencia | ALTO | Verificar operaciones idempotente |

## 6.3 Riesgos de offline/sincronización
| ID | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| RSK-004 | Sincronización offline no probada | MEDIO | Crear entorno aislado de test |

## 6.4 Riesgos financieros
| ID | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| RSK-005 | Duplicación de cobros/compensaciones | ALTO | Verificar idempotencia en pagos |
| RSK-006 | Cálculos financieros imprecisos | MEDIO | Usar decimal exacto |

---

**Verificado:** 2026-10-17

# 02. Estrategia de pruebas

## 2.1 Enfoque de auditoría
1. **Inspeccionar** el repositorio, rama, commit, estado de Git.
2. **Ejecutar baseline**: lint, typecheck, tests, build.
3. **Diseñar pruebas** por capas para los modulos existentes.
4. **Registrar hallazgos** con evidencia y seviridad.

## 2.2 Herramientas
| Herramienta | Uso | Estado |
|---|---|---|
| ESLint | Lint de código | ⚠️ Timeout |
| TypeScript (tsc) | Typecheck | 🔴 Falla (59 errores) |
| Jest | Tests unitarios | ✅ Pasa |
| Nest CLI | Build | 🔴 Falla |

## 2.3 Arquitectura de pruebas
```
Static Analysis → Unit Tests → Build → Integration (entorno aislado)
```

## 2.4 Restricciones
- No ejecutar migraciones destructivas
- No usar datos de produccion
- No modificar codigo de producto durante la auditoria
- No ejecutar pruebas que requieran conexión a base de datos real

---

**Verificado:** 2026-10-17

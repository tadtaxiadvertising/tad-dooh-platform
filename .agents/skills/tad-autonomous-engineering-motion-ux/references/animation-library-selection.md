# Selección de librerías y componentes

Leer antes de añadir dependencias o copiar componentes. Este documento orienta la selección; no instala paquetes, no acredita compatibilidad con TAD ni autoriza acciones fuera del pedido.

## Contexto y fuentes consultadas

Consulta: **2026-11-02, America/La_Paz**. En el checkout local `1d668d95a7519b003a035cc16e643f495088415f`, los manifiestos Advertiser/Driver declaran Next `15.5.24`, React `19.0.0`, Framer Motion `^12.38.0` y Tailwind `^4.0.0`. Esto es lectura de manifiestos, no versión resuelta, auditoría de seguridad ni compatibilidad probada. Revalidar lockfile, runtime y configuración actuales antes de implementar.

Las licencias siguientes se leyeron en fuentes oficiales en esa fecha. Son enlaces a ramas/páginas mutables; **ningún componente se incorporó en esta revisión ni se fijó un SHA de adopción**. Registrar versión/SHA y licencia del código exacto al seleccionarlo. Una licencia del repositorio no acredita assets externos, paquetes Pro o contenido de terceros.

| Candidato | Hecho observado y fuente primaria | Uso en TAD y comprobación pendiente |
| --- | --- | --- |
| Framer Motion existente | Los manifiestos del checkout lo declaran. Inspeccionar paquete instalado y lockfile antes de cambiar imports o versión | UI React, gestos y estados. Mantener el runtime existente; no agregar `motion` solo porque una demo lo importa |
| GSAP + ScrollTrigger | La [licencia estándar](https://gsap.com/community/standard-license/) permite usos comerciales sin cargo bajo sus términos; no es MIT y restringe ciertos constructores visuales de animación que compiten con Webflow | Candidato a una timeline narrativa. Revisar los términos de la versión elegida, alcance del producto, dependencias y bundle. No asumir permiso para cualquier redistribución o builder |
| `@gsap/react` | El [repositorio oficial](https://github.com/greensock/react) documenta `useGSAP`, scope, cleanup de contexto y callbacks `contextSafe`, y remite a la licencia estándar GSAP | Integración React de la escena; comprobar API del paquete elegido, SSR, Strict Mode, cambios de dependencias y cleanup de listeners fuera del hook |
| Magic UI | [LICENSE.md del repositorio](https://github.com/magicuidesign/magicui/blob/main/LICENSE.md): MIT, conservando los avisos exigidos | Elegir código gratuito concreto, por ejemplo animated-beam para relacionar creatividad/tablet, number-ticker o text-animate cuando comuniquen estado. Revisar imports y fuente; no suponer que plantillas/servicios Pro tienen la misma licencia |
| Motion Primitives | [LICENCE.md](https://github.com/ibelick/motion-primitives/blob/main/LICENCE.md): MIT. Su [README](https://github.com/ibelick/motion-primitives) presenta componentes sobre Motion/Tailwind | Candidatos text-morph, text-effect, in-view o listas. Inspeccionar imports del componente exacto; adaptar al motor presente si es compatible y conservar notices, o justificar una migración sin duplicar motores |
| React Bits, opcional | [LICENSE.md](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md): MIT + Commons Clause, con restricciones a vender, sublicenciar o redistribuir los componentes, herramientas y ciertos exports por sí mismos | Máximo un efecto ligero si aporta valor. Revisar el caso de distribución concreto y dependencias; no tratarlo como MIT sin restricciones. Si hay duda, usar otra fuente o equivalente propio |
| Rive, opcional | El [runtime web](https://github.com/rive-app/rive-wasm/blob/master/LICENSE) publica licencia MIT. Esa lectura no decide derechos del asset ni términos del editor/exportación | Adoptar solo con `.riv` propio/licenciado, procedencia y términos del flujo de creación/exportación comprobados. No es requisito V2 |

## Contrato de adopción

1. Vincular el candidato a una interacción del [blueprint](creative-experience-blueprints.md) y explicar qué mejora frente a la solución instalada. Para el programa completo se busca al menos un componente material de Magic UI/Motion Primitives y una escena GSAP cuando aporte valor; las excepciones requieren alternativa funcional demostrada.
2. Leer fuente, licencia/avisos, versión o commit, peer dependencies y paquete destino. Registrar URL permanente al SHA, fecha, archivos copiados, modificaciones y notices conservados. Si no puede verificarse licencia, no integrar ese código; continuar con alternativa conocida.
3. Instalar solo durante implementación autorizada y cuando sea necesario. Usar gestor/versión del proyecto, workspace correcto, versión revisada y lockfile coherente. Revisar cambios transitivos y scripts; no instalar globalmente, ejecutar comandos de marketing sin inspección ni usar `--force` para resolver conflictos/auditoría.
4. Mantener UI útil en SSR/no-JS. Importar código de navegador dentro del límite cliente apropiado. Verificar montaje/desmontaje, cambio de dependencias y preferencia reducida. Para GSAP, usar scope y cleanup de contexto; los handlers diferidos deben quedar en el contexto y sus listeners deben retirarse. No animar la misma propiedad con dos motores.
5. Integrar realmente en el layout, con tokens TAD, labels/foco/touch y estado final estático. Un paquete instalado o un demo aislado no cumple aceptación. Evitar WebGL, partículas masivas, fuentes remotas y vídeo pesado por decoración.
6. Medir baseline y resultado comparable: JS inicial/diferido gzip, CPU/long tasks, LCP/CLS de laboratorio y gesto/teclado. Aplicar el [QA](responsive-motion-qa.md); si no aporta valor o excede el coste razonado, retirar el efecto de forma revisable y conservar el contenido.

En la entrega indicar **ADOPTADO** (archivo y evidencia), **DESCARTADO** (causa y alternativa demostrada) o **PENDIENTE**. No describir compatibilidad, gratuidad universal o rendimiento como verificados solo por esta tabla.

# Mejoras de Autenticación y Experiencia de Usuario (UX) - TAD DOOH 2026

Se ha realizado una actualización integral de los flujos de acceso para los tres portales (Administrador, Anunciante y Conductor), priorizando una estética premium, seguridad funcional y una navegación intuitiva.

## 1. Cambios Generales Aplicados

- **Diseño Glassmorphic Premium**: Uso de fondos oscuros con desenfoque (`backdrop-blur`), degradados sutiles y micro-interacciones.
- **Mostrar/Ocultar Contraseña**: Se implementó un toggle con icono de ojo en todos los campos de contraseña.
- **Flujo de Recuperación**: Se añadieron vistas de "Olvidé mi contraseña" con estados de confirmación de envío.
- **Copy en Español**: Toda la interfaz de usuario se ha traducido y optimizado para el mercado local con un tono profesional.
- **Validación de Formularios**: Implementación de estados de carga y banners de error/éxito persistentes.

## 2. Portal de Anunciante (Advertiser Hub)

- **Multi-Vista**: Una única página que alterna entre Login, Registro y Recuperación.
- **Registro Público**: Los nuevos anunciantes pueden crear su cuenta directamente proporcionando nombre de empresa, contacto y password.
- **Recuperación Funcional**: Conectado al endpoint `/advertisers/recover-password`.

## 3. Portal del Conductor (Driver App)

- **Mobile-First**: Diseño optimizado para dispositivos móviles y tablets FullyKiosk.
- **Registro con Contrato**: El flujo de registro ahora exige la aceptación explícita del contrato de servicio y el seguro del equipo.
- **Teclado Optimizado**: Uso de `type="tel"` y `type="password"` para facilitar la entrada en dispositivos táctiles.

## 4. Portal del Administrador (Admin Node)

- **Estética Industrial Superior**: Diseño enfocado en "High-Security Terminal" con animaciones de pulso y desenfoques profundos.
- **Seguridad**: El acceso está restringido a roles ADMIN. El flujo de recuperación está orientado a soporte interno.

## 5. Actualizaciones del Backend (NestJS)

- **Soporte de Contraseñas en Registro**: El endpoint `POST /advertisers` ahora acepta y hashea el campo `password` durante la creación.
- **Saneamiento de Datos**: Los campos opcionales en el registro de conductores (cédula, placa) se limpian automáticamente para evitar errores de unicidad en la DB.
- **RolesGuard Public Bypass**: Se corrigió un bloqueo 403 que afectaba a rutas públicas en controladores con restricciones de rol a nivel de clase.
- **Flujo de Reset (Advertisers)**: Implementación completa del endpoint `POST /advertisers/reset-password` para permitir la configuración de contraseñas tras la recuperación.
- **Onboarding de Anunciantes**: Soporte para establecer contraseñas en cuentas iniciales que no tenían una configurada previamente.

---

### Credenciales de Prueba (Entorno Simulado)

- **Password General**: `Tad2026!`
- **Admin**: `admin@tad.do`
- **Anunciante**: `ads@brugal.com`
- **Conductor**: `8295550001` (Teléfono)

# Holistia - App Móvil

Aplicación móvil nativa (iOS y Android) de **Holistia**, plataforma integral de bienestar que conecta profesionales de la salud con personas que buscan mejorar su calidad de vida. Esta app es **exclusivamente móvil** (sin soporte web).

## Características Principales

### Para Pacientes/Usuarios
- Explorar y descubrir profesionales de bienestar (expertos)
- Agendar citas con profesionales verificados
- Registrarse a eventos y talleres
- Sistema de favoritos para profesionales, programas, eventos, restaurantes y centros holísticos
- Gestión de citas, retos y eventos registrados
- Perfil personal editable (teléfono, privacidad, notificaciones push)
- Mensajería directa con profesionales
- Participar en retos de bienestar
- Feed social con publicaciones de check-ins
- Explorar programas digitales, restaurantes y centros holísticos
- Inscripción a profesionales con deep links de Stripe

### Para Profesionales
- Gestión de servicios (sesiones, programas, cotizaciones)
- Configuración de disponibilidad y bloqueos
- Sincronización con Google Calendar
- Gestión de citas y pacientes
- Creación y organización de eventos
- Galería de fotos profesional
- Integración con Stripe Connect
- Dashboard con métricas
- Mensajería directa

### Para Administradores
- Panel de administración completo
- Gestión del directorio y usuarios
- Blog, eventos, métricas y más

## Stack Tecnológico

- **Framework:** Expo 54 + React Native 0.81
- **Routing:** Expo Router (file-based)
- **Backend:** Supabase (auth, base de datos, storage)
- **Pagos:** Stripe Connect
- **Push:** expo-notifications
- **UI:** React Native + expo-vector-icons

## Requisitos Previos

- Node.js 18+
- pnpm (recomendado)
- Cuenta de Supabase
- Para iOS: Xcode y simulador o dispositivo
- Para Android: Android Studio y emulador o dispositivo

## Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto (no lo subas a Git):

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=tu_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

# URLs
EXPO_PUBLIC_SITE_URL=https://tu-sitio-web.com

# Otras variables según integraciones (Stripe, Mapbox, Resend, etc.)
```

### Instalación

```bash
# Instalar dependencias
pnpm install
```

### Desarrollo

```bash
# Iniciar Metro y Expo
pnpm start
```

En la salida podrás abrir la app en:

- **iOS Simulator** – `pnpm ios` o `i` en la terminal
- **Android Emulator** – `pnpm android` o `a` en la terminal

### Scripts Disponibles

| Comando      | Descripción                    |
| ------------ | ------------------------------ |
| `pnpm start` | Inicia el servidor de desarrollo |
| `pnpm ios`   | Ejecuta en simulador iOS       |
| `pnpm android` | Ejecuta en emulador Android  |
| `pnpm build` | Verifica el código (lint)      |
| `pnpm lint`  | Ejecuta ESLint                 |
| `pnpm typecheck` | Verifica tipos TypeScript  |

## Estructura del Proyecto

```
/app
  /(auth)           # Login, signup, confirmación email
  /(patient)        # Portal de pacientes
  /(expert)         # Dashboard de profesionales
  /(admin)          # Panel de administración
  /(tabs)           # Tabs principales (feed, mensajes, perfil)
  index.tsx         # Entrada principal
/components         # Componentes reutilizables
/lib               # Supabase, utils, stores
```

## Build de Producción

Para generar builds nativos (EAS Build o builds locales):

- **iOS:** Requiere cuenta de Apple Developer
- **Android:** `expo run:android` para build local o EAS Build para APK/AAB

Consulta la [documentación de Expo](https://docs.expo.dev) para EAS Build y despliegue en tiendas.

## Relación con Holistia Web

Esta app móvil comparte la misma base de datos (Supabase) y lógica de negocio que la aplicación web **[Holistia-Web](../Holistia-Web)**. Ambas ofrecen acceso a la misma plataforma desde diferentes dispositivos.

## Recursos

- [Documentación de Expo](https://docs.expo.dev)
- [Expo Router](https://docs.expo.dev/router/introduction)
- [Supabase para React Native](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)

# Plan Maestro de Ejecución: Life Tracker (RPG Edition)

---

## 📊 Estado Actual del Proyecto

**Última actualización:** 2 de Febrero de 2026

### Resumen Ejecutivo

El proyecto Life Tracker ha dado un salto gigante al migrar de un sistema puramente local a una **infraestructura en la nube con Supabase**. Se ha implementado un sistema de autenticación completo, permitiendo que múltiples usuarios gestionen sus datos de forma independiente y segura. Las bases del RPG (Fase 1 y 2) y el sistema de tareas avanzado ya están plenamente operativos en este entorno persistente.

### Métricas de Progreso

- **Progreso General:** ~80% completado (Core fundamental finalizado)
- **Fases Completadas:** 3/5 (RPG Core, Cloud Auth & Data, Stats)
- **Características Adicionales:** Sistema de Tareas, Quests, Achievements, Cloud Middleware
- **Persistencia:** Migración exitosa de `db.json` a PostgreSQL (Supabase)

### Funcionalidades Principales Activas

✅ Autenticación Multi-usuario (Supabase Auth)  
✅ Persistencia en la nube con Row Level Security (RLS)  
✅ Motor RPG con XP y niveles  
✅ Sistema de 4 atributos (STR, INT, WIL, CRE)  
✅ Gamificación de hábitos y tareas  
✅ Radar Chart para visualización de stats  
✅ Calendario interactivo con time blocking  
✅ Sistema de logros/achievements  
✅ Quest Board (Sistema de Misiones integrado)  
✅ Modo Oscuro completo

### Próximos Hitos

🎯 **Fase 4:** Economía completa (Tienda, Inventario)  
🎯 **Fase 5:** Buffs & Debuffs  
🎯 **Mejoras UX:** Optimización móvil y edición de tareas (EZE-64, EZE-65)  
🎯 **Módulo de Finanzas:** Desarrollo del tracker financiero (EZE-67)

---

## 1. Resumen del Objetivo

Transformar el actual "Life OS" (Life Tracker) en un **Sistema Operativo Personal Gamificado y Modular**.
El objetivo es pasar de un simple tracker a una experiencia **RPG** donde el usuario "sube de nivel" en la vida real completando hábitos, gestionando finanzas y aprendiendo, manteniendo una arquitectura flexible para integrar el TFG (Gym App) en el futuro.

## 2. Referencias

- **Documentación Base:** `PROJECT_DOCS.md` (Arquitectura actual Next.js + JSON).
- **Concepto Usuario:** RPG System, Finance Module, Widget Dashboard.

## 3. Análisis Técnico

### 3.1. Arquitectura de Datos (`db.json`)

Actualmente el esquema es monolítico centrado en `entries`. Necesitamos segregar dominios para evitar un JSON gigante e inmanejable.

- **Cambio Propuesto:** Migrar de un solo `db.json` a un patrón de "Colecciones Virtuales" dentro del mismo archivo o archivos separados si crece mucho (por ahora mantenemos uno por simplicidad de despliegue local).

**Nuevas Estructuras Requeridas:**

```typescript
interface DB {
	user: {
		xp: number;
		level: number;
		attributes: { strength: number; intellect: number; charisma: number }; // RPG Stats
	};
	finance: {
		transactions: Transaction[];
		budgets: Budget[];
	};
	// ... existing entries
}
```

### 3.2. Motor de Eventos (Event Bus)

Para que "Leer un libro" de +20XP de Inteligencia, necesitamos un sistema de eventos interno.

- **Patrón:** Observer / Pub-Sub ligero.
- **Implementación:** Un hook `useGameSystem` que exponga métodos como `awardXP('strength', 50)`.

## 4. Plan de Implementación Paso a Paso

---

### ✅ Fase 1: El Motor RPG (Gamification Core) ⚔️ — **COMPLETADA**

- [x] **1.1. Schema Update:** Añadir objeto `gamification` al `db.json` (XP total, Nivel, Historial de logros).
  - ✅ Schema actualizado con `xp`, `level`, `gold`
  - ✅ Atributos: `strength`, `intellect`, `willpower`, `creativity`
- [x] **1.2. Componente HUD:** Crear una barra de experiencia y nivel siempre visible (Header o Sidebar).
  - ✅ Barra de XP implementada en Header
  - ✅ Animación de progreso visual
- [x] **1.3. Hook de Progresión:** Implementar lógica de subida de nivel (fórmula: `Level = sqrt(XP / 100)`).
  - ✅ `useGameSystem` implementado con `gainXP()`, `addGold()`, `spendGold()`
  - ✅ Fórmula de nivel aplicada correctamente
- [x] **1.4. Conexión:** Conectar `TasksView` para que completar tareas de "Hoy" otorgue XP genérica.
  - ✅ Hábitos completados: +20 XP
  - ✅ Tareas completadas: +10 XP
  - ✅ Sistema de castigos (restar XP) implementado
  - ✅ Botón de reset del sistema

**Extras Implementados:**

- ✅ Sistema de oro funcional (backend completo)
- ✅ Defensive programming: 22 accesos inseguros corregidos

---

### ✅ Fase 2: Sistema de Atributos & Visualización 📊 — **COMPLETADA**

- [x] **2.1. Definición de Atributos:** Sistema de 4 stats principales
  - ✅ **STR** (Fuerza): Deporte, hábitos físicos
  - ✅ **INT** (Intelecto): Lectura, estudio, aprendizaje
  - ✅ **WIL** (Voluntad): Meditación, disciplina
  - ✅ **CRE** (Creatividad): Arte, diseño, escritura
- [x] **2.2. Selector de Atributos:** Interfaz para asignar stats a hábitos
  - ✅ Dropdown en configuración de hábitos
  - ✅ Guardado persistente en `db.json`
- [x] **2.3. Radar Chart:** Visualización gráfica de progreso
  - ✅ Gráfico de araña en `AnalyticsView`
  - ✅ Escalado dinámico según valores

---

### ✅ Fase Adicional: Sistema de Tareas Avanzado 📋 — **COMPLETADA**

> **Nota:** Esta fase no estaba en el plan original, pero se implementó para mejorar la gestión de tareas.

- [x] **A.1. Vista Global de Tareas:** `TasksView` completa
  - ✅ Listado de todas las tareas del sistema
  - ✅ Filtros por estado y fecha
- [x] **A.2. Rollover Automático:** Gestión inteligente de tareas pendientes
  - ✅ Tareas no completadas se mueven al día siguiente
  - ✅ Indicador visual de tareas rolleadas
- [x] **A.3. Calendario Interactivo:** `CalendarView` completo
  - ✅ Vista mensual con navegación
  - ✅ Indicadores de días con eventos
  - ✅ Integración con tareas
- [x] **A.4. Time Blocking:** Sistema de eventos por bloques de tiempo
  - ✅ Crear, editar y eliminar eventos
  - ✅ Visualización en calendario
- [x] **A.5. Sistema de Logros:** `AchievementsView`
  - ✅ Detección automática de hitos
  - ✅ Badges visuales para logros desbloqueados
  - ✅ Sistema de progreso por logro

---

### ✅ Fase 3: Cloud Infrastructure & Auth ☁️ — **COMPLETADA**

> **Referencia Linear:** EZE-66

- [x] **3.1. Integración de Supabase:** Configurar proyecto y conexión.
- [x] **3.2. Autenticación:** Sistema de Login y Registro funcional.
- [x] **3.3. Persistencia Real:** Migración de JSON local a PostgreSQL.
- [x] **3.4. Seguridad RLS:** Asegurar que cada usuario solo acceda a sus datos.
- [x] **3.5. UX de Sesión:** Sign Out, persistencia de cookies y middleware de protección.

---

### 🏪 Fase 4: Economía Completa (The Vault) 💰 — **PARCIAL**

> **Referencia Linear:** EZE-59, EZE-60

**Completado:**

- [x] Sistema de oro implementado en backend (`addGold`, `spendGold`)
- [x] Ganancias automáticas por completar hábitos/tareas

**Pendiente:**

- [ ] **4.1. UI de Oro en HUD:** Mostrar balance actual (EZE-59)
  - [ ] Icono de moneda en Header
  - [ ] Tooltip con historial reciente
- [ ] **4.2. Tienda (Shop):** Sistema de compras (EZE-60)
  - [ ] Catálogo de items (buffs, títulos, temas visuales)
  - [ ] Interfaz de compra/venta
  - [ ] Inventario de items comprados
- [ ] **4.3. Finanzas Reales:** Integración con tracker de gastos
  - [ ] Estructura de datos para `Transaction`
  - [ ] Widget de "Gasto Rápido"
  - [ ] Dashboard financiero (Ingresos vs Gastos)

---

### 🌟 Fase 5: Buffs & Debuffs (Sistema de Efectos) — **PENDIENTE**

> **Referencia Linear:** EZE-61, EZE-62

- [ ] **5.1. Sistema de Efectos Temporales:**
  - [ ] Estructura de datos para buffs/debuffs
  - [ ] Duración en tiempo real (ejemplo: "+10% XP por 24h")
- [ ] **5.2. Activadores Automáticos:**
  - [ ] Buff por racha de días consecutivos
  - [ ] Debuff por fallar hábitos críticos
- [ ] **5.3. UI de Efectos Activos:**
  - [ ] Panel lateral mostrando buffs/debuffs actuales
  - [ ] Iconos con tooltips descriptivos
  - [ ] Contador de tiempo restante

---

### 🧩 Fase 6: Dashboard Modular (Widgets) — **FUTURO**

- [ ] **6.1. Refactor Home:** Convertir `app/page.tsx` en un grid CSS (Bento Grid).
- [ ] **6.2. Widget Container:** Crear un wrapper genérico que permita ocultar/mostrar paneles.
- [ ] **6.3. Configuración:** Panel para activar "Modo Monje" (ocultar todo menos lo esencial).

---

### 🧘 Fase 7: Upgrade "Soul" (Bienestar) — **FUTURO**

- [ ] **7.1. Mood Selector:** Reemplazar inputs numéricos por selector de Emojis (😡 😐 🙂 🤩).
- [ ] **7.2. Motor de Correlaciones:** Crear un script de análisis que cruce `Mood` vs `Finance` (¿Gasto más cuando estoy triste?).

## 5. Criterios de Aceptación

1.  **Persistencia:** Todos los datos nuevos (XP, Finanzas) se guardan correctamente en `db.json`. ✅
2.  **Feedback Visual:** Al ganar XP, el usuario recibe feedback inmediato (toast/confetti). ✅ (Toast implementado)
3.  **Modularidad:** El código de Finanzas vive en `/components/finance` y no se mezcla con el Diario. ✅
4.  **Performance:** La carga inicial del dashboard no supera los 500ms. ✅

---

## 6. Registro de Cambios Recientes

### 2026-02-02

- ✅ **Hito Mayor:** Migración completa a la nube con Supabase.
- ✅ Implementación de sistema multi-usuario con Autenticación.
- ✅ Configuración de RLS (Row Level Security) en Base de Datos.
- ✅ Añadido soporte para "Quests" integrado con tareas.
- ✅ Proyecto renombrado oficialmente a **Life Tracker**.
- ✅ Sincronización de toda la documentación interna.

---

## 7. Deuda Técnica & Mejoras Futuras

### Prioridad Alta

- [ ] Optimización móvil y arreglo de overflow (EZE-65)
- [ ] Edición de tareas y asignación de fechas en Inbox (EZE-64)
- [ ] Completar UI de oro en HUD (Fase 4.1)
- [ ] Desarrollo del Módulo de Finanzas Personales (EZE-67)

### Prioridad Media

- [ ] Buffs/Debuffs temporales (Fase 5)
- [ ] Dashboard modular con widgets (Fase 6)
- [ ] Integración con finanzas reales (Fase 4.3)

---

## 8. Referencias y Recursos

### Documentación Interna

- `PROJECT_DOCS.md` — Arquitectura técnica completa
- `db.json` — Schema de datos principal
- Issues en Linear: `EZE-56` a `EZE-62`

### Stack Tecnológico

- **Frontend:** Next.js 14/15, React 18/19, TypeScript
- **Backend/DB:** Supabase (PostgreSQL, Auth, RLS)
- **Estilos:** Tailwind CSS
- **Gráficos:** Recharts (Radar Chart)
- **Animaciones:** Framer Motion
- **Gestión de Estado:** React Hooks + Context
- **Persistencia:** Cloud PostgreSQL (Cloud Sync activo)

---

## 9. Notas de Desarrollo

> **Filosofía del Proyecto:**
> Life Tracker busca ser más que una app de productividad; es un **sistema operativo personal** donde cada acción tiene peso y significado. La gamificación no es un gimmick, sino una herramienta psicológica para crear hábitos sostenibles.

---

**Última revisión:** 2 de Febrero de 2026 por Antigravity 🤖

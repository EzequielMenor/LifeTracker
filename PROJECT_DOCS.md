# Documentación Técnica: Life Tracker (Life OS)

**Versión:** 1.0.0  
**Fecha de Actualización:** 28 de Enero de 2026  
**Autor:** Antigravity (IA Assistant)

---

## 1. Visión General
**Life Tracker** es un "Sistema Operativo Personal" (Life OS) diseñado para centralizar la gestión de la vida diaria en una única interfaz cohesiva. A diferencia de usar apps separadas para tareas, calendario y diario, este sistema unifica estos contextos para ofrecer métricas de productividad correlacionadas.

### Propósito
- **Unificación:** Eliminar la fricción entre el "hacer" (Tareas), el "planificar" (Calendario) y el "reflexionar" (Diario).
- **Intencionalidad:** Forzar un cierre de día consciente (`completed: true`) para calcular métricas.
- **Segundo Cerebro:** Gestión de conocimiento mediante notas Markdown rápidas.

---

## 2. Arquitectura y Tecnologías

El proyecto es una aplicación web SPA (Single Page Application) construida sobre **Next.js** utilizando el App Router, pero diseñada para ejecutarse localmente con persistencia en sistema de archivos.

### Stack Tecnológico
| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | Estructura base y enrutamiento API. |
| **UI Library** | React 19 + Tailwind CSS | Componentes reactivos y estilizado utility-first. |
| **Components** | Shadcn UI | Componentes base (Cards, Dialogs, Inputs) accesibles y personalizables. |
| **Iconos** | Lucide React | Iconografía consistente y ligera. |
| **Persistencia** | JSON / FS Node.js | Base de datos local plana (`db.json`) sin dependencia de SQL/NoSQL externo. |
| **Visualización** | Recharts | Gráficos estadísticos para el módulo de analítica. |
| **Lógica Tiempo** | Date-fns | Manipulación robusta de fechas y zonas horarias. |

### Flujo de Datos
1. **Carga Inicial:** `ReflectApp.tsx` realiza un `fetch` a `/api/data`.
2. **API Route:** `app/api/data/route.ts` lee/escribe sincrónicamente en `/data/db.json`.
3. **Estado Global:** El componente raíz mantiene el estado completo en memoria y lo distribuye a los módulos (`DailyInput`, `TasksView`, etc.).
4. **Auto-Guardado:** Las modificaciones disparan actualizaciones optimistas en la UI y peticiones POST asíncronas para persistir en disco.

---

## 3. Módulos Detallados

### 3.1. Diario (Daily)
Ubicación: `components/DailyInput.tsx`

Es el núcleo de la entrada de datos diaria.
- **Lógica de Cierre:** El botón "Cerrar el día" marca la entrada como `completed: true`, bloqueando la edición de campos y disparando una animación de confeti.
- **Sistema de Hábitos:** Toggles booleanos dinámicos basados en la configuración (`data.config.habits`).
- **Métricas Cuantitativas:**
  - *Sueño:* Input numérico con coloración condicional (<6h rojo, >7.5h verde).
  - *Móvil:* Input numérico (inverso: >2h rojo, <2h verde).
- **Rollover de Tareas:** Detecta tareas incompletas (`false`) del día anterior (`subDays(now, 1)`). Si existen, muestra una alerta sugiriendo "Importar", lo que copia las claves al día actual.

### 3.2. Cerebro (Brain)
Ubicación: `components/BrainView.tsx`

Gestor de conocimiento personal (PKM) ligero.
- **Editor Híbrido:**
  - Modo *Edición*: `textarea` para escritura rápida en Markdown.
  - Modo *Vista Previa*: Renderizado seguro con `react-markdown` y `remark-gfm`.
- **Auto-Guardado:** Implementa un debounce de 1000ms (`saveTimerRef`) para evitar escrituras excesivas en disco durante la escritura.
- **Búsqueda:** Filtrado en tiempo real por título, contenido o etiquetas.

### 3.3. Planificador (Planner)
Combina dos visiones complementarias del tiempo:

#### A. Vista de Tareas (`TasksView.tsx`)
Gestión orientada a listas.
- **Categorización Automática:**
  - *Atrasadas:* Tareas no completadas de fechas anteriores a hoy (marcadas en rojo).
  - *Hoy:* Tareas asignadas a la fecha actual.
  - *Próximamente:* Tareas futuras.
- **Acciones Rápidas:** Botón "Mover a Hoy" para reprogramar tareas atrasadas con un solo clic.

#### B. Vista Calendario (`CalendarView.tsx`)
Gestión orientada a bloques de tiempo.
- **Grid Semanal:** Renderizado visual de 00:00 a 23:00.
- **Renderizado de Eventos:** Calcula la posición absoluta (`top`, `height`) basada en minutos desde medianoche:
  ```typescript
  top: (startMinutes / 1440) * 100 + "%"
  height: (duration / 1440) * 100 + "%"
  ```
- **Diferenciación:** Los "Eventos" (bloques de tiempo con color) son estructuras de datos separadas de las "Tareas" (checkboxes).

### 3.4. Analítica
Ubicación: `components/AnalyticsView.tsx`

Convierte los datos brutos en insights.
- **Rueda de la Vida (Radar):** Muestra el % de cumplimiento de cada hábito en los últimos 30 días.
- **Mapa de Calor (Heatmap):** Cuadrícula anual tipo GitHub.
  - *Algoritmo de Intensidad:* `(HábitosCompletados% * 0.8) + (TareasCompletadas% * 0.2)`. Prioriza la formación de hábitos sobre las tareas puntuales.
- **Correlación:** Gráfico lineal superponiendo "Horas de Sueño" vs "Horas de Pantalla" para detectar patrones negativos.

---

## 4. Estructura de Datos (`db.json`)

El archivo base de datos sigue este esquema JSON:

```json
{
  "config": {
    "habits": ["Madrugar", "Leer", "Deporte"],
    "goals": {
      "sleep": 7.5,
      "phone": 2.0
    }
  },
  "events": [
    {
      "id": "uuid-v4",
      "title": "Reunión",
      "startDate": "2026-01-28T10:00",
      "endDate": "2026-01-28T11:00",
      "color": "#3b82f6"
    }
  ],
  "entries": {
    "2026-01-28": {
      "completed": false,
      "habits": {
        "Madrugar": true,
        "Leer": false
      },
      "metrics": {
        "Horas de Sueño": 7.2,
        "Horas de Móvil": 1.5
      },
      "tasks": {
        "Comprar leche": false,
        "Enviar reporte": true
      },
      "review": {
        "win": "Terminé el informe",
        "fail": "Me distraje con YouTube"
      }
    }
  }
}
```

---

## 5. Ideas de Mejora (Roadmap)

Plan de desarrollo futuro para escalar el sistema:

### 🛡️ Sistema de Backup
- **Import/Export JSON:** Añadir botones en la configuración para descargar el `db.json` actual y restaurarlo desde un archivo.
- **Versionado:** Crear copias automáticas `db.backup-{date}.json` al iniciar la app.

### 🚀 Command Palette (CMD+K)
- Implementar `cmdk` para navegación global sin ratón.
- Comandos sugeridos: "Ir a Hoy", "Nueva Nota", "Buscar Tarea", "Toggle Dark Mode".

### 📱 Optimización Móvil
- Refactorizar `CalendarView` (Grid Semanal) para colapsar en pantallas pequeñas (Stack vertical en lugar de 7 columnas).
- Mejorar áreas táctiles en botones de "Habit Toggle".

### 🔗 Integración Profunda (WikiLinks)
- **Sintaxis:** Detectar `[[Nombre De Nota]]` en el editor de Diario y Tareas.
- **Linker:** Al hacer clic, navegar automáticamente a la nota correspondiente en el módulo Cerebro, creándola si no existe.
- **Contexto:** Permitir arrastrar una nota al calendario para crear un bloque de tiempo dedicado a trabajar en ella.

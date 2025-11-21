# Jeremias CRM & Kundenportal - Frontend

Moderne React-basierte Webanwendung für das Jeremias CRM-System mit integriertem Kundenportal.

## 📋 Projektbeschreibung

**Jeremias** ist ein Full-Stack CRM- und Kundenportal-System für ein Unternehmen im Bereich energietechnischer Dienstleistungen (3D-Modellierung, Heizlastberechnungen, Energieberatung, etc.).

Das Frontend bietet zwei Hauptbereiche:

### 🔧 Internes CRM (`/app`)
- **Lead-Management**: Kanban-Board mit Drag & Drop für Lead-Tracking
- **Kundenverwaltung**: Detaillierte Kundenansicht mit Pipeline-Stages
- **Projektverwaltung**: Übersicht und Verwaltung aller Kundenprojekte
- **Finanzen**: Rechnungsübersicht und Finanz-Metriken
- **Quality Control**: QC-Dashboard für Projektfreigaben
- **Projektregeln**: Konfiguration der Auto-Assignment-Regeln
- **Audio-Transkription**: Integration mit Azure OpenAI Whisper

### 👤 Kundenportal (`/portal`)
- **Dashboard**: Übersicht über eigene Projekte und Rechnungen
- **Projekte**: Einsicht in alle beauftragten Projekte mit Nachrichten-Funktion
- **Neue Bestellung**: Formular für neue Projektbestellungen
- **Rechnungen**: Übersicht über alle Rechnungen
- **Account-Verwaltung**: Profil und Einstellungen

## 🚀 Setup & Installation

### Voraussetzungen
- Node.js (v18 oder höher)
- npm oder bun

### Installation

```sh
# Repository klonen
git clone https://github.com/FlowEdgeSolutions/jeremiasCrmFrontend.git

# In das Projektverzeichnis wechseln
cd jeremiasCrmFrontend

# Dependencies installieren
npm install
# oder
bun install

# Development-Server starten
npm run dev
# oder
bun run dev
```

Das Frontend läuft dann auf: **http://localhost:5173**

### Backend-Verbindung

Das Frontend benötigt eine laufende Backend-API. Die API-URL ist konfiguriert in:
- `src/lib/apiClient.ts` → `API_BASE_URL`
- Standard: `http://localhost:8080/api`

## 🛠️ Technologie-Stack

Dieses Projekt nutzt moderne Web-Technologien:

### Core
- **React 18** - UI-Framework
- **TypeScript** - Type-Safe JavaScript
- **Vite** - Schneller Build-Tool & Dev-Server

### Styling & UI
- **Tailwind CSS** - Utility-First CSS Framework
- **Shadcn/UI** - Komponentenbibliothek basierend auf Radix UI
- **Lucide React** - Icon-System

### State Management & Routing
- **React Router v6** - Client-Side Routing
- **TanStack Query (React Query)** - Server State Management
- **Context API** - Globaler State (Auth, Theme)

### Formulare & Validierung
- **React Hook Form** - Formular-Management
- **Zod** - Schema-Validierung

### Weitere Libraries
- **@dnd-kit** - Drag & Drop für Kanban-Board
- **Sonner** - Toast-Benachrichtigungen
- **date-fns** - Datums-Utilities
- **Recharts** - Diagramme & Charts

## 📁 Projektstruktur

```
src/
├── components/
│   ├── layouts/          # Layout-Komponenten (AppLayout, PortalLayout)
│   ├── ui/               # Shadcn/UI Komponenten
│   ├── KanbanBoard.tsx   # Drag & Drop Kanban
│   └── StatCard.tsx      # Dashboard-Karten
├── contexts/
│   ├── AuthContext.tsx   # Authentifizierungs-State
│   └── ThemeContext.tsx  # Theme (Dark/Light Mode)
├── lib/
│   ├── apiClient.ts      # REST API Client
│   └── utils.ts          # Utility-Funktionen
├── pages/
│   ├── app/              # Interne CRM-Seiten
│   └── portal/           # Kundenportal-Seiten
├── types/
│   └── index.ts          # TypeScript-Typdefinitionen
└── App.tsx               # Haupt-App-Komponente mit Routing
```

## 🎨 Features

- ✅ **Dark/Light Mode** - Theme-Toggle
- ✅ **Responsive Design** - Mobile, Tablet, Desktop
- ✅ **Rollenbasierte Navigation** - Admin, Sales, Project Member, Customer
- ✅ **Drag & Drop Kanban** - Lead-Management
- ✅ **Real-time Updates** - React Query
- ✅ **Form Validation** - Zod Schema Validation
- ✅ **Toast Notifications** - Benutzer-Feedback
- ✅ **Collapsible Sidebar** - Platzsparendes Design

## 🔧 Verfügbare Scripts

```bash
# Development-Server starten
npm run dev

# Production-Build erstellen
npm run build

# Production-Build testen
npm run preview

# Linting
npm run lint
```

## 🔗 Backend-Integration

Das Frontend kommuniziert mit dem FastAPI-Backend über REST API.

**Backend-Repository**: [FlowEdgeSolutions/jeremiasCrmBackend](https://github.com/FlowEdgeSolutions/jeremiasCrmBackend)

**API-Endpunkte**:
- `/api/auth` - Authentifizierung
- `/api/leads` - Lead-Management
- `/api/customers` - Kundenverwaltung
- `/api/projects` - Projektverwaltung
- `/api/invoices` - Rechnungswesen
- `/api/qc` - Quality Control

## 📝 Lizenz

© 2024 FlowEdge Solutions. Alle Rechte vorbehalten.

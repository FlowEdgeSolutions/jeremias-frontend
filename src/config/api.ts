/**
 * Zentrale API-Konfiguration
 * 
 * Diese Datei enthält alle API-bezogenen Konfigurationen.
 * Die API-URL wird automatisch basierend auf der Umgebung gesetzt:
 * - Production (crm.team-noah.de): Railway Backend
 * - Lokal: http://127.0.0.1:8080/api
 */

// Automatische Erkennung der Umgebung
const getApiBaseUrl = (): string => {
  // 1. Umgebungsvariable hat höchste Priorität
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 2. Production-Domain erkennen
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Production: crm.team-noah.de → Railway Backend
    if (hostname === 'crm.team-noah.de' || hostname.includes('vercel.app')) {
      return 'https://web-production-c1490.up.railway.app/api';
    }
  }
  
  // 3. Fallback für lokale Entwicklung
  return 'http://127.0.0.1:8080/api';
};

export const API_CONFIG = {
  // Backend API Base URL - automatisch basierend auf Umgebung
  BASE_URL: getApiBaseUrl(),
  
  // Timeout für API-Requests (in Millisekunden)
  TIMEOUT: 30000,
} as const;

// Token-Schlüssel für localStorage
export const TOKEN_KEY = "jeremia_token";

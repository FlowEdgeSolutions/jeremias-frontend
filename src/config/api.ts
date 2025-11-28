/**
 * Zentrale API-Konfiguration
 * 
 * Diese Datei enthält alle API-bezogenen Konfigurationen.
 * Die API-URL wird aus der Umgebungsvariable VITE_API_URL gelesen.
 * Lokal: http://127.0.0.1:8080/api
 * Production: Deine Railway-Backend-URL
 */

export const API_CONFIG = {
  // Backend API Base URL - aus Umgebungsvariable oder Fallback für lokale Entwicklung
  BASE_URL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8080/api",
  
  // Timeout für API-Requests (in Millisekunden)
  TIMEOUT: 30000,
} as const;

// Token-Schlüssel für localStorage
export const TOKEN_KEY = "jeremia_token";

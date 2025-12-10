/**
 * Email Accounts API Client
 * 
 * Unified API for managing email accounts (Gmail, Microsoft, etc.)
 * Uses the new /api/email/accounts endpoints
 */

import { API_CONFIG, TOKEN_KEY } from "@/config/api";
import type { 
  EmailAccount, 
  EmailAccountsListResponse, 
  ConnectAccountResponse,
  EmailProvider 
} from "@/types";

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
});

const BASE_URL = `${API_CONFIG.BASE_URL}/email/accounts`;

/**
 * List all email accounts for the current user
 */
export async function listEmailAccounts(
  options?: { includeDisconnected?: boolean; includeSystem?: boolean }
): Promise<EmailAccountsListResponse> {
  const params = new URLSearchParams();
  if (options?.includeDisconnected) {
    params.append("include_disconnected", "true");
  }
  if (options?.includeSystem !== undefined) {
    params.append("include_system", String(options.includeSystem));
  }
  
  const url = `${BASE_URL}${params.toString() ? `?${params}` : ""}`;
  
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("Fehler beim Laden der E-Mail-Konten");
  }
  
  return response.json();
}

/**
 * Get a single email account by ID
 */
export async function getEmailAccount(accountId: string): Promise<EmailAccount> {
  const response = await fetch(`${BASE_URL}/${accountId}`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("E-Mail-Konto nicht gefunden");
  }
  
  return response.json();
}

/**
 * Initiate OAuth flow to connect a new email account
 * Returns auth URL for redirect
 */
export async function connectEmailAccount(
  provider: EmailProvider
): Promise<ConnectAccountResponse> {
  const response = await fetch(`${BASE_URL}/connect`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ provider }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Verbindung fehlgeschlagen" }));
    throw new Error(error.detail || "Fehler beim Verbinden");
  }
  
  return response.json();
}

/**
 * Set an email account as primary for sending
 */
export async function setPrimaryAccount(accountId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/${accountId}/set-primary`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("Fehler beim Setzen des primären Kontos");
  }
}

/**
 * Reconnect an account that needs re-authentication
 * Returns auth URL for redirect
 */
export async function reconnectEmailAccount(
  accountId: string
): Promise<ConnectAccountResponse> {
  const response = await fetch(`${BASE_URL}/${accountId}/reconnect`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Wiederverbindung fehlgeschlagen" }));
    throw new Error(error.detail || "Fehler beim Wiederverbinden");
  }
  
  return response.json();
}

/**
 * Disconnect an email account (soft delete)
 */
export async function disconnectEmailAccount(accountId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/${accountId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("Fehler beim Trennen des Kontos");
  }
}

/**
 * Get detailed status of an email account
 */
export async function getAccountStatus(
  accountId: string,
  refresh = false
): Promise<{
  account_id: string;
  email: string;
  provider: EmailProvider;
  status: string;
  status_display: string;
  is_connected: boolean;
  needs_reauth: boolean;
  last_status_check: string | null;
  last_error: string | null;
}> {
  const url = refresh 
    ? `${BASE_URL}/${accountId}/status?refresh=true`
    : `${BASE_URL}/${accountId}/status`;
    
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("Fehler beim Laden des Kontostatus");
  }
  
  return response.json();
}

// ============= Legacy API Compatibility =============
// These functions maintain backwards compatibility with the old Gmail/Microsoft APIs

/**
 * Check connection status (legacy - combines both providers)
 */
export async function checkConnectionStatus(): Promise<{
  isConnected: boolean;
  accounts: EmailAccount[];
  gmailAccounts: EmailAccount[];
  microsoftAccounts: EmailAccount[];
}> {
  const data = await listEmailAccounts();
  
  return {
    isConnected: data.has_connected_accounts,
    accounts: data.accounts,
    gmailAccounts: data.accounts.filter(a => a.provider === "gmail"),
    microsoftAccounts: data.accounts.filter(a => a.provider === "microsoft"),
  };
}

/**
 * Get Gmail auth URL (legacy - uses new unified connect)
 */
export async function getGmailAuthUrl(): Promise<string> {
  const data = await connectEmailAccount("gmail");
  return data.auth_url;
}

/**
 * Get Microsoft auth URL (legacy - uses new unified connect)
 */
export async function getMicrosoftAuthUrl(): Promise<string> {
  const data = await connectEmailAccount("microsoft");
  return data.auth_url;
}


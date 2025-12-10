import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { API_CONFIG, TOKEN_KEY } from "@/config/api";

export const EmailCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verbinde E-Mail-Konto...");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        setStatus("error");
        setMessage(errorDescription || "Verbindung abgebrochen");
        toast.error(errorDescription || "E-Mail-Verbindung abgebrochen");
        setTimeout(() => navigate("/app/emails"), 2000);
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("Kein Autorisierungscode erhalten");
        toast.error("Kein Autorisierungscode erhalten");
        setTimeout(() => navigate("/app/emails"), 2000);
        return;
      }

      try {
        // Determine provider from URL parameters or try both endpoints
        // Microsoft uses 'session_state' parameter, Gmail doesn't
        const sessionState = searchParams.get("session_state");
        const isMicrosoft = sessionState !== null;
        
        const endpoint = isMicrosoft 
          ? `${API_CONFIG.BASE_URL}/microsoft-mail/callback`
          : `${API_CONFIG.BASE_URL}/gmail/callback`;
        
        setMessage(isMicrosoft ? "Verbinde Microsoft-Konto..." : "Verbinde Gmail-Konto...");
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          },
          body: JSON.stringify({ 
            code,
            state: state || undefined
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Fehler beim Verbinden");
        }

        setStatus("success");
        setMessage(`${data.email} erfolgreich verbunden!`);
        toast.success(`${data.email || "E-Mail-Konto"} erfolgreich verbunden!`);
        
        // Short delay to show success message
        setTimeout(() => navigate("/app/emails"), 1500);
      } catch (error) {
        console.error("Callback error:", error);
        setStatus("error");
        const errorMsg = error instanceof Error ? error.message : "Fehler beim Verbinden";
        setMessage(errorMsg);
        toast.error(errorMsg);
        setTimeout(() => navigate("/app/emails"), 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        {status === "loading" && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        )}
        {status === "success" && (
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {status === "error" && (
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        <p className={status === "error" ? "text-red-600" : status === "success" ? "text-green-600" : ""}>
          {message}
        </p>
      </div>
    </div>
  );
};

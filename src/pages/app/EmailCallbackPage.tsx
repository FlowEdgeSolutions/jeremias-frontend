import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export const EmailCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (error) {
        toast.error("Gmail-Verbindung abgebrochen");
        navigate("/app/emails");
        return;
      }

      if (!code) {
        toast.error("Kein Autorisierungscode erhalten");
        navigate("/app/emails");
        return;
      }

      try {
        // Send code to backend
        const response = await fetch("http://127.0.0.1:8080/api/gmail/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error("Fehler beim Verbinden");
        }

        toast.success("Gmail erfolgreich verbunden!");
        navigate("/app/emails");
      } catch (error) {
        console.error("Callback error:", error);
        toast.error("Fehler beim Verbinden mit Gmail");
        navigate("/app/emails");
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Verbinde Gmail-Konto...</p>
      </div>
    </div>
  );
};

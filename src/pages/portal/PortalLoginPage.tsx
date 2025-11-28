import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const PortalLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  if (currentUser) {
    const from = (location.state as any)?.from?.pathname;
    if (currentUser.role === "customer") {
      navigate(from || "/portal/dashboard", { replace: true });
    } else {
      navigate("/app/leads", { replace: true });
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      
      // Get the page user was trying to access, or default based on role
      const from = (location.state as any)?.from?.pathname;
      // Navigation happens in useEffect after user state is updated
      const user = await fetch('http://127.0.0.1:8080/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jeremia_token')}`
        }
      }).then(r => r.json());
      
      if (user.role === "customer") {
        navigate(from || "/portal/dashboard");
      } else {
        navigate("/app/leads");
      }
    } catch (error) {
      // Error toast already shown by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Kundenportal Login</CardTitle>
          <CardDescription>
            Melden Sie sich mit Ihren Zugangsdaten an
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="ihre@email.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Anmelden..." : "Anmelden"}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Noch keinen Zugang? Kontaktieren Sie uns.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

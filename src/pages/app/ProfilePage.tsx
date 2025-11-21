import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/apiClient";
import { User, Mail, Phone, Shield, Calendar, Edit2, Save, X } from "lucide-react";

export const ProfilePage = () => {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setPhone(currentUser.phone || "");
    }
  }, [currentUser]);

  const handleSave = async () => {
    try {
      setLoading(true);
      // TODO: Implement update user endpoint
      await apiClient.auth.me(); // Placeholder
      toast.success("Profil erfolgreich aktualisiert!");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setPhone(currentUser.phone || "");
    }
    setIsEditing(false);
  };

  if (!currentUser) {
    return null;
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-primary text-primary-foreground";
      case "sales":
        return "bg-accent text-accent-foreground";
      case "project_member":
        return "bg-info text-info-foreground";
      case "customer":
        return "bg-success text-success-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "sales":
        return "Vertrieb";
      case "project_member":
        return "Projektmitarbeiter";
      case "customer":
        return "Kunde";
      default:
        return role;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mein Profil</h1>
        <p className="text-muted-foreground mt-2">
          Verwalte deine persönlichen Informationen
        </p>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 text-2xl">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(currentUser.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">{currentUser.name}</h2>
              <p className="text-muted-foreground">{currentUser.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getRoleBadgeColor(currentUser.role)}>
                  {getRoleLabel(currentUser.role)}
                </Badge>
                {currentUser.is_active ? (
                  <Badge variant="outline" className="text-success border-success">
                    Aktiv
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-destructive border-destructive">
                    Inaktiv
                  </Badge>
                )}
              </div>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit2 className="h-4 w-4 mr-2" />
                Bearbeiten
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Persönliche Informationen</CardTitle>
          <CardDescription>
            {isEditing
              ? "Bearbeite deine persönlichen Daten"
              : "Deine registrierten Informationen"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                <User className="h-4 w-4 inline mr-2" />
                Name
              </Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dein Name"
                />
              ) : (
                <p className="text-foreground font-medium py-2">{currentUser.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="h-4 w-4 inline mr-2" />
                E-Mail
              </Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  disabled
                />
              ) : (
                <p className="text-foreground font-medium py-2">{currentUser.email}</p>
              )}
              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  E-Mail kann nicht geändert werden
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="h-4 w-4 inline mr-2" />
                Telefon
              </Label>
              {isEditing ? (
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 123 456789"
                />
              ) : (
                <p className="text-foreground font-medium py-2">
                  {currentUser.phone || "Nicht angegeben"}
                </p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>
                <Shield className="h-4 w-4 inline mr-2" />
                Rolle
              </Label>
              <p className="text-foreground font-medium py-2">
                {getRoleLabel(currentUser.role)}
              </p>
            </div>
          </div>

          {/* Account Info */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3">Account-Informationen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Erstellt: {new Date(currentUser.created_at).toLocaleDateString("de-DE")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Aktualisiert: {new Date(currentUser.updated_at).toLocaleDateString("de-DE")}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </Button>
              <Button onClick={handleCancel} variant="outline" disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                Abbrechen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sicherheit</CardTitle>
          <CardDescription>Passwort und Sicherheitseinstellungen</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            Passwort ändern
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

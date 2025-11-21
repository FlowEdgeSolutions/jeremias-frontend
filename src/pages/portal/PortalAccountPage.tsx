import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const PortalAccountPage = () => {
  const { currentUser } = useAuth();
  const [companyName, setCompanyName] = useState(currentUser?.name || "");
  const [address, setAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [discount, setDiscount] = useState("0");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Replace with actual API call
    toast.success("Account-Daten gespeichert!");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mein Account</h1>
        <p className="text-muted-foreground mt-2">
          Verwalten Sie Ihre Firmendaten und Einstellungen
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Firmendaten</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Firmenname</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ihr Firmenname"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Straße, Hausnummer, PLZ, Ort"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPerson">Ansprechpartner</Label>
              <Input
                id="contactPerson"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Vor- und Nachname"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefonnummer</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+49 ..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Standard-Rabatt (%)</Label>
              <Input
                id="discount"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                disabled
              />
              <p className="text-sm text-muted-foreground">
                Nur zur Anzeige. Kontaktieren Sie uns für Rabatt-Änderungen.
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline">
                Abbrechen
              </Button>
              <Button type="submit">
                Speichern
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

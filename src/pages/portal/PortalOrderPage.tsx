import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Statische Produktoptionen (später aus API laden)
const productOptions = [
  { code: "3DMODEL", name: "3D-Modell", description: "Detailliertes 3D-Modell des Gebäudes" },
  { code: "HEIZLAST", name: "Heizlastberechnung", description: "Professionelle Heizlastberechnung nach DIN" },
  { code: "GRUNDRISS", name: "Grundrissplanung", description: "Digitale Grundrisse und Pläne" },
  { code: "PAKET", name: "Komplett-Paket", description: "Alle Services in einem Paket" },
];

export const PortalOrderPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [address, setAddress] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [livingArea, setLivingArea] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const product = productOptions.find(p => p.code === selectedProduct);
    if (!product || !currentUser) return;

    try {
      setSubmitting(true);
      
      // TODO: Implement actual order creation API
      // For now, show a success message
      toast.success("Bestellung erfolgreich aufgegeben! Wir werden uns bald bei Ihnen melden.");
      navigate("/portal/projects");
    } catch (err) {
      console.error("Failed to submit order:", err);
      toast.error("Fehler beim Aufgeben der Bestellung");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Neue Bestellung</h1>
        <p className="text-muted-foreground mt-2">
          Füllen Sie das Formular aus, um eine neue Bestellung aufzugeben
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bestellformular</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="product">Produkt auswählen</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct} required>
                <SelectTrigger>
                  <SelectValue placeholder="Wählen Sie ein Produkt..." />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((product) => (
                    <SelectItem key={product.code} value={product.code}>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Objektadresse</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Straße, Hausnummer, PLZ, Ort"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buildingType">Gebäudetyp</Label>
                <Select value={buildingType} onValueChange={setBuildingType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="einfamilienhaus">Einfamilienhaus</SelectItem>
                    <SelectItem value="mehrfamilienhaus">Mehrfamilienhaus</SelectItem>
                    <SelectItem value="gewerbe">Gewerbe</SelectItem>
                    <SelectItem value="sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="livingArea">Wohnfläche (m²)</Label>
                <Input
                  id="livingArea"
                  type="number"
                  value={livingArea}
                  onChange={(e) => setLivingArea(e.target.value)}
                  placeholder="z.B. 150"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Anmerkungen</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Zusätzliche Informationen oder besondere Wünsche..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Dateien hochladen</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Hausbilder, Grundrisse, Schnitte, etc.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate("/portal/dashboard")}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Bestellung absenden
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

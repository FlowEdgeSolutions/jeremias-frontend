import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { customersApi, projectsApi, usersApi } from "@/lib/apiClient";
import { Customer, Segment, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Upload, X } from "lucide-react";

const PRODUCT_OPTIONS = [
  { code: "HEIZLAST", name: "Heizlast", allowCustomCredits: true },
  { code: "HEIZLAST_HYDRAULISCH", name: "Heizlast, hydraulischer Abgleich", allowCustomCredits: true },
  { code: "ISFP_ERSTELLUNG", name: "iSFP Erstellung", allowCustomCredits: true },
  { code: "INDIVIDUELL", name: "Individuell", allowCustomCredits: true },
];

const SPECIFICATION_OPTIONS = [
  { label: "1 bis 2 WE (649€ netto)", net_price: "649.00", units: "1-2" },
  { label: "3 bis 5 WE (799€ netto)", net_price: "799.00", units: "3-5" },
  { label: "6 bis 9 WE (949€ netto)", net_price: "949.00", units: "6-9" },
  { label: "10 bis 13 WE (1199€ netto)", net_price: "1199.00", units: "10-13" },
  { label: "14 bis 17 WE (1249€ netto)", net_price: "1249.00", units: "14-17" },
  { label: "18 bis 22 WE (1499€ netto)", net_price: "1499.00", units: "18-22" },
  { label: "Mehr als 22 WE (Sie erhalten ein individuelles Angebot)", net_price: "", units: "22+" },
];

const SPECIFICATION_OPTIONS_HEIZLAST = [
  { label: "1 bis 2 WE (449€ netto)", net_price: "449.00", units: "1-2" },
  { label: "3 bis 5 WE (599€ netto)", net_price: "599.00", units: "3-5" },
  { label: "6 bis 9 WE (749€ netto)", net_price: "749.00", units: "6-9" },
  { label: "10 bis 13 WE (999€ netto)", net_price: "999.00", units: "10-13" },
  { label: "14 bis 17 WE (1049€ netto)", net_price: "1049.00", units: "14-17" },
  { label: "18 bis 22 WE (1199€ netto)", net_price: "1199.00", units: "18-22" },
  { label: "Mehr als 22 WE (sie erhalten ein individuelles Angebot)", net_price: "", units: "22+" },
];

export const CreateProjectPage = () => {
  const navigate = useNavigate();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: "",
    product_code: "",
    product_name: "",
    product_specification: "",
    net_price: "",
    processing_days: "",
    credits: "",
    content: "",
    assigned_user_id: "",
  });
  
  const [allowCustomCredits, setAllowCustomCredits] = useState(false);
  const [showSpecificationDropdown, setShowSpecificationDropdown] = useState(false);
  const [showSpecificationInput, setShowSpecificationInput] = useState(false);
  const [currentSpecOptions, setCurrentSpecOptions] = useState(SPECIFICATION_OPTIONS);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  useEffect(() => {
    loadCustomers();
    loadEmployees();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await customersApi.getCustomers();
      setCustomers(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Laden der Kunden: " + message);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await usersApi.getUsers();
      setEmployees(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Laden der Mitarbeiter: " + message);
    }
  };

  const handleProductChange = (productCode: string) => {
    const product = PRODUCT_OPTIONS.find(p => p.code === productCode);
    if (product) {
      setFormData({
        ...formData,
        product_code: productCode,
        product_name: product.name,
        product_specification: "",
        net_price: "", // Reset when product changes
        credits: "",
      });
      setAllowCustomCredits(product.allowCustomCredits);
      
      // Show dropdown for "Heizlast" or "Heizlast, hydraulischer Abgleich"
      if (productCode === "HEIZLAST") {
        setShowSpecificationDropdown(true);
        setShowSpecificationInput(false);
        setCurrentSpecOptions(SPECIFICATION_OPTIONS_HEIZLAST);
      } else if (productCode === "HEIZLAST_HYDRAULISCH") {
        setShowSpecificationDropdown(true);
        setShowSpecificationInput(false);
        setCurrentSpecOptions(SPECIFICATION_OPTIONS);
      } else if (productCode === "ISFP_ERSTELLUNG" || productCode === "INDIVIDUELL") {
        // Show input field for iSFP and Individuell
        setShowSpecificationDropdown(false);
        setShowSpecificationInput(true);
      } else {
        setShowSpecificationDropdown(false);
        setShowSpecificationInput(false);
      }
    }
  };

  const handleSpecificationChange = (specLabel: string) => {
    const spec = currentSpecOptions.find(s => s.label === specLabel);
    if (spec) {
      const calculatedCredits = spec.net_price ? Math.ceil(parseFloat(spec.net_price) / 30).toString() : "";
      setFormData({
        ...formData,
        product_specification: specLabel,
        net_price: spec.net_price, // Auto-fill price
        credits: calculatedCredits, // Auto-calculate credits
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...filesArray]);
      toast.success(`${filesArray.length} Datei(en) hinzugefügt`);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    toast.info("Datei entfernt");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id || !formData.product_code || !formData.assigned_user_id) {
      toast.error("Bitte fülle alle Pflichtfelder aus (Kunde, Produkt und Mitarbeiter)");
      return;
    }

    try {
      setLoading(true);
      const project = await projectsApi.createProject({
        customer_id: formData.customer_id,
        product_code: formData.product_code,
        product_name: formData.product_name,
        product_specification: formData.product_specification || undefined,
        net_price: formData.net_price || undefined,
        processing_days: formData.processing_days ? parseInt(formData.processing_days) : undefined,
        credits: formData.credits || undefined,
        content: formData.content || undefined,
        assigned_user_id: formData.assigned_user_id,
      });
      
      toast.success(`Projekt erfolgreich angelegt! Projektnummer: ${project.project_number}`);
      navigate(`/app/projects/${project.id}`);
    } catch (error: unknown) {
      console.error("Error creating project:", error);
      let message = "Unbekannter Fehler";
      
      if (error instanceof Error) {
        if (error.message === "Failed to fetch") {
          message = "Backend nicht erreichbar. Bitte stelle sicher, dass das Backend auf Port 8000 läuft.";
        } else {
          message = error.message;
        }
      }
      
      toast.error("Fehler beim Anlegen: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Neues Projekt anlegen</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="customer">Kunde *</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
              >
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Kunde auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex flex-col">
                        <span>{customer.name}</span>
                        {customer.company_name && (
                          <span className="text-xs text-muted-foreground">{customer.company_name}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Produkt *</Label>
              <Select
                value={formData.product_code}
                onValueChange={handleProductChange}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder="Produkt auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_OPTIONS.map((product) => (
                    <SelectItem key={product.code} value={product.code}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee">Mitarbeiter *</Label>
              <Select
                value={formData.assigned_user_id}
                onValueChange={(value) => setFormData({ ...formData, assigned_user_id: value })}
              >
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Mitarbeiter auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex flex-col">
                        <span>{employee.name}</span>
                        <span className="text-xs text-muted-foreground">{employee.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showSpecificationDropdown && (
              <div className="space-y-2">
                <Label htmlFor="product_specification">Produktspezifikation</Label>
                <Select
                  value={formData.product_specification}
                  onValueChange={handleSpecificationChange}
                >
                  <SelectTrigger id="product_specification">
                    <SelectValue placeholder="Wie viel Wohneinheiten hat das Objekt?" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentSpecOptions.map((spec) => (
                      <SelectItem key={spec.label} value={spec.label}>
                        {spec.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showSpecificationInput && (
              <div className="space-y-2">
                <Label htmlFor="product_specification_input">Produktspezifikation</Label>
                <Input
                  id="product_specification_input"
                  value={formData.product_specification}
                  onChange={(e) => setFormData({ ...formData, product_specification: e.target.value })}
                  placeholder="z.B. Detaillierte Spezifikation eingeben..."
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="net_price">Netto Preis (€)</Label>
                <Input
                  id="net_price"
                  type="number"
                  step="0.01"
                  value={formData.net_price}
                  onChange={(e) => {
                    const price = e.target.value;
                    const calculatedCredits = price ? Math.ceil(parseFloat(price) / 30).toString() : "";
                    setFormData({ 
                      ...formData, 
                      net_price: price,
                      credits: calculatedCredits
                    });
                  }}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="processing_days">Bearbeitungszeit (Tage)</Label>
                <Input
                  id="processing_days"
                  type="number"
                  value={formData.processing_days}
                  onChange={(e) => setFormData({ ...formData, processing_days: e.target.value })}
                  placeholder="z.B. 5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                step="0.01"
                value={formData.credits}
                disabled={!allowCustomCredits}
                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                className={!allowCustomCredits ? "bg-muted" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {allowCustomCredits 
                  ? "Credits können manuell eingegeben werden" 
                  : "Automatisch berechnet: Netto Preis / 30"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Freitext</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                placeholder="Zusätzliche Informationen zum Projekt..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file_upload">Dateien hochladen</Label>
              <div className="border-2 border-dashed rounded-lg p-6">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <Label htmlFor="file_upload" className="cursor-pointer text-primary hover:underline">
                      Dateien auswählen
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      oder Dateien hierher ziehen
                    </p>
                  </div>
                  <Input
                    id="file_upload"
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">{uploadedFiles.length} Datei(en) ausgewählt:</p>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                {loading ? "Wird angelegt..." : "Projekt anlegen"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { customersApi, projectsApi, usersApi } from "@/lib/apiClient";
import { Customer, Segment, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Plus, Upload, X, Mail, Pencil, ChevronDown, Trash2, Search, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatProjectName } from "@/lib/projectName";

// Default product options
const DEFAULT_PRODUCT_OPTIONS = [
  { code: "HEIZLAST", name: "Heizlast", allowCustomCredits: true },
  { code: "HEIZLAST_HYDRAULISCH", name: "Heizlast, hydraulischer Abgleich", allowCustomCredits: true },
  { code: "ISFP_ERSTELLUNG", name: "iSFP Erstellung", allowCustomCredits: true },
  { code: "INDIVIDUELL", name: "Individuell", allowCustomCredits: true },
];

// Default specification options
const DEFAULT_SPECIFICATION_OPTIONS = [
  { label: "1 bis 2 WE (649€ netto)", net_price: "649.00", units: "1-2" },
  { label: "3 bis 5 WE (799€ netto)", net_price: "799.00", units: "3-5" },
  { label: "6 bis 9 WE (949€ netto)", net_price: "949.00", units: "6-9" },
  { label: "10 bis 13 WE (1199€ netto)", net_price: "1199.00", units: "10-13" },
  { label: "14 bis 17 WE (1249€ netto)", net_price: "1249.00", units: "14-17" },
  { label: "18 bis 22 WE (1499€ netto)", net_price: "1499.00", units: "18-22" },
  { label: "Mehr als 22 WE (Sie erhalten ein individuelles Angebot)", net_price: "", units: "22+" },
];

const DEFAULT_SPECIFICATION_OPTIONS_HEIZLAST = [
  { label: "1 bis 2 WE (449€ netto)", net_price: "449.00", units: "1-2" },
  { label: "3 bis 5 WE (599€ netto)", net_price: "599.00", units: "3-5" },
  { label: "6 bis 9 WE (749€ netto)", net_price: "749.00", units: "6-9" },
  { label: "10 bis 13 WE (999€ netto)", net_price: "999.00", units: "10-13" },
  { label: "14 bis 17 WE (1049€ netto)", net_price: "1049.00", units: "14-17" },
  { label: "18 bis 22 WE (1199€ netto)", net_price: "1199.00", units: "18-22" },
  { label: "Mehr als 22 WE (sie erhalten ein individuelles Angebot)", net_price: "", units: "22+" },
];

// LocalStorage keys
const STORAGE_KEY_PRODUCTS = "jeremias_product_options";
const STORAGE_KEY_SPECS = "jeremias_specification_options";
const STORAGE_KEY_SPECS_HEIZLAST = "jeremias_specification_options_heizlast";

// Helper functions for LocalStorage
const loadProducts = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    return stored ? JSON.parse(stored) : DEFAULT_PRODUCT_OPTIONS;
  } catch {
    return DEFAULT_PRODUCT_OPTIONS;
  }
};

const saveProducts = (products: typeof DEFAULT_PRODUCT_OPTIONS) => {
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  } catch (error) {
    console.error("Failed to save products:", error);
  }
};

const loadSpecs = (key: string, defaultSpecs: typeof DEFAULT_SPECIFICATION_OPTIONS) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultSpecs;
  } catch {
    return defaultSpecs;
  }
};

const saveSpecs = (key: string, specs: typeof DEFAULT_SPECIFICATION_OPTIONS) => {
  try {
    localStorage.setItem(key, JSON.stringify(specs));
  } catch (error) {
    console.error("Failed to save specs:", error);
  }
};

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
    // Objektadresse
    project_street: "",
    project_zip_code: "",
    project_city: "",
    project_country: "Deutschland",
  });
  const [sendOrderConfirmation, setSendOrderConfirmation] = useState(true);

  const [productOptions, setProductOptions] = useState(loadProducts());
  const [allowCustomCredits, setAllowCustomCredits] = useState(false);
  const [showSpecificationDropdown, setShowSpecificationDropdown] = useState(false);
  const [showSpecificationInput, setShowSpecificationInput] = useState(false);
  const [useCustomSpecification, setUseCustomSpecification] = useState(false);
  const [currentSpecOptions, setCurrentSpecOptions] = useState(() =>
    loadSpecs(STORAGE_KEY_SPECS, DEFAULT_SPECIFICATION_OPTIONS)
  );
  const [heizlastSpecOptions, setHeizlastSpecOptions] = useState(() =>
    loadSpecs(STORAGE_KEY_SPECS_HEIZLAST, DEFAULT_SPECIFICATION_OPTIONS_HEIZLAST)
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // User (Employee) search state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);

  // Customer search state (optional but helpful)
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);

  // Edit specification inline state
  const [isSpecDropdownOpen, setIsSpecDropdownOpen] = useState(false);
  const specDropdownRef = useRef<HTMLDivElement>(null);
  const [editingInlineIndex, setEditingInlineIndex] = useState<number | null>(null);
  const [inlineEditLabel, setInlineEditLabel] = useState("");
  const [inlineEditPrice, setInlineEditPrice] = useState("");

  // Add new product/specification state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [isAddingSpec, setIsAddingSpec] = useState(false);
  const [newSpecLabel, setNewSpecLabel] = useState("");
  const [newSpecPrice, setNewSpecPrice] = useState("");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (specDropdownRef.current && !specDropdownRef.current.contains(event.target as Node)) {
        setIsSpecDropdownOpen(false);
      }
    };

    if (isSpecDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSpecDropdownOpen]);

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
    const product = productOptions.find(p => p.code === productCode);
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
        setUseCustomSpecification(false);
        setCurrentSpecOptions(heizlastSpecOptions);
      } else if (productCode === "HEIZLAST_HYDRAULISCH") {
        setShowSpecificationDropdown(true);
        setShowSpecificationInput(false);
        setUseCustomSpecification(false);
        const specs = loadSpecs(STORAGE_KEY_SPECS, DEFAULT_SPECIFICATION_OPTIONS);
        setCurrentSpecOptions(specs);
      } else if (productCode === "ISFP_ERSTELLUNG" || productCode === "INDIVIDUELL") {
        // Show input field for iSFP and Individuell
        setShowSpecificationDropdown(false);
        setShowSpecificationInput(true);
        setUseCustomSpecification(false);
      } else {
        setShowSpecificationDropdown(false);
        setShowSpecificationInput(false);
        setUseCustomSpecification(false);
      }
    }
  };

  const handleEditSpecification = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    const spec = currentSpecOptions[index];
    setEditingInlineIndex(index);
    setInlineEditLabel(spec.label);
    setInlineEditPrice(spec.net_price);
  };

  const handleSaveInlineEdit = (index: number) => {
    const updatedOptions = [...currentSpecOptions];
    const oldSpec = updatedOptions[index];
    updatedOptions[index] = {
      ...updatedOptions[index],
      label: inlineEditLabel,
      net_price: inlineEditPrice,
    };
    setCurrentSpecOptions(updatedOptions);

    // Save to LocalStorage - determine which spec list we're editing
    const isHeizlast = formData.product_code === "HEIZLAST";
    if (isHeizlast) {
      setHeizlastSpecOptions(updatedOptions);
      saveSpecs(STORAGE_KEY_SPECS_HEIZLAST, updatedOptions);
    } else {
      saveSpecs(STORAGE_KEY_SPECS, updatedOptions);
    }

    // Update form data if this specification was already selected
    if (formData.product_specification === oldSpec.label) {
      const calculatedCredits = inlineEditPrice ? Math.ceil(parseFloat(inlineEditPrice) / 30).toString() : "";
      setFormData({
        ...formData,
        product_specification: inlineEditLabel,
        net_price: inlineEditPrice,
        credits: calculatedCredits,
      });
    }

    setEditingInlineIndex(null);
    toast.success("Spezifikation aktualisiert");
  };

  const handleCancelInlineEdit = () => {
    setEditingInlineIndex(null);
    setInlineEditLabel("");
    setInlineEditPrice("");
  };

  const handleDeleteSpecification = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm("Möchten Sie diese Spezifikation wirklich löschen?")) {
      const updatedOptions = currentSpecOptions.filter((_, i) => i !== index);
      setCurrentSpecOptions(updatedOptions);

      // Save to LocalStorage
      const isHeizlast = formData.product_code === "HEIZLAST";
      if (isHeizlast) {
        setHeizlastSpecOptions(updatedOptions);
        saveSpecs(STORAGE_KEY_SPECS_HEIZLAST, updatedOptions);
      } else {
        saveSpecs(STORAGE_KEY_SPECS, updatedOptions);
      }

      // Clear form data if deleted spec was selected
      if (formData.product_specification === currentSpecOptions[index].label) {
        setFormData({
          ...formData,
          product_specification: "",
          net_price: "",
          credits: "",
        });
      }

      toast.success("Spezifikation gelöscht");
    }
  };

  const handleAddSpecification = () => {
    if (!newSpecLabel.trim()) {
      toast.error("Bitte geben Sie eine Bezeichnung ein");
      return;
    }

    const newSpec = {
      label: newSpecLabel,
      net_price: newSpecPrice || "",
      units: "",
    };

    const updatedOptions = [...currentSpecOptions, newSpec];
    setCurrentSpecOptions(updatedOptions);

    // Save to LocalStorage
    const isHeizlast = formData.product_code === "HEIZLAST";
    if (isHeizlast) {
      setHeizlastSpecOptions(updatedOptions);
      saveSpecs(STORAGE_KEY_SPECS_HEIZLAST, updatedOptions);
    } else {
      saveSpecs(STORAGE_KEY_SPECS, updatedOptions);
    }

    setNewSpecLabel("");
    setNewSpecPrice("");
    setIsAddingSpec(false);
    toast.success("Spezifikation hinzugefügt");
  };

  const handleAddProduct = () => {
    if (!newProductName.trim() || !newProductCode.trim()) {
      toast.error("Bitte geben Sie Name und Code ein");
      return;
    }

    // Check if code already exists
    const existingProduct = productOptions.find(p => p.code === newProductCode.toUpperCase());
    if (existingProduct) {
      // Update existing product
      const updatedProducts = productOptions.map(p =>
        p.code === newProductCode.toUpperCase()
          ? { ...p, name: newProductName }
          : p
      );
      setProductOptions(updatedProducts);
      saveProducts(updatedProducts);
      toast.success("Produkt aktualisiert");
    } else {
      // Add new product
      const newProduct = {
        code: newProductCode.toUpperCase(),
        name: newProductName,
        allowCustomCredits: true,
      };

      const updatedProducts = [...productOptions, newProduct];
      setProductOptions(updatedProducts);
      saveProducts(updatedProducts);
      toast.success("Produkt hinzugefügt");
    }

    setNewProductName("");
    setNewProductCode("");
    setIsAddingProduct(false);
  };

  const handleDeleteProduct = (productCode: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm("Möchten Sie dieses Produkt wirklich löschen?")) {
      const updatedProducts = productOptions.filter(p => p.code !== productCode);
      setProductOptions(updatedProducts);
      saveProducts(updatedProducts);

      // Clear form if deleted product was selected
      if (formData.product_code === productCode) {
        setFormData({
          ...formData,
          product_code: "",
          product_name: "",
          product_specification: "",
          net_price: "",
          credits: "",
        });
        setShowSpecificationDropdown(false);
        setShowSpecificationInput(false);
      }

      toast.success("Produkt gelöscht");
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

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
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
      const projectName = formatProjectName({
        productName: formData.product_name || formData.product_code,
        street: formData.project_street,
        zipCode: formData.project_zip_code,
        city: formData.project_city,
      });
      const project = await projectsApi.createProject({
        customer_id: formData.customer_id,
        product_code: formData.product_code,
        product_name: projectName,
        product_specification: formData.product_specification || undefined,
        net_price: formData.net_price || undefined,
        processing_days: formData.processing_days ? parseInt(formData.processing_days) : undefined,
        credits: formData.credits || undefined,
        content: formData.content || undefined,
        assigned_user_id: formData.assigned_user_id,
        send_order_confirmation: sendOrderConfirmation,
        // Objektadresse
        project_street: formData.project_street || undefined,
        project_zip_code: formData.project_zip_code || undefined,
        project_city: formData.project_city || undefined,
        project_country: formData.project_country || undefined,
      });

      // Show success message with order confirmation status
      if (sendOrderConfirmation) {
        if (project.order_confirmation_sent) {
          toast.success(`Projekt erfolgreich angelegt! Projektnummer: ${project.project_number}. Auftragsbestätigung wurde an den Kunden gesendet.`);
        } else {
          toast.success(`Projekt erfolgreich angelegt! Projektnummer: ${project.project_number}`);
          toast.warning("Auftragsbestätigung konnte nicht gesendet werden. Bitte stellen Sie sicher, dass Sie ein Microsoft-Konto unter E-Mails verbunden haben.");
        }
      } else {
        toast.success(`Projekt erfolgreich angelegt! Projektnummer: ${project.project_number}`);
      }
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
              <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isCustomerPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.customer_id
                      ? customers.find((c) => c.id === formData.customer_id)?.name || "Kunde auswählen..."
                      : "Kunde auswählen..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                      className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Kunde suchen..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    />
                  </div>
                  <ScrollArea className="h-72">
                    <div className="p-1">
                      {customers
                        .filter((c) =>
                          c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                          (c.company_name && c.company_name.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                        )
                        .map((customer) => (
                          <div
                            key={customer.id}
                            className={cn(
                              "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              formData.customer_id === customer.id && "bg-accent"
                            )}
                            onClick={() => {
                              setFormData({ ...formData, customer_id: customer.id });
                              setIsCustomerPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.customer_id === customer.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{customer.name}</span>
                              {customer.company_name && (
                                <span className="text-xs text-muted-foreground">{customer.company_name}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      {customers.filter((c) =>
                        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                        (c.company_name && c.company_name.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                      ).length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">Kein Kunde gefunden.</div>
                        )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="product">Produkt *</Label>
                {!isAddingProduct && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingProduct(true);
                      setNewProductName("");
                      setNewProductCode("");
                    }}
                    className="h-8 w-8 p-0"
                    title="Neues Produkt hinzufügen"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {isAddingProduct ? (
                <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                  <Input
                    value={newProductCode}
                    onChange={(e) => setNewProductCode(e.target.value)}
                    placeholder="Produktcode (z.B. NEUES_PRODUKT)"
                    className="h-8"
                  />
                  <Input
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="Produktname"
                    className="h-8"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 flex-1"
                      onClick={handleAddProduct}
                    >
                      Speichern
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 flex-1"
                      onClick={() => {
                        setIsAddingProduct(false);
                        setNewProductName("");
                        setNewProductCode("");
                      }}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <Select
                  value={formData.product_code}
                  onValueChange={handleProductChange}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Produkt auswählen..." />
                  </SelectTrigger>
                  <SelectContent className="min-w-[350px]">
                    {productOptions.map((product) => (
                      <SelectItem key={product.code} value={product.code} className="pr-2">
                        <div className="flex items-center w-full min-w-[300px] group">
                          <span className="flex-1 truncate pr-4">{product.name}</span>
                          <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleDeleteProduct(product.code, e)}
                              title="Produkt löschen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee">Mitarbeiter *</Label>
              <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isUserPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.assigned_user_id
                      ? employees.find((e) => e.id === formData.assigned_user_id)?.name || "Mitarbeiter auswählen..."
                      : "Mitarbeiter auswählen..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                      className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Mitarbeiter suchen..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                  </div>
                  <ScrollArea className="h-72">
                    <div className="p-1">
                      {employees
                        .filter((e) =>
                          e.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          e.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                        )
                        .map((employee) => (
                          <div
                            key={employee.id}
                            className={cn(
                              "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              formData.assigned_user_id === employee.id && "bg-accent"
                            )}
                            onClick={() => {
                              setFormData({ ...formData, assigned_user_id: employee.id });
                              setIsUserPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.assigned_user_id === employee.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{employee.name}</span>
                              <span className="text-xs text-muted-foreground">{employee.email}</span>
                            </div>
                          </div>
                        ))}
                      {employees.filter((e) =>
                        e.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                        e.email.toLowerCase().includes(userSearchQuery.toLowerCase())
                      ).length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">Kein Mitarbeiter gefunden.</div>
                        )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            {showSpecificationDropdown && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="product_specification">Produktspezifikation</Label>
                  {!isAddingSpec && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAddingSpec(true);
                        setNewSpecLabel("");
                        setNewSpecPrice("");
                      }}
                      className="h-8 w-8 p-0"
                      title="Neue Spezifikation hinzufügen"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {isAddingSpec && (
                  <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                    <Input
                      value={newSpecLabel}
                      onChange={(e) => setNewSpecLabel(e.target.value)}
                      placeholder="Bezeichnung (z.B. 1 bis 2 WE (649€ netto))"
                      className="h-8"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={newSpecPrice}
                      onChange={(e) => setNewSpecPrice(e.target.value)}
                      placeholder="Netto Preis (€)"
                      className="h-8"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 flex-1"
                        onClick={handleAddSpecification}
                      >
                        Speichern
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 flex-1"
                        onClick={() => {
                          setIsAddingSpec(false);
                          setNewSpecLabel("");
                          setNewSpecPrice("");
                        }}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}
                <div className="relative" ref={specDropdownRef}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setIsSpecDropdownOpen(!isSpecDropdownOpen)}
                  >
                    <span className={formData.product_specification ? "" : "text-muted-foreground"}>
                      {formData.product_specification || "Wie viel Wohneinheiten hat das Objekt?"}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isSpecDropdownOpen ? "rotate-180" : ""}`} />
                  </Button>
                  {isSpecDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
                      {currentSpecOptions.map((spec, index) => (
                        <div
                          key={index}
                          className={`p-2 ${editingInlineIndex !== index ? 'hover:bg-accent cursor-pointer group' : 'bg-accent'}`}
                          onClick={() => {
                            if (editingInlineIndex !== index) {
                              handleSpecificationChange(spec.label);
                              setIsSpecDropdownOpen(false);
                            }
                          }}
                        >
                          {editingInlineIndex === index ? (
                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={inlineEditLabel}
                                onChange={(e) => setInlineEditLabel(e.target.value)}
                                placeholder="Bezeichnung"
                                className="h-8"
                                autoFocus
                              />
                              <Input
                                type="number"
                                step="0.01"
                                value={inlineEditPrice}
                                onChange={(e) => setInlineEditPrice(e.target.value)}
                                placeholder="Preis (€)"
                                className="h-8"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 flex-1"
                                  onClick={() => handleSaveInlineEdit(index)}
                                >
                                  Speichern
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 flex-1"
                                  onClick={handleCancelInlineEdit}
                                >
                                  Abbrechen
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center w-full">
                              <span className="flex-1 truncate pr-4">{spec.label}</span>
                              <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-accent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSpecification(index, e);
                                  }}
                                  title="Spezifikation bearbeiten"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                  onClick={(e) => handleDeleteSpecification(index, e)}
                                  title="Spezifikation löschen"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {showSpecificationInput && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="product_specification_input">Produktspezifikation</Label>
                  {useCustomSpecification && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUseCustomSpecification(false);
                        setShowSpecificationInput(false);
                        setShowSpecificationDropdown(true);
                        // Clear the specification when switching back to dropdown
                        setFormData({
                          ...formData,
                          product_specification: "",
                          net_price: "",
                          credits: "",
                        });
                      }}
                      className="h-8 text-xs"
                      title="Zurück zur Auswahl"
                    >
                      Zurück zur Auswahl
                    </Button>
                  )}
                </div>
                <Input
                  id="product_specification_input"
                  value={formData.product_specification}
                  onChange={(e) => setFormData({ ...formData, product_specification: e.target.value })}
                  placeholder={useCustomSpecification ? "Eigene Spezifikation eingeben (wird in Angebot und Rechnung übernommen)..." : "z.B. Detaillierte Spezifikation eingeben..."}
                />
                {useCustomSpecification && (
                  <p className="text-xs text-muted-foreground">
                    Dieser Text wird in das Angebot und die Rechnung übernommen.
                  </p>
                )}
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
              {allowCustomCredits && (
                <p className="text-xs text-muted-foreground">
                  Credits können manuell eingegeben werden
                </p>
              )}
            </div>

            {/* Objektadresse */}
            <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
              <h3 className="font-medium text-sm text-muted-foreground">Objektadresse</h3>

              <div className="space-y-2">
                <Label htmlFor="project_street">Straße + Hausnummer</Label>
                <Input
                  id="project_street"
                  value={formData.project_street}
                  onChange={(e) => setFormData({ ...formData, project_street: e.target.value })}
                  placeholder="z.B. Musterstraße 123"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project_zip_code">PLZ</Label>
                  <Input
                    id="project_zip_code"
                    value={formData.project_zip_code}
                    onChange={(e) => setFormData({ ...formData, project_zip_code: e.target.value })}
                    placeholder="12345"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="project_city">Stadt</Label>
                  <Input
                    id="project_city"
                    value={formData.project_city}
                    onChange={(e) => setFormData({ ...formData, project_city: e.target.value })}
                    placeholder="z.B. Berlin"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_country">Land</Label>
                <Input
                  id="project_country"
                  value={formData.project_country}
                  onChange={(e) => setFormData({ ...formData, project_country: e.target.value })}
                  placeholder="z.B. Deutschland"
                />
              </div>
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

            {/* Order confirmation email checkbox */}
            <div className="flex items-center gap-3 rounded-lg border p-4 bg-muted/30">
              <Checkbox
                id="send_order_confirmation"
                checked={sendOrderConfirmation}
                onCheckedChange={(checked) => setSendOrderConfirmation(checked === true)}
              />
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="send_order_confirmation" className="font-medium cursor-pointer">
                  Auftragsbestätigung per E-Mail senden
                </Label>
                <p className="text-sm text-muted-foreground">
                  Die Auftragsbestätigung (Angebot) wird an den Kunden gesendet.
                </p>
              </div>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file_upload">Dateien hochladen</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 transition-colors ${isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload className={`h-8 w-8 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
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

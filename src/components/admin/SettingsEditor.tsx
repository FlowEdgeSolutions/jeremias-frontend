import { useEffect, useState } from "react";
import { apiClient, SystemSetting } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Plus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export const SettingsEditor = () => {
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(false);

    // Edit/Create dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        key: "",
        value: "",
        description: "",
        is_secret: false
    });
    const [saving, setSaving] = useState(false);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await apiClient.admin.getSettings();
            setSettings(data);
        } catch (error) {
            toast.error("Einstellungen konnten nicht geladen werden.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleEdit = (setting: SystemSetting) => {
        setEditingKey(setting.key);
        setFormData({
            key: setting.key,
            value: setting.value, // This might be masked "********" if secret
            description: setting.description || "",
            is_secret: setting.is_secret
        });
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingKey(null);
        setFormData({ key: "", value: "", description: "", is_secret: false });
        setIsDialogOpen(true);
    };

    const handleDelete = async (key: string) => {
        if (!confirm(`Einstellung "${key}" wirklich löschen?`)) return;

        try {
            await apiClient.admin.deleteSetting(key);
            toast.success("Einstellung gelöscht");
            fetchSettings();
        } catch (error) {
            toast.error("Fehler beim Löschen");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (editingKey) {
                // Update
                // Don't send value if it's masked and hasn't changed (user didn't touch it)
                const isMasked = settings.find(s => s.key === editingKey)?.is_secret && formData.value === "********";
                const updateData: any = {
                    description: formData.description,
                    is_secret: formData.is_secret
                };

                if (!isMasked) {
                    updateData.value = formData.value;
                }

                await apiClient.admin.updateSetting(editingKey, updateData);
                toast.success("Gespeichert");
            } else {
                // Create
                await apiClient.admin.createSetting(formData);
                toast.success("Erstellt");
            }
            setIsDialogOpen(false);
            fetchSettings();
        } catch (error: any) {
            toast.error("Fehler beim Speichern: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Konfiguration (API Keys)</h3>
                <Button onClick={handleCreate} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Einstellung
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Key</TableHead>
                            <TableHead>Beschreibung</TableHead>
                            <TableHead>Wert</TableHead>
                            <TableHead className="w-[100px]">Aktionen</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">Laden...</TableCell>
                            </TableRow>
                        ) : settings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Keine Einstellungen gefunden.</TableCell>
                            </TableRow>
                        ) : (
                            settings.map((setting) => (
                                <TableRow key={setting.key}>
                                    <TableCell className="font-mono font-medium">{setting.key}</TableCell>
                                    <TableCell>{setting.description}</TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {setting.is_secret ? (
                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Secret</Badge>
                                        ) : (
                                            <span className="text-muted-foreground truncate max-w-[200px] block" title={setting.value}>{setting.value}</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(setting)}>
                                                <span className="sr-only">Bearbeiten</span>
                                                <Save className="h-4 w-4" /> {/* Actually reusing save icon for edit/open dialog is slightly confusing visually but okay for now, ideally Pencil */}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(setting.key)}>
                                                <span className="sr-only">Löschen</span>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingKey ? "Einstellung bearbeiten" : "Neue Einstellung"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="key">Key (z.B. SEVDESK_API_TOKEN)</Label>
                            <Input
                                id="key"
                                value={formData.key}
                                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                                disabled={!!editingKey}
                                placeholder="KEY_NAME"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="value">Wert</Label>
                            <Input
                                id="value"
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                type={formData.is_secret ? "password" : "text"}
                                placeholder="Wert eingeben..."
                            />
                            {editingKey && settings.find(s => s.key === editingKey)?.is_secret && (
                                <p className="text-xs text-muted-foreground">Lassen Sie "********" stehen, um den Wert nicht zu ändern.</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Beschreibung</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional: Wofür ist dieser Key?"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_secret"
                                checked={formData.is_secret}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_secret: checked === true })}
                            />
                            <Label htmlFor="is_secret">Ist geheim (wird maskiert angezeigt)</Label>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Speichern
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

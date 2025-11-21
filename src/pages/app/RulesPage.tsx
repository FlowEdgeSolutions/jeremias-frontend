import { useState, useEffect } from "react";
import { ProjectRule, User } from "@/types";
import { apiClient } from "@/api/mockApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const RulesPage = () => {
  const [rules, setRules] = useState<ProjectRule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [rulesData, usersData] = await Promise.all([
      apiClient.getProjectRules(),
      apiClient.getUsers(),
    ]);
    setRules(rulesData);
    setUsers(usersData.filter(u => u.role !== "customer"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Replace with actual API call
    await apiClient.createProjectRule({
      productCode,
      productName,
      assignedUserIds: selectedUserIds,
    });

    toast.success("Projektregel erstellt!");
    setIsDialogOpen(false);
    setProductCode("");
    setProductName("");
    setSelectedUserIds([]);
    loadData();
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Projektregeln</h2>
          <p className="text-muted-foreground mt-1">
            Legen Sie fest, welche Mitarbeiter automatisch Projekten zugeordnet werden
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neue Regel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Projektregel</DialogTitle>
              <DialogDescription>
                Definieren Sie eine Regel für die automatische Zuweisung von Mitarbeitern
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productCode">Produktcode</Label>
                <Input
                  id="productCode"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="z.B. 3DMODEL"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">Produktname</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="z.B. 3D-Modell"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Zugeordnete Mitarbeiter</Label>
                <div className="space-y-2">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleUser(user.id)}
                        className="rounded"
                      />
                      <span>{user.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit">Erstellen</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Produktcode</TableHead>
              <TableHead className="whitespace-nowrap">Produktname</TableHead>
              <TableHead className="whitespace-nowrap">Zugeordnete Mitarbeiter</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium whitespace-nowrap">{rule.productCode}</TableCell>
                <TableCell className="whitespace-nowrap">{rule.productName}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {rule.assignedUserIds.map((userId) => {
                      const user = users.find(u => u.id === userId);
                      return user ? (
                        <Badge key={userId} variant="secondary">
                          {user.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Circle, Loader2 } from "lucide-react";
import * as emailAccountsApi from "@/lib/emailAccountsApi";
import type { EmailAccount } from "@/types";
import { toast } from "sonner";

export function EmailAccountStatus() {
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);

    const requiredAccounts = [
        { email: "jv@team-noah.de", purpose: "Manuelle E-Mails" },
        { email: "info@team-noah.de", purpose: "Automatische E-Mails" }
    ];

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            setLoading(true);
            const data = await emailAccountsApi.listEmailAccounts();
            setAccounts(data.accounts);
        } catch (error) {
            console.error("Failed to load email accounts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (email: string) => {
        try {
            setConnecting(email);
            const data = await emailAccountsApi.connectEmailAccount("microsoft");
            if (data.auth_url) {
                window.location.href = data.auth_url;
            }
        } catch (error: any) {
            toast.error(error.message || "Verbindung fehlgeschlagen");
            setConnecting(null);
        }
    };

    const getAccountStatus = (email: string) => {
        const account = accounts.find(acc => acc.email?.toLowerCase() === email.toLowerCase());
        return account;
    };

    const isConnected = (email: string) => {
        const account = getAccountStatus(email);
        return account?.status === "active";
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    E-Mail Accounts
                </CardTitle>
                <CardDescription>
                    Status der verbundenen Microsoft-Konten
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {requiredAccounts.map((req) => {
                            const connected = isConnected(req.email);
                            const account = getAccountStatus(req.email);

                            return (
                                <div
                                    key={req.email}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <Circle
                                            className={`h-3 w-3 fill-current ${connected
                                                    ? "text-green-500"
                                                    : "text-red-500"
                                                }`}
                                        />
                                        <div>
                                            <div className="font-mono text-sm font-medium">
                                                {req.email}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {req.purpose}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {connected ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                Verbunden
                                            </Badge>
                                        ) : (
                                            <>
                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                    Nicht verbunden
                                                </Badge>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleConnect(req.email)}
                                                    disabled={connecting === req.email}
                                                >
                                                    {connecting === req.email && (
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    )}
                                                    Verbinden
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

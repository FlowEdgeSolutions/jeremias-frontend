import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient, DetailedHealth } from "@/lib/apiClient";
import { HealthStatus } from "@/components/admin/HealthStatus";
import { LogViewer } from "@/components/admin/LogViewer";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
import { Activity, Server, Settings, FileText } from "lucide-react";

export const AdminPage = () => {
    const [health, setHealth] = useState<DetailedHealth | null>(null);

    const fetchHealth = async () => {
        try {
            const data = await apiClient.admin.getDetailedHealth();
            setHealth(data);
        } catch (error) {
            console.error("Health check failed", error);
        }
    };

    useEffect(() => {
        fetchHealth();
        // Refresh health every 30s
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Status</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">
                            {health?.system.status || "Checking..."}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {health?.system.message}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Logs</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Active</div>
                        <p className="text-xs text-muted-foreground">
                            Logging to app.log
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">
                        <Activity className="h-4 w-4 mr-2" />
                        Übersicht & Health
                    </TabsTrigger>
                    <TabsTrigger value="settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Einstellungen & API Keys
                    </TabsTrigger>
                    <TabsTrigger value="logs">
                        <FileText className="h-4 w-4 mr-2" />
                        Logs
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Service Status Details</CardTitle>
                            <CardDescription>
                                Status der verbundenen Dienste und Datenbanken.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {health ? (
                                <div className="grid gap-4 md:grid-cols-2">
                                    <HealthStatus label="Datenbank" health={health.database} />
                                    <HealthStatus label="Sevdesk API" health={health.sevdesk} />
                                    <HealthStatus label="Microsoft Graph" health={health.microsoft} />
                                    <HealthStatus label="Backend System" health={health.system} />
                                </div>
                            ) : (
                                <div className="text-center py-4">Lade Status...</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <SettingsEditor />
                </TabsContent>

                <TabsContent value="logs" className="space-y-4">
                    <LogViewer />
                </TabsContent>
            </Tabs>
        </div>
    );
};

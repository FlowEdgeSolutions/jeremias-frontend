import { ServiceHealth } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface HealthStatusProps {
    label: string;
    health: ServiceHealth;
}

export const HealthStatus = ({ label, health }: HealthStatusProps) => {
    const getIcon = () => {
        switch (health.status) {
            case "healthy":
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case "warning":
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case "unhealthy":
                return <XCircle className="h-5 w-5 text-red-500" />;
        }
    };

    const getVariant = () => {
        switch (health.status) {
            case "healthy":
                return "default";
            case "warning":
                return "secondary"; // Assuming 'secondary' or similar for warning, otherwise customization needed
            case "unhealthy":
                return "destructive";
        }
    };

    // Custom badge styling if variant doesn't match perfectly
    const getBadgeClass = () => {
        switch (health.status) {
            case "healthy":
                return "bg-green-100 text-green-800 hover:bg-green-200 border-green-200";
            case "warning":
                return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200";
            case "unhealthy":
                return "bg-red-100 text-red-800 hover:bg-red-200 border-red-200";
        }
    }

    return (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-3">
                {getIcon()}
                <div>
                    <h4 className="font-semibold text-sm">{label}</h4>
                    <p className="text-xs text-muted-foreground">{health.message}</p>
                </div>
            </div>

            <Badge variant="outline" className={getBadgeClass()}>
                {health.status.toUpperCase()}
            </Badge>
        </div>
    );
};

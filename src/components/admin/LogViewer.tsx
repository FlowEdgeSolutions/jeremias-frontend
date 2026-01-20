import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const LogViewer = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [lines, setLines] = useState(200);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await apiClient.admin.getLogs(lines);
            setLogs(data.logs);
        } catch (error) {
            toast.error("Logs konnten nicht geladen werden.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();

        // Auto refresh every 10 seconds
        const interval = setInterval(fetchLogs, 10000);
        return () => clearInterval(interval);
    }, [lines]);

    const getLogColor = (line: string) => {
        if (line.includes("ERROR")) return "text-red-500 font-bold";
        if (line.includes("WARNING")) return "text-yellow-600";
        if (line.includes("INFO")) return "text-blue-500";
        return "text-muted-foreground";
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">System Logs</h3>
                <div className="flex items-center gap-2">
                    <select
                        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                        value={lines}
                        onChange={(e) => setLines(Number(e.target.value))}
                    >
                        <option value="100">100 Zeilen</option>
                        <option value="500">500 Zeilen</option>
                        <option value="1000">1000 Zeilen</option>
                    </select>
                    <Button size="sm" variant="outline" onClick={fetchLogs} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-slate-950 p-4 font-mono text-xs">
                <ScrollArea className="h-[600px] w-full">
                    <div className="space-y-1">
                        {logs.length === 0 ? (
                            <p className="text-muted-foreground text-center py-10">Keine Logs verfügbar.</p>
                        ) : (
                            logs.map((log, index) => (
                                <div key={index} className={`whitespace-pre-wrap break-words border-b border-white/5 py-0.5 ${getLogColor(log)}`}>
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};

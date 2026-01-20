import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/apiClient';
import { Loader2, CheckCircle2, XCircle, Search, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function MicrosoftDebugger() {
    const [email, setEmail] = useState('jv@team-noah.de');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const checkUser = async () => {
        if (!email) return;
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const data = await apiClient.admin.checkMicrosoftUser(email);
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Error checking user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Microsoft Graph User Lookup
                    </CardTitle>
                    <CardDescription>
                        Verify if a user exists in the configured Microsoft Tenant (Azure AD).
                        This uses the app-only credentials (Client ID/Secret) configured in Settings.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 items-end">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="email">User Email / UPN</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="user@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && checkUser()}
                            />
                        </div>
                        <Button onClick={checkUser} disabled={loading || !email}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                'Check User'
                            )}
                        </Button>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {result && (
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                {result.exists ? (
                                    <div className="flex items-center text-green-600 font-medium">
                                        <CheckCircle2 className="h-5 w-5 mr-2" />
                                        User Found
                                    </div>
                                ) : (
                                    <div className="flex items-center text-red-600 font-medium">
                                        <XCircle className="h-5 w-5 mr-2" />
                                        User Not Found
                                    </div>
                                )}
                            </div>

                            {result.exists && (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="p-3 bg-muted rounded-md">
                                        <span className="font-medium block text-muted-foreground">Display Name</span>
                                        {result.details?.displayName || '-'}
                                    </div>
                                    <div className="p-3 bg-muted rounded-md">
                                        <span className="font-medium block text-muted-foreground">User Principal Name</span>
                                        {result.user_principal_name}
                                    </div>
                                    <div className="p-3 bg-muted rounded-md">
                                        <span className="font-medium block text-muted-foreground">Mail</span>
                                        {result.mail || <span className="text-yellow-600 italic">Not set</span>}
                                    </div>
                                    <div className="p-3 bg-muted rounded-md">
                                        <span className="font-medium block text-muted-foreground">ID</span>
                                        {result.user_id}
                                    </div>
                                </div>
                            )}

                            {!result.exists && result.error && (
                                <div className="p-3 bg-red-50 text-red-900 rounded-md text-sm border border-red-200">
                                    {result.error}
                                </div>
                            )}

                            {result.details && (
                                <div className="mt-4">
                                    <Label className="mb-2 block">Raw Response</Label>
                                    <pre className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-auto text-xs max-h-60">
                                        {JSON.stringify(result.details, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

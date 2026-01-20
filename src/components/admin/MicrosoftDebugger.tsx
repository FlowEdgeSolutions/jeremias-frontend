import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/apiClient';
import * as emailAccountsApi from '@/lib/emailAccountsApi';
import { Loader2, CheckCircle2, XCircle, Search, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function MicrosoftDebugger() {
    const [email, setEmail] = useState('jv@team-noah.de');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [accountCheck, setAccountCheck] = useState<any>(null);

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

    const handleConnectAccount = async () => {
        try {
            setLoading(true);
            const data = await emailAccountsApi.connectEmailAccount("microsoft");
            if (data.auth_url) {
                window.location.href = data.auth_url;
            }
        } catch (err: any) {
            setError(err.message || 'Error initiating connection');
        } finally {
            setLoading(false);
        }
    };

    const checkAccounts = async () => {
        try {
            setLoading(true);
            setAccountCheck(null);
            const response = await fetch('/api/admin/debug/microsoft/check-accounts', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setAccountCheck(data);
        } catch (err: any) {
            setError(err.message || 'Error checking accounts');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                                <Search className="h-5 w-5" />
                                Microsoft Graph User Lookup
                            </CardTitle>
                            <CardDescription>
                                Verify if a user exists in the configured Microsoft Tenant (Azure AD).
                                This uses the app-only credentials (Client ID/Secret) configured in Settings.
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={checkAccounts} disabled={loading}>
                                Verify Accounts
                            </Button>
                            <Button variant="outline" onClick={handleConnectAccount} disabled={loading}>
                                Connect Microsoft Account
                            </Button>
                        </div>
                    </div>
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

            {accountCheck && (
                <Card>
                    <CardHeader>
                        <CardTitle>Connected Account Verification</CardTitle>
                        <CardDescription>
                            Verifies that stored email addresses match the actual Microsoft accounts
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {accountCheck.accounts?.map((acc: any) => (
                                <div key={acc.account_id} className="p-4 border rounded-lg">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium text-muted-foreground">Stored Email:</span>
                                            <div className="font-mono">{acc.stored_email}</div>
                                        </div>
                                        <div>
                                            <span className="font-medium text-muted-foreground">Actual Email:</span>
                                            <div className="font-mono">{acc.actual_email || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <span className="font-medium text-muted-foreground">Display Name:</span>
                                            <div>{acc.display_name || '-'}</div>
                                        </div>
                                        <div>
                                            <span className="font-medium text-muted-foreground">Status:</span>
                                            <div className="flex items-center gap-2">
                                                {acc.match ? (
                                                    <>
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                        <span className="text-green-600">Match</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="h-4 w-4 text-red-600" />
                                                        <span className="text-red-600">Mismatch!</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {!acc.match && (
                                        <Alert variant="destructive" className="mt-3">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Email Mismatch Detected</AlertTitle>
                                            <AlertDescription>
                                                The stored email ({acc.stored_email}) does not match the actual connected account ({acc.actual_email || 'unknown'}).
                                                This will cause sending errors. Please reconnect this account.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

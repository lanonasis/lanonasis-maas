import React, { useCallback, useEffect, useState } from 'react';
import { Key, Plus, RefreshCw, Trash2, AlertCircle, ExternalLink, ShieldPlus } from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

interface ApiKeySummary {
  id: string;
  name: string;
  scope: string;
  lastUsed: string;
}

interface ApiKeyManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyManager({ isOpen, onClose }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const postMessage = useCallback((type: string, data?: unknown) => {
    window.vscode?.postMessage({ type, data });
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);
    postMessage('getApiKeys');
  }, [postMessage]);

  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen, refresh]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message?.type) {
        case 'apiKeys':
          setKeys(Array.isArray(message.data) ? message.data : []);
          setIsLoading(false);
          break;
        case 'apiKeyError':
          setError(typeof message.data === 'string' ? message.data : 'An error occurred');
          setIsLoading(false);
          break;
        case 'apiKeyCreated':
        case 'apiKeyDeleted':
          // Server already refreshes and re-sends 'apiKeys' before this arrives.
          setPendingDeleteId(null);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleDelete = (keyId: string) => {
    if (pendingDeleteId !== keyId) {
      setPendingDeleteId(keyId);
      return;
    }
    postMessage('deleteApiKey', keyId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
            <Badge variant="secondary">{keys.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 px-1 pb-2">
          <Button variant="ghost" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={cnSpin(isLoading)} />
          </Button>
          <Button variant="default" size="sm" onClick={() => postMessage('createApiKey')}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Key
          </Button>
          <Button variant="outline" size="sm" onClick={() => postMessage('storeApiKey')}>
            <ShieldPlus className="h-3.5 w-3.5 mr-1" />
            Use Existing
          </Button>
          <Button variant="ghost" size="sm" onClick={() => postMessage('manageApiKeys')}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>

        {error && (
          <div className="mx-1 mb-2 p-2 rounded bg-[var(--vscode-inputValidation-errorBackground)] text-[var(--vscode-inputValidation-errorForeground)] flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-[var(--vscode-descriptionForeground)]">
              Loading...
            </div>
          ) : keys.length === 0 ? (
            <div className="p-4 text-center text-sm text-[var(--vscode-descriptionForeground)]">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No API keys found</p>
            </div>
          ) : (
            <div className="space-y-1 px-1">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between gap-2 p-2 rounded border border-[var(--vscode-panel-border)]"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{key.name}</div>
                    <div className="text-xs text-[var(--vscode-descriptionForeground)] truncate">
                      {key.scope} · {key.lastUsed}
                    </div>
                  </div>
                  <Button
                    variant={pendingDeleteId === key.id ? 'destructive' : 'ghost'}
                    size="sm"
                    onClick={() => handleDelete(key.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {pendingDeleteId === key.id ? ' Confirm' : ''}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function cnSpin(isLoading: boolean): string {
  return `h-3.5 w-3.5${isLoading ? ' animate-spin' : ''}`;
}

export default ApiKeyManager;

'use client';

import * as React from 'react';
import { Sun, Moon, Monitor, Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const;

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [hasKey, setHasKey] = React.useState<boolean | null>(null);
  const [apiKeyInput, setApiKeyInput] = React.useState('');
  const [showKey, setShowKey] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (open) {
      setApiKeyInput('');
      setShowKey(false);
      setError(null);
      setIsLoading(false);

      fetch('/api/settings/api-key', { credentials: 'include' })
        .then((res) => res.json())
        .then((data: { hasKey: boolean }) => setHasKey(data.hasKey))
        .catch(() => setHasKey(null));
    }
  }, [open]);

  const handleSave = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed || !trimmed.startsWith('sk-ant-')) {
      setError('Please enter a valid Anthropic API key starting with sk-ant-');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/settings/api-key', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: trimmed }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error || 'Failed to save API key');
        return;
      }

      setHasKey(true);
      setApiKeyInput('');
    } catch {
      setError('Failed to save API key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await fetch('/api/settings/api-key', {
        method: 'DELETE',
        credentials: 'include',
      });
      setHasKey(false);
    } catch {
      setError('Failed to remove API key');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your preferences.</DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Appearance</p>
            <p className="text-xs text-muted-foreground">Choose your preferred theme</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map(({ value, label, icon: Icon }) => {
              const isActive = mounted && theme === value;

              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border-2 px-3 py-3',
                    'transition-all duration-150 cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive
                      ? 'border-primary bg-accent text-accent-foreground shadow-sm'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">API Key</p>
            <p className="text-xs text-muted-foreground">
              Your Anthropic API key for chat
            </p>
          </div>

          {hasKey ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">API key saved</span>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={handleRemove}
                className="ml-auto text-destructive hover:text-destructive"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-ant-..."
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    if (error) setError(null);
                  }}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className={cn(
                    'absolute right-2 top-1/2 -translate-y-1/2',
                    'text-muted-foreground hover:text-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'rounded p-1'
                  )}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button size="sm" disabled={isLoading} onClick={handleSave}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { usePlayer } from '@/contexts/PlayerContext';
import { useSettings, useUpdateSetting } from '@/api/hooks/useServer';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';

interface MapImageStatus {
  source: 'upload' | 'url' | 'none';
  url?: string;
  mime?: string;
}

function useMapImageStatus() {
  return useQuery<MapImageStatus>({
    queryKey: ['server', 'map-image-status'],
    queryFn: () => apiFetch<MapImageStatus>('/api/server/map-image/status'),
  });
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { nickname, setNickname, clearNickname } = usePlayer();
  const [nicknameValue, setNicknameValue] = useState(nickname ?? '');

  const { data: settings } = useSettings();
  const { data: mapStatus, refetch: refetchStatus } = useMapImageStatus();
  const updateSetting = useUpdateSetting();
  const qc = useQueryClient();

  const currentMapUrl = settings?.mapImageUrl && settings.mapImageUrl !== 'null'
    ? settings.mapImageUrl
    : '';
  const [mapUrl, setMapUrl] = useState('');
  useEffect(() => { setMapUrl(currentMapUrl); }, [currentMapUrl]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleReset = useCallback(async () => {
    setResetting(true);
    setResetError(null);
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      qc.clear();
      setResetConfirm(false);
      onClose();
    } catch (err) {
      setResetError((err as Error).message);
    } finally {
      setResetting(false);
    }
  }, [onClose, qc]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/server/map-image', { method: 'POST', body: form });
      if (!res.ok) {
        let message = `Upload failed (${res.status})`;
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
          try {
            const json = await res.json() as { error?: string };
            message = json.error ?? message;
          } catch { /* ignore parse error */ }
        }
        throw new Error(message);
      }
      // Invalidate map image cache so Map page refreshes
      await qc.invalidateQueries({ queryKey: ['server', 'map-image-status'] });
      await refetchStatus();
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveUpload() {
    await fetch('/api/server/map-image', { method: 'DELETE' });
    await qc.invalidateQueries({ queryKey: ['server', 'map-image-status'] });
    await refetchStatus();
  }

  const handleSave = () => {
    const trimmed = nicknameValue.trim();
    if (trimmed) setNickname(trimmed);

    const trimmedUrl = mapUrl.trim();
    const storedUrl = trimmedUrl || 'null';
    if (storedUrl !== (settings?.mapImageUrl ?? 'null')) {
      updateSetting.mutate({ key: 'mapImageUrl', value: storedUrl });
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">

          {/* Nickname */}
          <div className="space-y-1.5">
            <Label htmlFor="settings-nickname">Your in-game nickname</Label>
            <Input
              id="settings-nickname"
              value={nicknameValue}
              onChange={(e) => setNicknameValue(e.target.value)}
            />
          </div>

          <Separator />

          {/* Map image */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Map overview image</Label>
              {mapStatus?.source === 'upload' && (
                <Badge variant="secondary" className="text-xs">Uploaded file active</Badge>
              )}
              {mapStatus?.source === 'url' && (
                <Badge variant="secondary" className="text-xs">URL active</Badge>
              )}
              {mapStatus?.source === 'none' && (
                <Badge variant="outline" className="text-xs text-muted-foreground">Not set</Badge>
              )}
            </div>

            {/* Upload */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Upload an image file (max 20 MB)</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs flex-1"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? 'Uploading…' : mapStatus?.source === 'upload' ? 'Replace image' : 'Choose file…'}
                </Button>
                {mapStatus?.source === 'upload' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={handleRemoveUpload}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploadError && (
                <p className="text-xs text-destructive">{uploadError}</p>
              )}
            </div>

            {/* URL fallback */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Or enter a URL (used if no file is uploaded)
              </p>
              <Input
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                placeholder="https://example.com/map.jpg"
                className="text-xs"
              />
            </div>
          </div>

          <Separator />

          {/* New Playthrough Reset */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">New playthrough</Label>
            <p className="text-xs text-muted-foreground">
              Starting a new savegame? Clear all farm data, tasks, goals, vehicles, and history.
              App settings and recurring task templates are preserved.
            </p>

            {!resetConfirm ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-destructive border-destructive/40 hover:bg-destructive/10 w-full"
                onClick={() => { setResetConfirm(true); setResetError(null); }}
              >
                🔄 Reset for New Playthrough…
              </Button>
            ) : (
              <div className="space-y-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
                <p className="text-xs font-semibold text-destructive">
                  This will permanently delete all game data. This cannot be undone.
                </p>
                <p className="text-xs text-muted-foreground">
                  Preserved: app settings, recurring task templates.
                </p>
                {resetError && (
                  <p className="text-xs text-destructive">{resetError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs flex-1"
                    disabled={resetting}
                    onClick={() => void handleReset()}
                  >
                    {resetting ? 'Resetting…' : 'Yes, wipe all game data'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={resetting}
                    onClick={() => setResetConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1" disabled={updateSetting.isPending}>
              Save
            </Button>
            <Button variant="outline" onClick={() => { clearNickname(); setNicknameValue(''); onClose(); }} className="text-destructive">
              Reset nickname
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

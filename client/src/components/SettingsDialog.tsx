import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { usePlayer } from '@/contexts/PlayerContext';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { nickname, setNickname, clearNickname } = usePlayer();
  const [value, setValue] = useState(nickname ?? '');

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed) {
      setNickname(trimmed);
    }
    onClose();
  };

  const handleReset = () => {
    clearNickname();
    setValue('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-nickname">Your in-game nickname</Label>
            <Input
              id="settings-nickname"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              Save
            </Button>
            <Button variant="outline" onClick={handleReset} className="text-destructive">
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

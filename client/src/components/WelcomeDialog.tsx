import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePlayer } from '@/contexts/PlayerContext';

export function WelcomeDialog() {
  const { nickname, setNickname } = usePlayer();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const open = !nickname;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please enter your nickname');
      return;
    }
    setNickname(trimmed);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-sm [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center items-center">
          <div className="text-4xl mb-2">🌾</div>
          <DialogTitle className="text-xl">Farm Companion</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Track your farm, claim tasks, and plan your season — all in one place.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="nickname-input">
              Your in-game nickname
            </label>
            <Input
              id="nickname-input"
              placeholder="e.g. marty"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError('');
              }}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            We'll find your farm automatically. You can still browse as a guest if you're not on a
            farm yet.
          </p>
          <Button type="submit" className="w-full">
            Let's go →
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  requireTyping?: string;
  onConfirm: () => void;
  destructive?: boolean;
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  requireTyping,
  onConfirm,
  destructive = false,
}: ConfirmDialogProps) => {
  const [typedValue, setTypedValue] = useState('');

  const handleConfirm = () => {
    onConfirm();
    setTypedValue('');
  };

  const canConfirm = !requireTyping || typedValue === requireTyping;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{description}</p>
            {requireTyping && (
              <div className="space-y-2">
                <Label htmlFor="confirm-input">
                  Type <strong>{requireTyping}</strong> to confirm:
                </Label>
                <Input
                  id="confirm-input"
                  value={typedValue}
                  onChange={(e) => setTypedValue(e.target.value)}
                  placeholder={requireTyping}
                  autoComplete="off"
                />
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setTypedValue('')}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
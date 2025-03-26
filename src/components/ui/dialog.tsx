import * as React from "react";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  const handleClose = () => onOpenChange(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative max-w-4xl w-full mx-auto bg-gradient-to-br from-purple-900/80 to-black/80 backdrop-blur-lg rounded-xl shadow-xl border border-white/10">
        {children}
      </div>
      <div className="fixed inset-0 z-[-1]" onClick={handleClose} />
    </div>
  );
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogContent({ className, ...props }: DialogContentProps) {
  return <div className={cn("p-6", className)} {...props} />;
}

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return <div className={cn("mb-6", className)} {...props} />;
}

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return <h2 className={cn("text-2xl font-bold text-white", className)} {...props} />;
}

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return <div className={cn("mt-6 flex justify-end gap-3", className)} {...props} />;
}

export interface DialogCloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function DialogCloseButton({ className, onClick, ...props }: DialogCloseButtonProps) {
  return (
    <button
      className={cn(
        "absolute top-4 right-4 text-white/70 hover:text-white transition-colors",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <X size={18} />
      <span className="sr-only">Close</span>
    </button>
  );
} 
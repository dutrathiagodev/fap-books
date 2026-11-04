"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

export interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  // O frame usa o navy. "danger" fica para a ação destrutiva do design system.
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void;
  onClose: () => void;
  // Exclusão não fecha no clique fora nem no Esc. O X continua fechando.
  destructive?: boolean;
  children?: ReactNode;
}

// Modal do design system (Figma: 480 px, título, texto, Cancelar e a ação à direita).
export function Modal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  confirmVariant = "primary",
  onConfirm,
  onClose,
  destructive = false,
  children,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function focusables(): HTMLElement[] {
      if (!panel) return [];
      return [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])")];
    }

    const first = focusables()[0];
    (first ?? panel)?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !destructive) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const index = items.indexOf(document.activeElement as HTMLElement);
      const last = items.length - 1;
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        items[last]?.focus();
      } else if (!event.shiftKey && (index === -1 || index === last)) {
        event.preventDefault();
        items[0]?.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open, destructive]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-navy-950/50"
        onClick={() => {
          if (!destructive) onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-[480px] rounded-lg bg-surface p-4 shadow-lg outline-none sm:p-6"
      >
        <h2 id={titleId} className="pr-8 text-h3">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <X size={16} strokeWidth={1.5} aria-hidden />
        </button>
        {description && <p className="mt-2 text-sm text-ink-muted">{description}</p>}
        {children}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button text={cancelLabel} variant="secondary" fullWidth={false} onClick={onClose} />
          <Button text={confirmLabel} variant={confirmVariant} fullWidth={false} onClick={onConfirm} />
        </div>
      </div>
    </div>
  );
}

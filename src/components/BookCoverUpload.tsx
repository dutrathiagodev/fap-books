"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { COVER_MIME_TYPES, coverError } from "@/domain/books/cover-rules";
import { FieldError } from "./FieldError";

export interface BookCoverUploadProps {
  // Capa já salva. Sem ela, o bloco mostra o quadro vazio do frame.
  previewUrl?: string | null;
  // Erro vindo de fora (a conferência do servidor ao salvar).
  error?: string;
  disabled?: boolean;
  onChange?: (file: File | null) => void;
}

const BUTTON =
  "h-11 cursor-pointer md:h-9 items-center justify-center rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50";

function readImage(file: File): Promise<{ width: number; height: number; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    image.src = url;
  });
}

// Upload da capa (Figma, card 0117). No computador, a caixa tracejada (260×260, raio 12) fica à direita; no celular, a miniatura fica ao lado do texto.
export function BookCoverUpload({ previewUrl = null, error: externalError, disabled = false, onChange }: BookCoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const ownedUrl = useRef<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | undefined>();
  const [dragOver, setDragOver] = useState(false);
  const preview = localUrl ?? previewUrl;
  const error = externalError || localError;

  useEffect(() => {
    return () => {
      if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current);
    };
  }, []);

  function replaceOwned(next: string | null) {
    if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current);
    ownedUrl.current = next;
    setLocalUrl(next);
  }

  async function accept(file: File | undefined) {
    if (!file || disabled) return;
    try {
      const image = await readImage(file);
      // file.type vem da extensão: aqui é só um aviso rápido. O servidor confere os bytes de novo ao salvar.
      const message = coverError({ type: file.type, size: file.size, width: image.width, height: image.height });
      if (message) {
        URL.revokeObjectURL(image.url);
        setLocalError(message);
        return;
      }
      replaceOwned(image.url);
      setLocalError(undefined);
      onChange?.(file);
    } catch {
      setLocalError("Não foi possível ler esta imagem.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  const zone = `flex flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-subtle text-center md:gap-2.5 md:rounded-lg ${
    preview ? "overflow-hidden" : "p-3 md:p-5"
  } ${error ? "border-danger-700" : dragOver ? "border-focus bg-selected" : "border-navy-300"}`;

  return (
    <div>
      <p className="mb-1 hidden text-sm font-medium md:block">Capa do exemplar (opcional)</p>
      <div className="flex items-center gap-3 md:block">
        <div
          className={`${zone} size-20 shrink-0 md:size-auto md:h-[260px] md:w-full`}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void accept(event.dataTransfer.files[0]);
          }}
        >
          {preview ? (
            // Prévia local (blob) ou capa já salva: o otimizador do Next não lê esses endereços.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Prévia da capa" className="h-full w-full object-cover" />
          ) : (
            <>
              <ImagePlus size={28} strokeWidth={1.5} aria-hidden className="text-navy-300" />
              <p className="hidden text-xs text-ink-muted md:block">Arraste a imagem aqui ou</p>
              <button type="button" disabled={disabled} onClick={openPicker} className={`${BUTTON} hidden md:inline-flex`}>
                Selecionar imagem
              </button>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col items-start gap-2 md:mt-2">
          <p className="text-sm font-medium md:hidden">Capa (opcional)</p>
          <p className="text-xs leading-4 text-ink-muted">
            <span className="md:hidden">JPG, PNG ou WebP, proporção 2:3.</span>
            <span className="hidden md:inline">
              JPG, PNG ou WebP, proporção 2:3, mínimo 600×900 px. Sem capa, o livro aparece com um espaço reservado.
            </span>
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={openPicker}
            className={`${BUTTON} ${preview ? "inline-flex" : "max-md:inline-flex md:hidden"}`}
          >
            Selecionar imagem
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        id="book-cover"
        name="cover"
        type="file"
        accept={COVER_MIME_TYPES.join(",")}
        disabled={disabled}
        aria-label="Capa do exemplar"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "book-cover-error" : undefined}
        className="sr-only"
        onChange={(event) => void accept(event.target.files?.[0])}
      />

      {error && <FieldError id="book-cover-error" message={error} className="mt-2" />}
    </div>
  );
}

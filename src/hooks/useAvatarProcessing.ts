"use client";

import { useCallback, useRef, useState } from "react";

export type ProcessedAvatar = {
  blob: Blob;
  previewUrl: string;
  mime: string;
  width: number;
  height: number;
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function validateImage(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Please select an image file";
  if (file.size > MAX_SIZE_BYTES) return "File size must be less than 5MB";
  return null;
}

function toBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!canvas.toBlob) {
      try {
        const dataUri = canvas.toDataURL(mime, quality);
        const byteString = atob(dataUri.split(",")[1]);
        const mimeString = dataUri.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        resolve(new Blob([ab], { type: mimeString }));
      } catch {
        reject(new Error("Failed to encode image"));
      }
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to encode image"));
      },
      mime,
      quality,
    );
  });
}

export function useAvatarProcessing(targetSize = 256) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const lastUrlRef = useRef<string | null>(null);

  const revokePrevUrl = () => {
    if (lastUrlRef.current) {
      URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = null;
    }
  };

  const [progress, setProgress] = useState<number>(0);
  const cancelRef = useRef<boolean>(false);
  const readerRef = useRef<FileReader | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      const validationError = validateImage(file);
      if (validationError) {
        setError(validationError);
        throw new Error(validationError);
      }
      setIsProcessing(true);
      setError(null);
      setProgress(5);
      cancelRef.current = false;
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const reader = new FileReader();
          readerRef.current = reader;
          reader.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = reader.result as string;
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
        if (cancelRef.current) throw new Error("Processing aborted");
        setProgress(30);
        const minDim = Math.min(
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
        );
        const offsetX = Math.floor(
          ((img.naturalWidth || img.width) - minDim) / 2,
        );
        const offsetY = Math.floor(
          ((img.naturalHeight || img.height) - minDim) / 2,
        );
        const canvas = document.createElement("canvas");
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to create canvas context");
        ctx.drawImage(
          img,
          offsetX,
          offsetY,
          minDim,
          minDim,
          0,
          0,
          targetSize,
          targetSize,
        );
        setProgress(60);
        let mime = "image/webp";
        let blob: Blob;
        try {
          blob = await toBlob(canvas, "image/webp", 0.85);
          mime = "image/webp";
        } catch {
          blob = await toBlob(canvas, "image/jpeg", 0.85);
          mime = "image/jpeg";
        }
        if (cancelRef.current) throw new Error("Processing aborted");
        setProgress(90);
        revokePrevUrl();
        const url = URL.createObjectURL(blob);
        lastUrlRef.current = url;
        setPreviewUrl(url);
        setProcessedBlob(blob);
        setProgress(100);
        return {
          blob,
          previewUrl: url,
          mime,
          width: targetSize,
          height: targetSize,
        };
      } finally {
        setIsProcessing(false);
        readerRef.current = null;
        cancelRef.current = false;
      }
    },
    [targetSize],
  );

  const clear = useCallback(() => {
    revokePrevUrl();
    setPreviewUrl(null);
    setProcessedBlob(null);
    setError(null);
    setProgress(0);
  }, []);

  const abort = useCallback(() => {
    cancelRef.current = true;
    try {
      readerRef.current?.abort();
    } catch {}
  }, []);
  return {
    isProcessing,
    error,
    previewUrl,
    processedBlob,
    progress,
    processFile,
    clear,
    abort,
  };
}

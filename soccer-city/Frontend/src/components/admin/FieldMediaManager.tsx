// components/admin/FieldMediaManager.tsx
"use client";
import { useRef, useState } from "react";
import { GripVertical, Trash2, Upload, Video, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

const ACCEPTED_TYPES =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";

function detectType(file: File): "image" | "video" {
  return file.type.startsWith("video/") ? "video" : "image";
}

export function FieldMediaManager({
  fieldId,
  fieldName,
}: {
  fieldId: string;
  fieldName: string;
}) {
  const { fieldMedia, uploadImage, uploading, addFieldMediaItem, deleteFieldMediaItem, reorderFieldMediaItems } =
    useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const items = fieldMedia
    .filter((m) => m.fieldId === fieldId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      try {
        const type = detectType(file);
        const url = await uploadImage(file, "fields", "media");
        await addFieldMediaItem(fieldId, url, type);
      } catch (error: any) {
        alert(`Erreur pour "${file.name}" : ${error.message || "upload échoué"}`);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  // Réordonnancement simple par glisser-déposer entre vignettes
  const handleItemDragStart = (index: number) => setDragIndex(index);
  const handleItemDrop = async (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setDragIndex(null);
    await reorderFieldMediaItems(reordered.map((m) => m.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">
          Photos & vidéos — {fieldName}
        </p>
        <p className="text-xs text-white/40">{items.length} média(s)</p>
      </div>

      {/* Zone d'upload */}
      <div
        className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-all ${
          isDragging ? "border-primary bg-primary/10" : "border-border"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto size-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          Glissez plusieurs photos/vidéos, ou
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Upload en cours..." : "Parcourir"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground/50">
          JPG, PNG, WEBP, MP4, WEBM, MOV (max 50MB chacun)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={uploading}
        />
      </div>

      {/* Grille des médias existants, réordonnable */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleItemDragStart(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleItemDrop(index)}
              className="group relative aspect-square cursor-move overflow-hidden rounded-lg border bg-muted"
            >
              {item.type === "image" ? (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <video src={item.url} className="h-full w-full object-cover" muted />
              )}

              <div className="absolute left-1.5 top-1.5 rounded bg-black/70 p-1 text-white">
                {item.type === "video" ? <Video className="size-3" /> : <ImageIcon className="size-3" />}
              </div>

              <div className="absolute right-1.5 top-1.5 rounded bg-black/70 p-1 text-white/70">
                <GripVertical className="size-3" />
              </div>

              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deleteFieldMediaItem(item.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
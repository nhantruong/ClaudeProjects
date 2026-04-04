import React, { useState, useRef, useCallback } from 'react';
import { Send, Clock, MessageSquare, Activity, Save, ChevronDown, ImagePlus, X, Loader2, ZoomIn } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rfiApi, type RfiDetail as RfiDetailType, type RfiStatus, type RfiImage } from '@/lib/api/rfi.api';
import {
  DISCIPLINE_COLORS, STATUS_BADGE, PRIORITY_DOT, slaLabel, formatRelativeDate, getInitials,
} from './rfi.utils';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: RfiStatus[] = ['Open', 'Under Review', 'Responded', 'Closed'];
const MAX_IMAGES = 6;

// ── Image thumbnail ────────────────────────────────────────────────────────────

function ImageThumb({ img, onDelete, baseUrl }: { img: RfiImage; onDelete?: () => void; baseUrl: string }) {
  const [zoomed, setZoomed] = useState(false);
  const src = `${baseUrl}${img.storagePath}`;

  return (
    <>
      <div className="relative group rounded-md overflow-hidden border border-border bg-surface-elevated w-20 h-20 flex-shrink-0">
        <img
          src={src}
          alt={img.filename}
          className="w-full h-full object-cover cursor-zoom-in"
          onClick={() => setZoomed(true)}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="absolute top-0.5 left-0.5 p-0.5 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="View full size"
        >
          <ZoomIn size={10} />
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove"
          >
            <X size={10} />
          </button>
        )}
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={20} />
          </button>
          <img
            src={src}
            alt={img.filename}
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ── Pending file preview (before upload) ──────────────────────────────────────

function PendingThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [src] = useState(() => URL.createObjectURL(file));
  return (
    <div className="relative group rounded-md overflow-hidden border border-border bg-surface-elevated w-20 h-20 flex-shrink-0">
      <img src={src} alt={file.name} className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={10} />
      </button>
    </div>
  );
}

// ── Image picker strip ─────────────────────────────────────────────────────────

interface ImagePickerProps {
  pendingFiles: File[];
  onAdd: (files: File[]) => void;
  onRemovePending: (idx: number) => void;
  maxFiles?: number;
  disabled?: boolean;
}

function ImagePickerStrip({ pendingFiles, onAdd, onRemovePending, maxFiles = MAX_IMAGES, disabled }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canAdd = pendingFiles.length < maxFiles && !disabled;

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const imgs = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, maxFiles - pendingFiles.length);
    if (imgs.length > 0) onAdd(imgs);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      {pendingFiles.map((f, i) => (
        <PendingThumb key={i} file={f} onRemove={() => onRemovePending(i)} />
      ))}
      {canAdd && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-20 h-20 flex-shrink-0 border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center gap-1',
            'text-text-subtle hover:border-accent-teal-500 hover:text-accent-teal-400 transition-colors cursor-pointer',
          )}
          title="Add image (or paste from clipboard)"
        >
          <ImagePlus size={18} />
          <span className="text-[10px]">Add / Paste</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

// ── Main RFI detail panel ──────────────────────────────────────────────────────

interface Props {
  rfi: RfiDetailType;
  onUpdated: () => void;
}

const API_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined)?.replace('/api/v1', '') ?? 'http://localhost:3001';

export function RfiDetailPanel({ rfi, onUpdated }: Props) {
  const qc = useQueryClient();
  const [response, setResponse] = useState(rfi.response ?? '');
  const [comment, setComment] = useState('');
  const [commentImages, setCommentImages] = useState<File[]>([]);
  const [pendingRfiImages, setPendingRfiImages] = useState<File[]>([]);
  const sla = slaLabel(rfi.status, rfi.requiredDate);
  const dc = DISCIPLINE_COLORS[rfi.discipline] ?? DISCIPLINE_COLORS['General']!;

  // Existing RFI-level images (no commentId)
  const rfiImages = rfi.images.filter((img) => img.commentId == null);
  const canAddRfiImages = rfiImages.length + pendingRfiImages.length < MAX_IMAGES;

  const updateMut = useMutation({
    mutationFn: (data: Parameters<typeof rfiApi.update>[1]) => rfiApi.update(rfi.id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rfis', rfi.projectId] });
      void qc.invalidateQueries({ queryKey: ['rfi', rfi.id] });
      void qc.invalidateQueries({ queryKey: ['rfi-stats', rfi.projectId] });
      onUpdated();
    },
  });

  const uploadRfiImagesMut = useMutation({
    mutationFn: (files: File[]) => rfiApi.uploadImages(rfi.id, files),
    onSuccess: () => {
      setPendingRfiImages([]);
      void qc.invalidateQueries({ queryKey: ['rfi', rfi.id] });
    },
  });

  const deleteRfiImageMut = useMutation({
    mutationFn: (imageId: number) => rfiApi.deleteImage(rfi.id, imageId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rfi', rfi.id] });
    },
  });

  const commentMut = useMutation({
    mutationFn: async (data: { body: string; images: File[] }) => {
      const res = await rfiApi.addComment(rfi.id, data.body);
      if (data.images.length > 0) {
        await rfiApi.uploadImages(rfi.id, data.images, res.comment.id);
      }
      return res;
    },
    onSuccess: () => {
      setComment('');
      setCommentImages([]);
      void qc.invalidateQueries({ queryKey: ['rfi', rfi.id] });
    },
  });

  // Clipboard paste handler — captures pasted images anywhere in the panel
  const handlePaste = useCallback(
    (e: React.ClipboardEvent, target: 'rfi' | 'comment') => {
      const items = Array.from(e.clipboardData.items);
      const imageFiles = items
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);

      if (imageFiles.length === 0) return;
      e.preventDefault();

      if (target === 'rfi') {
        setPendingRfiImages((prev) =>
          [...prev, ...imageFiles].slice(0, MAX_IMAGES - rfiImages.length),
        );
      } else {
        setCommentImages((prev) => [...prev, ...imageFiles].slice(0, MAX_IMAGES));
      }
    },
    [rfiImages.length],
  );

  function handleStatusChange(status: RfiStatus) {
    updateMut.mutate({ status });
  }

  function handleSaveResponse() {
    updateMut.mutate({ response });
    if (pendingRfiImages.length > 0) {
      uploadRfiImagesMut.mutate(pendingRfiImages);
    }
  }

  function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (comment.trim() || commentImages.length > 0) {
      commentMut.mutate({ body: comment.trim() || '📎', images: commentImages });
    }
  }

  // Images for each comment (by commentId)
  function getCommentImages(commentId: number): RfiImage[] {
    return rfi.images.filter((img) => img.commentId === commentId);
  }

  return (
    <div className="overflow-y-auto bg-surface-primary h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-surface-topbar border-b border-border px-6 py-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-caption font-mono text-accent-teal-400">{rfi.rfiNumber}</span>
              <span className={cn('text-caption px-2 py-0.5 rounded-full font-medium', STATUS_BADGE[rfi.status])}>
                {rfi.status}
              </span>
            </div>
            <h2 className="text-heading-3 text-text-default leading-snug">{rfi.title}</h2>
          </div>
          <button
            onClick={handleSaveResponse}
            disabled={updateMut.isPending || uploadRfiImagesMut.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-success-500/20 border border-success-500/30 text-success-400 rounded-full text-caption font-medium hover:bg-success-500/30 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {uploadRfiImagesMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save
          </button>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className={cn('text-caption px-2 py-0.5 rounded-full font-medium border', dc.bg, dc.text, 'border-current/20')}>
            {rfi.discipline}
          </span>
          <span className="flex items-center gap-1 text-caption text-text-muted bg-surface-elevated px-2 py-0.5 rounded-full border border-border">
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[rfi.priority])} />
            {rfi.priority}
          </span>
          {sla.text && (
            <span className={cn('text-caption font-medium bg-surface-elevated px-2 py-0.5 rounded-full border border-border', sla.className)}>
              {sla.text}
            </span>
          )}
          {rfi.requiredDate && (
            <span className="text-caption text-text-muted bg-surface-elevated px-2 py-0.5 rounded-full border border-border">
              Due: {rfi.requiredDate}
            </span>
          )}
          {/* Status selector */}
          <div className="relative ml-auto">
            <select
              value={rfi.status}
              onChange={e => handleStatusChange(e.target.value as RfiStatus)}
              className="appearance-none bg-surface-elevated border border-border text-text-default text-caption rounded-full px-3 py-1 pr-7 focus:outline-none focus:ring-1 focus:ring-accent-teal-500 cursor-pointer"
            >
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* RFI Info */}
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider mb-3">RFI Information</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              ['Submitted By',       rfi.submittedBy],
              ['Assigned To',        rfi.assignedTo ?? '—'],
              ['Date Submitted',     rfi.dateSubmitted],
              ['Required Response',  rfi.requiredDate ?? '—'],
              ['Drawing / Doc Ref.', rfi.drawingRef ?? '—'],
              ['Spec Section',       rfi.specRef ?? '—'],
              ...(rfi.responseDate ? [['Response Date', rfi.responseDate]] : []),
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-caption text-text-subtle uppercase tracking-wider mb-0.5">{label}</div>
                <div className="text-body-small text-text-default">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider mb-3">
            Question / Description
          </h3>
          <p className="text-body-small text-text-default leading-relaxed whitespace-pre-wrap">{rfi.description}</p>
        </div>

        {/* RFI Images */}
        <div className="bg-surface-card border border-border rounded-lg p-4" onPaste={(e) => handlePaste(e, 'rfi')}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <ImagePlus size={13} className="text-text-subtle" />
              Attachments ({rfiImages.length}/{MAX_IMAGES})
            </h3>
            {rfiImages.length + pendingRfiImages.length < MAX_IMAGES && (
              <span className="text-caption text-text-subtle">Paste screenshot or select files</span>
            )}
          </div>

          {/* Uploaded images */}
          {rfiImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {rfiImages.map((img) => (
                <ImageThumb
                  key={img.id}
                  img={img}
                  baseUrl={API_ORIGIN}
                  onDelete={() => deleteRfiImageMut.mutate(img.id)}
                />
              ))}
            </div>
          )}

          {/* Pending (to upload on Save) */}
          {canAddRfiImages && (
            <ImagePickerStrip
              pendingFiles={pendingRfiImages}
              onAdd={(files) => setPendingRfiImages((prev) => [...prev, ...files].slice(0, MAX_IMAGES - rfiImages.length))}
              onRemovePending={(i) => setPendingRfiImages((prev) => prev.filter((_, idx) => idx !== i))}
              maxFiles={MAX_IMAGES - rfiImages.length}
            />
          )}
          {pendingRfiImages.length > 0 && (
            <p className="text-caption text-warning-400 mt-2">
              {pendingRfiImages.length} image{pendingRfiImages.length > 1 ? 's' : ''} pending — click Save to upload
            </p>
          )}
        </div>

        {/* Official Response */}
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider mb-3">
            Official Response
          </h3>
          <textarea
            value={response}
            onChange={e => setResponse(e.target.value)}
            placeholder="Enter response here…"
            className={cn(
              'w-full bg-surface-primary border border-border rounded-md px-3 py-2.5',
              'text-body-small text-text-default placeholder-text-subtle',
              'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
              'min-h-[120px] resize-y',
            )}
          />
        </div>

        {/* Comments */}
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <MessageSquare size={13} className="text-text-subtle" />
            Comments ({rfi.comments.length})
          </h3>

          {rfi.comments.length > 0 ? (
            <div className="space-y-4 mb-4">
              {rfi.comments.map(c => {
                const cImgs = getCommentImages(c.id);
                return (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-info-500/20 flex items-center justify-center text-caption font-semibold text-info-400 flex-shrink-0">
                      {getInitials(c.authorName).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-body-small font-medium text-text-default">{c.authorName}</span>
                        <span className="text-caption text-text-subtle">{formatRelativeDate(c.createdAt)}</span>
                      </div>
                      {c.body !== '📎' && (
                        <p className="text-body-small text-text-default leading-relaxed">{c.body}</p>
                      )}
                      {cImgs.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {cImgs.map((img) => (
                            <ImageThumb key={img.id} img={img} baseUrl={API_ORIGIN} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-body-small text-text-subtle mb-4">No comments yet.</p>
          )}

          {/* Comment form */}
          <form onSubmit={handlePostComment} className="border-t border-border pt-4" onPaste={(e) => handlePaste(e, 'comment')}>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-accent-teal-600/20 flex items-center justify-center text-caption font-semibold text-accent-teal-400 flex-shrink-0">
                ME
              </div>
              <div className="flex-1 min-w-0">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment… (paste image with Ctrl+V)"
                  rows={2}
                  className={cn(
                    'w-full bg-surface-primary border border-border rounded-md px-3 py-2',
                    'text-body-small text-text-default placeholder-text-subtle resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
                  )}
                />
                {/* Comment image picker */}
                {commentImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {commentImages.map((f, i) => (
                      <PendingThumb
                        key={i}
                        file={f}
                        onRemove={() => setCommentImages((prev) => prev.filter((_, idx) => idx !== i))}
                      />
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <label className="flex items-center gap-1.5 text-caption text-text-subtle hover:text-accent-teal-400 cursor-pointer transition-colors">
                    <ImagePlus size={13} />
                    <span>Attach image</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
                        setCommentImages((prev) => [...prev, ...files].slice(0, MAX_IMAGES));
                      }}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={(!comment.trim() && commentImages.length === 0) || commentMut.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 bg-accent-teal-600 hover:bg-accent-teal-500 text-white rounded-full text-caption font-medium transition-colors disabled:opacity-50"
                  >
                    {commentMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Post
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Activity Log */}
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity size={13} className="text-text-subtle" />
            Activity Log
          </h3>
          <div className="space-y-0">
            {rfi.activity.map((item, i) => (
              <div key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center w-3.5">
                  <div className={cn('w-2.5 h-2.5 rounded-full border-2 mt-0.5 flex-shrink-0',
                    i === rfi.activity.length - 1
                      ? 'bg-accent-teal-500 border-accent-teal-500'
                      : 'bg-surface-primary border-border'
                  )} />
                  {i < rfi.activity.length - 1 && (
                    <div className="w-0.5 flex-1 bg-border min-h-[14px] my-1" />
                  )}
                </div>
                <div className="pb-3">
                  <div className="text-body-small text-text-default">{item.event}</div>
                  <div className="text-caption text-text-subtle mt-0.5">{formatRelativeDate(item.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

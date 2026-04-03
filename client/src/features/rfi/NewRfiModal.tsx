import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { rfiApi, type RfiDiscipline, type RfiPriority } from '@/lib/api/rfi.api';
import { cn } from '@/lib/utils';

const DISCIPLINES: RfiDiscipline[] = [
  'Mechanical', 'Electrical', 'Plumbing', 'Fire Protection',
  'Civil / Structural', 'Architectural', 'General',
];
const PRIORITIES: RfiPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

const schema = z.object({
  title:        z.string().min(1, 'Title is required').max(300),
  discipline:   z.string().min(1, 'Discipline is required'),
  priority:     z.string().min(1),
  submittedBy:  z.string().min(1, 'Submitted By is required').max(200),
  assignedTo:   z.string().max(200).optional(),
  drawingRef:   z.string().max(200).optional(),
  specRef:      z.string().max(100).optional(),
  dateSubmitted: z.string().optional(),
  requiredDate: z.string().optional(),
  description:  z.string().min(1, 'Description is required'),
});

type FormErrors = Partial<Record<keyof z.infer<typeof schema>, string>>;

interface Props {
  projectId: number;
  onClose: () => void;
}

export function NewRfiModal({ projectId, onClose }: Props) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    title: '', discipline: 'Mechanical' as RfiDiscipline,
    priority: 'Medium' as RfiPriority, submittedBy: '',
    assignedTo: '', drawingRef: '', specRef: '',
    dateSubmitted: today, requiredDate: '', description: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const mutation = useMutation({
    mutationFn: () => rfiApi.create(projectId, {
      title:         form.title,
      discipline:    form.discipline,
      priority:      form.priority,
      submittedBy:   form.submittedBy,
      assignedTo:    form.assignedTo || null,
      drawingRef:    form.drawingRef || null,
      specRef:       form.specRef || null,
      dateSubmitted: form.dateSubmitted || undefined,
      requiredDate:  form.requiredDate || null,
      description:   form.description,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rfis', projectId] });
      void qc.invalidateQueries({ queryKey: ['rfi-stats', projectId] });
      onClose();
    },
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key as keyof FormErrors]) setErrors(e => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: FormErrors = {};
      result.error.issues.forEach(i => {
        if (i.path[0]) errs[i.path[0] as keyof FormErrors] = i.message;
      });
      setErrors(errs);
      return;
    }
    mutation.mutate();
  }

  const inputCls = (err?: string) => cn(
    'w-full bg-surface-primary border rounded-md px-3 py-2 text-body text-text-default',
    'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
    'placeholder-text-subtle disabled:opacity-50',
    err ? 'border-error-500' : 'border-border',
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-surface-card border border-border rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-accent-teal-600 flex items-center justify-center flex-shrink-0">
            <FileText size={16} className="text-white" />
          </div>
          <h2 className="text-heading-3 text-text-default flex-1">New Request for Information</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-default transition-colors p-1 rounded"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Row 1: Date + Title */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label text-text-muted mb-1">Date Submitted</label>
              <input type="date" className={inputCls()} value={form.dateSubmitted}
                onChange={e => set('dateSubmitted', e.target.value)} />
            </div>
            <div>
              <label className="block text-label text-text-muted mb-1">Required Response Date (SLA)</label>
              <input type="date" className={inputCls()} value={form.requiredDate}
                onChange={e => set('requiredDate', e.target.value)} />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-label text-text-muted mb-1">Subject / Title <span className="text-error-400">*</span></label>
            <input className={inputCls(errors.title)} value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Concise description of the query" />
            {errors.title && <p className="mt-1 text-caption text-error-400" role="alert">{errors.title}</p>}
          </div>

          {/* Discipline + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label text-text-muted mb-1">Discipline <span className="text-error-400">*</span></label>
              <select className={inputCls(errors.discipline)} value={form.discipline}
                onChange={e => set('discipline', e.target.value as RfiDiscipline)}>
                {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-label text-text-muted mb-1">Priority</label>
              <select className={inputCls()} value={form.priority}
                onChange={e => set('priority', e.target.value as RfiPriority)}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Submitted By + Assigned Reviewer */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label text-text-muted mb-1">Submitted By <span className="text-error-400">*</span></label>
              <input className={inputCls(errors.submittedBy)} value={form.submittedBy}
                onChange={e => set('submittedBy', e.target.value)}
                placeholder="Name / Company" />
              {errors.submittedBy && <p className="mt-1 text-caption text-error-400" role="alert">{errors.submittedBy}</p>}
            </div>
            <div>
              <label className="block text-label text-text-muted mb-1">Assigned Reviewer</label>
              <input className={inputCls()} value={form.assignedTo}
                onChange={e => set('assignedTo', e.target.value)}
                placeholder="Name / Discipline Lead" />
            </div>
          </div>

          {/* Drawing Ref + Spec */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label text-text-muted mb-1">Drawing / Doc Ref.</label>
              <input className={inputCls()} value={form.drawingRef}
                onChange={e => set('drawingRef', e.target.value)}
                placeholder="e.g. M-101, E-201" />
            </div>
            <div>
              <label className="block text-label text-text-muted mb-1">Spec Section Ref.</label>
              <input className={inputCls()} value={form.specRef}
                onChange={e => set('specRef', e.target.value)}
                placeholder="e.g. 23 05 00" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-label text-text-muted mb-1">Question / Description <span className="text-error-400">*</span></label>
            <textarea
              className={cn(inputCls(errors.description), 'min-h-[100px] resize-y')}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="State the question clearly. Reference contract, drawings, specs, or site conditions."
            />
            {errors.description && <p className="mt-1 text-caption text-error-400" role="alert">{errors.description}</p>}
          </div>

          {mutation.isError && (
            <p className="text-small text-error-400 text-center" role="alert">
              Failed to create RFI. Please try again.
            </p>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-border rounded-full text-body-small text-text-muted hover:bg-surface-elevated transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-5 py-2 bg-accent-teal-600 hover:bg-accent-teal-500 text-white rounded-full text-body-small font-medium transition-colors disabled:opacity-60">
              {mutation.isPending ? 'Submitting…' : 'Submit RFI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

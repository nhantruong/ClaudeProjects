'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Loader2, Send } from 'lucide-react';
import { tasksApi } from '@/lib/api/tasks.api';
import { cn, getInitials, formatRelativeDate } from '@/lib/utils';
import type { TaskComment } from '@/lib/api/tasks.api';

// ── Avatar color helper ────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#1F6FEB',
  '#2EA043',
  '#D29922',
  '#DA3633',
  '#8250DF',
  '#0D9488',
  '#E86B2A',
  '#6E7681',
] as const;

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface CommentsSectionProps {
  taskId: number;
  comments: TaskComment[];
}

// ── Comment item ───────────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: TaskComment;
}

function CommentItem({ comment }: CommentItemProps) {
  return (
    <article
      className="flex gap-3"
      aria-label={`Comment by ${comment.authorName}`}
      data-testid="comment-item"
    >
      {/* Avatar */}
      <div
        className="flex items-center justify-center w-7 h-7 rounded-full text-white shrink-0 mt-0.5"
        style={{
          backgroundColor: getAvatarColor(comment.authorName),
          fontSize: '11px',
          fontWeight: 600,
        }}
        role="img"
        aria-label={comment.authorName}
      >
        {getInitials(comment.authorName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-body-small font-medium text-text-default">
            {comment.authorName}
          </span>
          <time
            className="text-caption text-text-subtle"
            dateTime={comment.createdAt}
            title={new Date(comment.createdAt).toLocaleString()}
          >
            {formatRelativeDate(comment.createdAt)}
          </time>
        </div>
        <p className="text-body text-text-default whitespace-pre-wrap leading-relaxed">
          {comment.body}
        </p>
      </div>
    </article>
  );
}

// ── Add comment form ───────────────────────────────────────────────────────────

interface AddCommentFormProps {
  taskId: number;
  onOptimisticAdd: (comment: TaskComment) => void;
  onOptimisticRevert: (tempId: number) => void;
}

function AddCommentForm({ taskId, onOptimisticAdd, onOptimisticRevert }: AddCommentFormProps) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const addMutation = useMutation({
    mutationFn: (text: string) => tasksApi.addComment(taskId, text),
    onMutate: (text) => {
      // Optimistic update
      const tempId = Date.now() * -1;
      const optimistic: TaskComment = {
        id: tempId,
        taskId,
        userId: 0,
        authorName: 'You',
        body: text,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onOptimisticAdd(optimistic);
      return { tempId };
    },
    onError: (_error, _text, context) => {
      if (context?.tempId) {
        onOptimisticRevert(context.tempId);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || addMutation.isPending) return;
    setBody('');
    addMutation.mutate(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const trimmed = body.trim();
      if (trimmed && !addMutation.isPending) {
        setBody('');
        addMutation.mutate(trimmed);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2" aria-label="Add comment">
      <div className="relative">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment..."
          rows={isFocused ? 3 : 2}
          className={cn(
            'w-full bg-surface-elevated border rounded px-3 py-2 resize-none',
            'text-body text-text-default placeholder:text-text-subtle',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-accent-teal-500',
            isFocused ? 'border-accent-teal-500' : 'border-border'
          )}
          aria-label="Comment text"
          disabled={addMutation.isPending}
        />
      </div>
      {isFocused && (
        <div className="flex items-center justify-between">
          <span className="text-caption text-text-subtle">Ctrl+Enter to submit</span>
          <button
            type="submit"
            disabled={!body.trim() || addMutation.isPending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-body-small font-medium',
              'bg-accent-teal-500 text-white',
              'hover:bg-accent-teal-600 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
            data-testid="submit-comment"
          >
            {addMutation.isPending ? (
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={13} aria-hidden="true" />
            )}
            Add Comment
          </button>
        </div>
      )}
    </form>
  );
}

// ── CommentsSection ────────────────────────────────────────────────────────────

export function CommentsSection({ taskId, comments }: CommentsSectionProps) {
  const [optimisticComments, setOptimisticComments] = useState<TaskComment[]>([]);

  // Merge server comments with optimistic ones (avoiding duplicates by checking id)
  const serverIds = new Set(comments.map((c) => c.id));
  const filteredOptimistic = optimisticComments.filter((c) => !serverIds.has(c.id));
  const allComments = [...comments, ...filteredOptimistic];

  function handleOptimisticAdd(comment: TaskComment) {
    setOptimisticComments((prev) => [...prev, comment]);
  }

  function handleOptimisticRevert(tempId: number) {
    setOptimisticComments((prev) => prev.filter((c) => c.id !== tempId));
  }

  return (
    <section aria-label="Comments" data-testid="comments-section">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={15} className="text-text-muted" aria-hidden="true" />
        <h3 className="text-label font-semibold text-text-default">Comments</h3>
        {allComments.length > 0 && (
          <span className="text-caption text-text-muted font-mono">
            ({allComments.length})
          </span>
        )}
      </div>

      {/* Comment list */}
      {allComments.length === 0 ? (
        <p
          className="text-body-small text-text-muted italic mb-3"
          data-testid="comments-empty"
        >
          No comments yet. Be the first to comment.
        </p>
      ) : (
        <div
          className="flex flex-col gap-4 mb-4"
          role="list"
          aria-label="Comment list"
        >
          {allComments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}

      {/* Add comment form */}
      <AddCommentForm
        taskId={taskId}
        onOptimisticAdd={handleOptimisticAdd}
        onOptimisticRevert={handleOptimisticRevert}
      />
    </section>
  );
}

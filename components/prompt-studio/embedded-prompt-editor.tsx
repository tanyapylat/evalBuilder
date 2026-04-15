'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CodeXml } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePromptCatalog } from '@/lib/prompt-catalog';
import {
  clonePromptVersionContent,
  defaultPromptVersionContent,
  type PromptMessageRole,
  type PromptVersionContent,
} from '@/lib/prompt-studio-types';
import { cn } from '@/lib/utils';

function stableStringify(content: PromptVersionContent): string {
  return JSON.stringify(content);
}

interface EmbeddedPromptEditorProps {
  promptProjectId: string | number;
  versionId: string | number;
  onUnsavedChange: (unsaved: boolean) => void;
  onVersionCreated: (newVersionId: string, newVersionName: string) => void;
  /** Fires when loaded or edited — used for assertion generation (saved + unsaved buffer). */
  onPromptContentChange?: (content: PromptVersionContent) => void;
  className?: string;
}

export function EmbeddedPromptEditor({
  promptProjectId,
  versionId,
  onUnsavedChange,
  onVersionCreated,
  onPromptContentChange,
  className,
}: EmbeddedPromptEditorProps) {
  const { loadPromptVersionContent, savePromptVersionAsNew } = usePromptCatalog();
  const [mode, setMode] = useState<'editor' | 'code'>('editor');
  const [contentLoading, setContentLoading] = useState(true);
  const [draft, setDraft] = useState<PromptVersionContent>(() => defaultPromptVersionContent());
  const [snapshot, setSnapshot] = useState(() => stableStringify(defaultPromptVersionContent()));
  const [codeText, setCodeText] = useState(() =>
    JSON.stringify(defaultPromptVersionContent(), null, 2),
  );

  useEffect(() => {
    let cancelled = false;
    setContentLoading(true);
    loadPromptVersionContent(promptProjectId, versionId)
      .then((loaded) => {
        if (cancelled) return;
        const next = clonePromptVersionContent(loaded);
        setDraft(next);
        const s = stableStringify(next);
        setSnapshot(s);
        setCodeText(JSON.stringify(next, null, 2));
        setMode('editor');
        onUnsavedChange(false);
      })
      .finally(() => {
        if (!cancelled) setContentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [promptProjectId, versionId, loadPromptVersionContent, onUnsavedChange]);

  const unsaved = stableStringify(draft) !== snapshot;

  useEffect(() => {
    onUnsavedChange(unsaved);
  }, [unsaved, onUnsavedChange]);

  useEffect(() => {
    onPromptContentChange?.(clonePromptVersionContent(draft));
  }, [draft, onPromptContentChange]);

  const updateDraft = useCallback((updater: (prev: PromptVersionContent) => PromptVersionContent) => {
    setDraft((prev) => updater(clonePromptVersionContent(prev)));
  }, []);

  const handleModeChange = (v: string) => {
    const next = v as 'editor' | 'code';
    if (next === 'code') {
      setCodeText(JSON.stringify(draft, null, 2));
    }
    setMode(next);
  };

  const handleSaveNewVersion = async () => {
    try {
      const { versionId: newId, name: newName, wasOfflineFallback } = await savePromptVersionAsNew(
        promptProjectId,
        versionId,
        draft,
      );
      const next = clonePromptVersionContent(draft);
      setSnapshot(stableStringify(next));
      setCodeText(JSON.stringify(next, null, 2));
      onUnsavedChange(false);
      onVersionCreated(newId, newName);
      if (!wasOfflineFallback) {
        toast.success('Saved as new prompt version');
      } else {
        toast.success('Version saved locally');
      }
    } catch {
      toast.error('Could not save version');
    }
  };

  const editorPane = useMemo(
    () => (
      <div className="space-y-0">
        <div>
          <h3 className="text-sm font-medium text-foreground">Messages</h3>
          <div className="mt-3 space-y-4">
            {draft.messages.map((msg, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Select
                    value={msg.role}
                    onValueChange={(value) =>
                      updateDraft((d) => {
                        const next = clonePromptVersionContent(d);
                        next.messages[i]!.role = value as PromptMessageRole;
                        return next;
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">system</SelectItem>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="assistant">assistant</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-8 w-8 text-muted-foreground"
                    onClick={() =>
                      updateDraft((d) => {
                        const next = clonePromptVersionContent(d);
                        next.messages = next.messages.filter((_, j) => j !== i);
                        return next;
                      })
                    }
                    disabled={draft.messages.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={msg.content}
                  onChange={(e) =>
                    updateDraft((d) => {
                      const next = clonePromptVersionContent(d);
                      next.messages[i]!.content = e.target.value;
                      return next;
                    })
                  }
                  className="min-h-[100px] font-mono text-sm"
                  placeholder="Message content"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() =>
                updateDraft((d) => {
                  const next = clonePromptVersionContent(d);
                  next.messages.push({ role: 'user', content: '' });
                  return next;
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add message
            </Button>
          </div>
        </div>

      </div>
    ),
    [draft, updateDraft],
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2 pt-2 pb-2">
        {contentLoading && <Spinner className="text-muted-foreground" />}
        {unsaved && !contentLoading && (
          <Badge variant="secondary" className="font-normal">
            Unsaved changes
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" size="sm" className="m-0" onClick={handleSaveNewVersion} disabled={contentLoading}>
            Save as new version
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                type="button"
                disabled={contentLoading}
                onClick={() => handleModeChange(mode === 'code' ? 'editor' : 'code')}
              >
                <CodeXml className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View config</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {contentLoading ? (
        <div className="text-muted-foreground flex min-h-[200px] items-center justify-center gap-2 text-sm">
          <Spinner />
          Loading prompt version…
        </div>
      ) : mode === 'editor' ? (
        editorPane
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Raw JSON</h3>
          <Textarea
            value={codeText}
            onChange={(e) => setCodeText(e.target.value)}
            className="min-h-[280px] font-mono text-sm"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useEval } from '@/lib/eval-store';
import { type PromptConfig } from '@/lib/eval-types';
import type { VersionOption } from '@/lib/prompt-catalog';
import { usePromptCatalog } from '@/lib/prompt-catalog';
import { usePromptDrafts } from '@/lib/prompt-drafts-context';
import { PromptProjectCombobox } from '@/components/prompt-studio/prompt-project-combobox';
import { EmbeddedPromptEditor } from '@/components/prompt-studio/embedded-prompt-editor';

interface PromptEditorProps {
  prompt: PromptConfig;
  index: number;
  expanded: boolean;
  onExpand: (index: number | null) => void;
  onUpdate: (prompt: PromptConfig) => void;
  onDelete: () => void;
  canDelete: boolean;
}

type PendingNav = { kind: 'project' | 'version'; value: string } | null;

function PromptEditor({
  prompt,
  index,
  expanded,
  onExpand,
  onUpdate,
  onDelete,
  canDelete,
}: PromptEditorProps) {
  const {
    projectOptions,
    projectsLoading,
    getVersions,
    loadVersionsForProject,
  } = usePromptCatalog();
  const { setLivePromptContent } = usePromptDrafts();
  const projectId = String(prompt.promptId);
  const versionId = String(prompt.versionId);
  const [versions, setVersions] = useState<VersionOption[]>(() => getVersions(projectId));

  useEffect(() => {
    loadVersionsForProject(projectId).then(setVersions);
  }, [projectId, loadVersionsForProject]);

  const [editorUnsaved, setEditorUnsaved] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<PendingNav>(null);

  const projectInList = projectOptions.some((p) => p.id === projectId);
  const versionInList = versions.some((v) => v.id === versionId);

  const applyProjectChange = useCallback(
    async (newProjectId: string) => {
      const nextVersions = await loadVersionsForProject(newProjectId);
      setVersions(nextVersions);
      const nextVersionId = nextVersions[0]?.id ?? '';
      onUpdate({
        ...prompt,
        promptId: newProjectId,
        versionId: nextVersionId,
      });
    },
    [loadVersionsForProject, onUpdate, prompt],
  );

  const applyVersionChange = useCallback(
    (newVersionId: string) => {
      onUpdate({ ...prompt, versionId: newVersionId });
    },
    [onUpdate, prompt],
  );

  const tryProjectChange = (newProjectId: string) => {
    if (editorUnsaved) {
      setPendingNav({ kind: 'project', value: newProjectId });
      setDiscardOpen(true);
      return;
    }
    void applyProjectChange(newProjectId);
  };

  const tryVersionChange = (newVersionId: string) => {
    if (editorUnsaved) {
      setPendingNav({ kind: 'version', value: newVersionId });
      setDiscardOpen(true);
      return;
    }
    applyVersionChange(newVersionId);
  };

  const confirmDiscard = () => {
    if (!pendingNav) return;
    if (pendingNav.kind === 'project') {
      void applyProjectChange(pendingNav.value);
    } else {
      applyVersionChange(pendingNav.value);
    }
    setPendingNav(null);
    setDiscardOpen(false);
    setEditorUnsaved(false);
  };

  const cancelDiscard = () => {
    setPendingNav(null);
    setDiscardOpen(false);
  };

  const handleUnsavedChange = useCallback((unsaved: boolean) => {
    setEditorUnsaved(unsaved);
  }, []);

  const handleVersionCreated = useCallback(
    (newVersionId: string, newVersionName: string) => {
      setVersions((prev) => {
        if (prev.some((v) => v.id === newVersionId)) return prev;
        return [...prev, { id: newVersionId, name: newVersionName }];
      });
      onUpdate({ ...prompt, versionId: newVersionId });
    },
    [onUpdate, prompt],
  );

  const toggleExpanded = () => {
    if (expanded) {
      onExpand(null);
    } else {
      onExpand(index);
    }
  };

  return (
    <div className="space-y-4 py-6 first:pt-4">
      <div className="flex items-start justify-between gap-4">
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Prompt Project</Label>
            <PromptProjectCombobox
              projects={projectOptions}
              value={projectId}
              onValueChange={tryProjectChange}
              disabled={projectsLoading}
              className="mt-1.5"
            />
            {!projectInList && (
              <p className="text-muted-foreground mt-1 text-xs">
                Config references project ID {projectId} (not in recent list).
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground">Version</Label>
            <Select value={versionId} onValueChange={tryVersionChange}>
              <SelectTrigger className="mt-1.5 h-9">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {!versionInList && (
                  <SelectItem value={versionId}>
                    Version {versionId}
                  </SelectItem>
                )}
                {versions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    {version.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground">Label (Optional)</Label>
            <Input
              value={prompt.label || ''}
              onChange={(e) => onUpdate({ ...prompt, label: e.target.value || undefined })}
              placeholder="e.g., anthropic, openai"
              className="mt-1.5"
            />
          </div>
        </div>

        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="mt-6 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggleExpanded}
        className="text-muted-foreground hover:text-foreground mt-4 -ml-2 gap-1 px-2"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        View / Edit Prompt
      </Button>
      {/* Keep editor mounted while collapsed so unsaved edits persist (15.5). */}
      <div className={expanded ? 'mt-3' : 'hidden mt-0'} aria-hidden={!expanded}>
        <EmbeddedPromptEditor
          promptProjectId={prompt.promptId}
          versionId={prompt.versionId}
          onUnsavedChange={handleUnsavedChange}
          onVersionCreated={handleVersionCreated}
          onPromptContentChange={(content) => setLivePromptContent(prompt, content)}
        />
      </div>

      <AlertDialog
        open={discardOpen}
        onOpenChange={(open) => {
          setDiscardOpen(open);
          if (!open) setPendingNav(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits in the embedded prompt editor. Switching project or version
              will reload the prompt from the catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDiscard}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PromptsSection() {
  const { config, addPrompt, updatePrompt, deletePrompt } = useEval();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Prompt Source</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addPrompt()}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Another Prompt
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {config.prompts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No prompts configured. Add a prompt to get started.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addPrompt()}
              className="mt-3 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Prompt
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {config.prompts.map((prompt, index) => (
              <PromptEditor
                key={index}
                prompt={prompt}
                index={index}
                expanded={expandedIndex === index}
                onExpand={(i) => setExpandedIndex(i)}
                onUpdate={(updated) => updatePrompt(index, updated)}
                onDelete={() => deletePrompt(index)}
                canDelete={config.prompts.length > 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

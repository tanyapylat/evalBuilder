'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { type PromptConfig, DEFAULT_VENDOR, DEFAULT_MODEL, DEFAULT_TEMPERATURE } from '@/lib/eval-types';
import { ModelSettingsFields, type ModelSettingsValues } from '@/components/eval/model-settings-fields';
import type { VersionOption } from '@/lib/prompt-catalog';
import { usePromptCatalog, DEMO_RESOLVED_PROJECT_ID, DEMO_RESOLVED_VERSION_ID } from '@/lib/prompt-catalog';
import { usePromptDrafts } from '@/lib/prompt-drafts-context';
import { PromptProjectCombobox } from '@/components/prompt-studio/prompt-project-combobox';
import { EmbeddedPromptEditor } from '@/components/prompt-studio/embedded-prompt-editor';
import { Badge } from '@/components/ui/badge';

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
  const resolvedProjectId = String(prompt.promptId) === '{{currentPromptProjectId}}'
    ? DEMO_RESOLVED_PROJECT_ID
    : String(prompt.promptId);
  const isCurrentProject = resolvedProjectId === DEMO_RESOLVED_PROJECT_ID;
  const isCurrentVersion = (vid: string) =>
    isCurrentProject && vid === DEMO_RESOLVED_VERSION_ID;

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
              currentProjectId={DEMO_RESOLVED_PROJECT_ID}
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
              <SelectTrigger className="mt-1.5 h-9 bg-muted/50">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {!versionInList && (
                  <SelectItem value={versionId}>
                    Version {versionId}
                  </SelectItem>
                )}
                {versions
                  .filter((v) => v.id !== '{{currentPromptVersionId}}')
                  .map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    <span className="flex items-center gap-1.5">
                      {version.name}
                      {isCurrentVersion(version.id) && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200">current</Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!versionInList && (
              <p className="text-muted-foreground mt-1 text-xs">
                Config references version ID {versionId} (not in recent list).
              </p>
            )}
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
        className="text-muted-foreground hover:text-foreground -ml-2 gap-1 px-2 m-0"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        View / Edit Prompt
      </Button>
      {/* Keep editor mounted while collapsed so unsaved edits persist (15.5). */}
      <div className={expanded ? '' : 'hidden'} aria-hidden={!expanded}>
        {/* Model settings */}
        <div className="mb-4 rounded-lg border border-dashed border-border p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            Model Settings
          </div>
          <ModelSettingsFields
            value={{
              vendor: prompt.vendor ?? DEFAULT_VENDOR,
              model: prompt.model ?? DEFAULT_MODEL,
              temperature: prompt.temperature ?? DEFAULT_TEMPERATURE,
              maxTokens: prompt.maxTokens ?? 3000,
            }}
            onChange={(v: ModelSettingsValues) =>
              onUpdate({
                ...prompt,
                vendor: v.vendor,
                model: v.model,
                temperature: v.temperature,
                maxTokens: v.maxTokens,
              })
            }
          />
        </div>

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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-foreground">Prompt Source</h2>
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
      <div className="mt-3">
        {config.prompts.length === 0 ? (
          <div className="py-6 text-center">
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
          <div>
            {config.prompts.map((prompt, index) => (
              <div key={index}>
                {index > 0 && <Separator />}
                <PromptEditor
                  prompt={prompt}
                  index={index}
                  expanded={expandedIndex === index}
                  onExpand={(i) => setExpandedIndex(i)}
                  onUpdate={(updated) => updatePrompt(index, updated)}
                  onDelete={() => deletePrompt(index)}
                  canDelete={config.prompts.length > 1}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

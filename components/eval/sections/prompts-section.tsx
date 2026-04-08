'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEval } from '@/lib/eval-store';
import { SAMPLE_PROMPT_PROJECTS, SAMPLE_PROMPT_VERSIONS, type PromptConfig } from '@/lib/eval-types';

interface PromptEditorProps {
  prompt: PromptConfig;
  index: number;
  onUpdate: (prompt: PromptConfig) => void;
  onDelete: () => void;
  canDelete: boolean;
}

function PromptEditor({ prompt, index, onUpdate, onDelete, canDelete }: PromptEditorProps) {
  const projectId = String(prompt.promptId);
  const versionId = String(prompt.versionId);
  const versions = SAMPLE_PROMPT_VERSIONS[projectId] || [];
  
  // If the current project/version is not in sample data, create temporary entries
  const projectInList = SAMPLE_PROMPT_PROJECTS.some(p => p.id === projectId);
  const versionInList = versions.some(v => v.id === versionId);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 grid grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-medium">Prompt Project</Label>
            <Select
              value={projectId}
              onValueChange={(value) => {
                const newVersions = SAMPLE_PROMPT_VERSIONS[value] || [];
                onUpdate({
                  ...prompt,
                  promptId: value,
                  versionId: newVersions[0]?.id || '',
                });
              }}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {!projectInList && (
                  <SelectItem value={projectId}>
                    Project {projectId}
                  </SelectItem>
                )}
                {SAMPLE_PROMPT_PROJECTS.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Version</Label>
            <Select
              value={versionId}
              onValueChange={(value) => onUpdate({ ...prompt, versionId: value })}
            >
              <SelectTrigger className="mt-1.5">
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
            <Label className="text-sm font-medium">Label (Optional)</Label>
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
    </div>
  );
}

export function PromptsSection() {
  const { config, addPrompt, updatePrompt, deletePrompt } = useEval();

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
          <div className="space-y-3">
            {config.prompts.map((prompt, index) => (
              <PromptEditor
                key={index}
                prompt={prompt}
                index={index}
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

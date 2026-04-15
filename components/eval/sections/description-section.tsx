'use client';

import { Textarea } from '@/components/ui/textarea';
import { useEval } from '@/lib/eval-store';

export function DescriptionSection() {
  const { config, setDescription } = useEval();

  return (
    <div>
      <h2 className="text-base font-medium text-foreground">Description</h2>
      <div className="mt-3">
        <Textarea
          value={config.description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter a description for this eval configuration..."
          className="min-h-10 resize-none"
        />
      </div>
    </div>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useEval } from '@/lib/eval-store';

export function DescriptionSection() {
  const { config, setDescription } = useEval();

  return (
    <Card>
      <CardHeader className="px-4 py-3 pb-0">
        <CardTitle className="text-base font-medium">Description</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <Textarea
          value={config.description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter a description for this eval configuration..."
          className="min-h-10 resize-none"
        />
      </CardContent>
    </Card>
  );
}

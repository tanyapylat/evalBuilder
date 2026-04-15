'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  VENDORS,
  DEFAULT_MODEL,
  getModelsForVendor,
} from '@/lib/eval-types';

export interface ModelSettingsValues {
  vendor: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface ModelSettingsFieldsProps {
  value: ModelSettingsValues;
  onChange: (value: ModelSettingsValues) => void;
}

export function ModelSettingsFields({ value, onChange }: ModelSettingsFieldsProps) {
  const vendorModels = getModelsForVendor(value.vendor);

  const handleVendorChange = (newVendor: string) => {
    const models = getModelsForVendor(newVendor);
    const currentModelExists = models.some((m) => m.id === value.model);
    onChange({
      ...value,
      vendor: newVendor,
      model: currentModelExists ? value.model : (models[0]?.id ?? DEFAULT_MODEL),
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Vendor</Label>
        <Select value={value.vendor} onValueChange={handleVendorChange}>
          <SelectTrigger className="mt-1.5 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VENDORS.map((v) => (
              <SelectItem key={v} value={v}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Model</Label>
        <Select value={value.model} onValueChange={(m) => onChange({ ...value, model: m })}>
          <SelectTrigger className="mt-1.5 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {vendorModels.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Temperature</Label>
        <Input
          type="number"
          min={0}
          max={2}
          step={0.1}
          value={value.temperature}
          onChange={(e) => onChange({ ...value, temperature: parseFloat(e.target.value) || 0 })}
          className="mt-1.5 h-9 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Max Tokens</Label>
        <Input
          type="number"
          value={value.maxTokens}
          onChange={(e) => onChange({ ...value, maxTokens: parseInt(e.target.value) || 3000 })}
          className="mt-1.5 h-9 text-sm"
        />
      </div>
    </div>
  );
}

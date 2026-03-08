'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SelectField } from '@/components/ui/select-field';
import type { FormField } from '@/lib/database.types';

interface FormFieldRendererProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function FormFieldRenderer({ field, value, onChange, error }: FormFieldRendererProps) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      return (
        <Input
          type={field.type === 'phone' ? 'tel' : field.type}
          label={field.label}
          placeholder={field.placeholder}
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          error={error}
        />
      );

    case 'textarea':
      return (
        <Textarea
          label={field.label}
          placeholder={field.placeholder}
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          error={error}
        />
      );

    case 'select':
    case 'budget_range':
      return (
        <SelectField
          label={field.label}
          placeholder={`Select ${field.label.toLowerCase()}...`}
          required={field.required}
          options={field.options || []}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          error={error}
        />
      );

    default:
      return (
        <Input
          label={field.label}
          placeholder={field.placeholder}
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          error={error}
        />
      );
  }
}

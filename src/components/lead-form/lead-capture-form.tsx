'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Send, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormProgress } from './form-progress';
import { FormFieldRenderer } from './form-field-renderer';
import { FormSuccessState } from './form-success-state';
import type { FormTemplate } from '@/lib/form-templates';
import type { FormField } from '@/lib/database.types';

interface LeadCaptureFormProps {
  template: FormTemplate;
  organizationId: string;
  source?: string;
  sourceUrl?: string;
  className?: string;
  onSuccess?: () => void;
}

type FormValues = Record<string, string>;
type FormErrors = Record<string, string>;

export function LeadCaptureForm({
  template,
  organizationId,
  source = 'website',
  sourceUrl,
  className,
  onSuccess,
}: LeadCaptureFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  const totalSteps = template.steps.length;
  const currentFields = template.fields.filter((f) => f.step === currentStep);

  // Honeypot for anti-spam
  const [honeypot, setHoneypot] = useState('');

  const validateStep = useCallback(
    (step: number): boolean => {
      const stepFields = template.fields.filter((f) => f.step === step);
      const newErrors: FormErrors = {};

      for (const field of stepFields) {
        const value = values[field.id] || '';
        if (field.required && !value.trim()) {
          newErrors[field.id] = `${field.label} is required`;
        }
        if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors[field.id] = 'Please enter a valid email address';
        }
        if (field.type === 'phone' && value && !/^[\d\s+()-]{6,20}$/.test(value)) {
          newErrors[field.id] = 'Please enter a valid phone number';
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [template.fields, values]
  );

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < totalSteps) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const buildLeadPayload = () => {
    const payload: Record<string, string | null> = {
      organization_id: organizationId,
      source,
      source_url: sourceUrl || null,
    };

    for (const field of template.fields) {
      const value = values[field.id] || '';
      if (field.mapTo && value) {
        payload[field.mapTo] = value;
      }
    }

    // Collect unmapped fields as custom_fields
    const customFields: Record<string, string> = {};
    for (const field of template.fields) {
      if (!field.mapTo && values[field.id]) {
        customFields[field.id] = values[field.id];
      }
    }
    if (Object.keys(customFields).length > 0) {
      payload.custom_fields = JSON.stringify(customFields);
    }

    return payload;
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    // Anti-spam check
    if (honeypot) return;

    setIsSubmitting(true);
    try {
      const payload = buildLeadPayload();
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      setIsSuccess(true);
      onSuccess?.();
    } catch {
      setErrors({ _form: 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <FormSuccessState
        title={template.settings.successTitle}
        message={template.settings.successMessage}
        className={className}
      />
    );
  }

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 24 : -24,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -24 : 24,
      opacity: 0,
    }),
  };

  return (
    <div className={className}>
      {/* Progress */}
      {template.settings.showProgressBar && totalSteps > 1 && (
        <FormProgress steps={template.steps} currentStep={currentStep} className="mb-8" />
      )}

      {/* Step title */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`title-${currentStep}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[var(--od-text-primary)] tracking-tight">
              {template.steps[currentStep - 1]?.title}
            </h2>
            {template.steps[currentStep - 1]?.description && (
              <p className="text-sm text-[var(--od-text-tertiary)] mt-1">
                {template.steps[currentStep - 1].description}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Fields */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`fields-${currentStep}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          {/* Two-column grid for short fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentFields
              .filter((f) => f.type !== 'textarea')
              .map((field: FormField) => (
                <div key={field.id} className={field.type === 'select' ? 'sm:col-span-1' : ''}>
                  <FormFieldRenderer
                    field={field}
                    value={values[field.id] || ''}
                    onChange={(val) => handleFieldChange(field.id, val)}
                    error={errors[field.id]}
                  />
                </div>
              ))}
          </div>
          {/* Full width for textareas */}
          {currentFields
            .filter((f) => f.type === 'textarea')
            .map((field: FormField) => (
              <FormFieldRenderer
                key={field.id}
                field={field}
                value={values[field.id] || ''}
                onChange={(val) => handleFieldChange(field.id, val)}
                error={errors[field.id]}
              />
            ))}
        </motion.div>
      </AnimatePresence>

      {/* Honeypot */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <input
          type="text"
          name="website_url_confirm"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {/* Form error */}
      {errors._form && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-[#EF6C6C] mt-4"
          role="alert"
        >
          {errors._form}
        </motion.p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--od-border-subtle)]">
        <div>
          {currentStep > 1 && (
            <Button variant="ghost" size="md" onClick={handleBack} type="button">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentStep < totalSteps ? (
            <Button size="lg" onClick={handleNext} type="button">
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleSubmit}
              type="button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {template.settings.submitButtonText}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Trust indicator */}
      <div className="flex items-center justify-center gap-1.5 mt-5">
        <Shield className="w-3 h-3 text-[var(--od-text-muted)]" />
        <p className="text-[11px] text-[var(--od-text-muted)]">
          Your information is secure and will never be shared.
        </p>
      </div>
    </div>
  );
}

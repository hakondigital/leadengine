import type { FormField, FormStep, FormSettings } from './database.types';

// Industry-specific form templates
export interface FormTemplate {
  id: string;
  name: string;
  industry: string;
  fields: FormField[];
  steps: FormStep[];
  settings: FormSettings;
}

const defaultSettings: FormSettings = {
  submitButtonText: 'Submit Enquiry',
  successTitle: 'Thank You',
  successMessage: "We've received your enquiry and will be in touch shortly.",
  showProgressBar: true,
  accentColor: '#4FD1E5',
  enableAntiSpam: true,
};

export const formTemplates: FormTemplate[] = [
  {
    id: 'general',
    name: 'General Service Enquiry',
    industry: 'general',
    steps: [
      { id: 1, title: 'About You', description: 'Tell us who you are' },
      { id: 2, title: 'Your Project', description: 'What do you need help with?' },
      { id: 3, title: 'Details', description: 'A few more details' },
    ],
    fields: [
      { id: 'first_name', type: 'text', label: 'First Name', placeholder: 'John', required: true, step: 1, mapTo: 'first_name' },
      { id: 'last_name', type: 'text', label: 'Last Name', placeholder: 'Smith', required: true, step: 1, mapTo: 'last_name' },
      { id: 'email', type: 'email', label: 'Email', placeholder: 'john@example.com', required: true, step: 1, mapTo: 'email' },
      { id: 'phone', type: 'phone', label: 'Phone', placeholder: '04XX XXX XXX', required: false, step: 1, mapTo: 'phone' },
      { id: 'service_type', type: 'select', label: 'Service Type', required: true, step: 2, mapTo: 'service_type', options: [
        { label: 'Consultation', value: 'consultation' },
        { label: 'New Project', value: 'new_project' },
        { label: 'Maintenance / Repair', value: 'maintenance' },
        { label: 'Renovation', value: 'renovation' },
        { label: 'Other', value: 'other' },
      ]},
      { id: 'urgency', type: 'select', label: 'How soon do you need this?', required: true, step: 2, mapTo: 'urgency', options: [
        { label: 'ASAP — Emergency', value: 'asap' },
        { label: 'Within a week', value: 'within_week' },
        { label: 'Within a month', value: 'within_month' },
        { label: 'No rush — planning ahead', value: 'no_rush' },
      ]},
      { id: 'budget_range', type: 'select', label: 'Budget Range', required: false, step: 2, mapTo: 'budget_range', options: [
        { label: 'Under $1,000', value: 'under_1k' },
        { label: '$1,000 — $5,000', value: '1k_5k' },
        { label: '$5,000 — $15,000', value: '5k_15k' },
        { label: '$15,000 — $50,000', value: '15k_50k' },
        { label: '$50,000+', value: '50k_plus' },
        { label: 'Not sure yet', value: 'unsure' },
      ]},
      { id: 'location', type: 'text', label: 'Suburb / Area', placeholder: 'e.g. Bondi, Sydney', required: false, step: 3, mapTo: 'location' },
      { id: 'message', type: 'textarea', label: 'Tell us about your project', placeholder: 'Describe what you need...', required: false, step: 3, mapTo: 'message' },
    ],
    settings: defaultSettings,
  },
  {
    id: 'electrical',
    name: 'Electrical Services',
    industry: 'electrical',
    steps: [
      { id: 1, title: 'Contact Details', description: 'How can we reach you?' },
      { id: 2, title: 'Job Details', description: 'Tell us about the work needed' },
      { id: 3, title: 'Schedule', description: 'When and where' },
    ],
    fields: [
      { id: 'first_name', type: 'text', label: 'First Name', required: true, step: 1, mapTo: 'first_name' },
      { id: 'last_name', type: 'text', label: 'Last Name', required: true, step: 1, mapTo: 'last_name' },
      { id: 'email', type: 'email', label: 'Email', required: true, step: 1, mapTo: 'email' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, step: 1, mapTo: 'phone' },
      { id: 'project_type', type: 'select', label: 'Type of Work', required: true, step: 2, mapTo: 'project_type', options: [
        { label: 'Power Points & Wiring', value: 'power_wiring' },
        { label: 'Lighting Installation', value: 'lighting' },
        { label: 'Switchboard Upgrade', value: 'switchboard' },
        { label: 'Safety Inspection', value: 'inspection' },
        { label: 'Fault Finding & Repair', value: 'fault_repair' },
        { label: 'Smoke Alarms', value: 'smoke_alarms' },
        { label: 'EV Charger', value: 'ev_charger' },
        { label: 'Other', value: 'other' },
      ]},
      { id: 'service_type', type: 'select', label: 'Property Type', required: true, step: 2, mapTo: 'service_type', options: [
        { label: 'Residential — House', value: 'residential_house' },
        { label: 'Residential — Unit / Apartment', value: 'residential_unit' },
        { label: 'Commercial', value: 'commercial' },
        { label: 'Industrial', value: 'industrial' },
      ]},
      { id: 'urgency', type: 'select', label: 'Urgency', required: true, step: 3, mapTo: 'urgency', options: [
        { label: 'Emergency — today', value: 'emergency' },
        { label: 'Within 2-3 days', value: 'soon' },
        { label: 'This week', value: 'this_week' },
        { label: 'Flexible', value: 'flexible' },
      ]},
      { id: 'location', type: 'text', label: 'Suburb', required: true, step: 3, mapTo: 'location' },
      { id: 'message', type: 'textarea', label: 'Additional Details', required: false, step: 3, mapTo: 'message' },
    ],
    settings: {
      ...defaultSettings,
      submitButtonText: 'Request Quote',
      successMessage: "Thanks for your enquiry. We'll review your request and get back to you within 1 business hour.",
    },
  },
  {
    id: 'building',
    name: 'Building & Construction',
    industry: 'building',
    steps: [
      { id: 1, title: 'Your Details', description: 'Contact information' },
      { id: 2, title: 'Project Scope', description: 'What are you building?' },
      { id: 3, title: 'Timeline & Budget', description: 'Planning details' },
    ],
    fields: [
      { id: 'first_name', type: 'text', label: 'First Name', required: true, step: 1, mapTo: 'first_name' },
      { id: 'last_name', type: 'text', label: 'Last Name', required: true, step: 1, mapTo: 'last_name' },
      { id: 'email', type: 'email', label: 'Email', required: true, step: 1, mapTo: 'email' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, step: 1, mapTo: 'phone' },
      { id: 'project_type', type: 'select', label: 'Project Type', required: true, step: 2, mapTo: 'project_type', options: [
        { label: 'New Build', value: 'new_build' },
        { label: 'Renovation', value: 'renovation' },
        { label: 'Extension', value: 'extension' },
        { label: 'Bathroom', value: 'bathroom' },
        { label: 'Kitchen', value: 'kitchen' },
        { label: 'Deck / Outdoor', value: 'deck_outdoor' },
        { label: 'Structural Repair', value: 'structural' },
        { label: 'Other', value: 'other' },
      ]},
      { id: 'service_type', type: 'select', label: 'Property Type', required: true, step: 2, mapTo: 'service_type', options: [
        { label: 'Residential', value: 'residential' },
        { label: 'Commercial', value: 'commercial' },
        { label: 'Multi-dwelling', value: 'multi_dwelling' },
      ]},
      { id: 'budget_range', type: 'select', label: 'Approximate Budget', required: false, step: 3, mapTo: 'budget_range', options: [
        { label: 'Under $10,000', value: 'under_10k' },
        { label: '$10,000 — $50,000', value: '10k_50k' },
        { label: '$50,000 — $150,000', value: '50k_150k' },
        { label: '$150,000 — $500,000', value: '150k_500k' },
        { label: '$500,000+', value: '500k_plus' },
        { label: 'Not sure yet', value: 'unsure' },
      ]},
      { id: 'timeframe', type: 'select', label: 'When do you want to start?', required: true, step: 3, mapTo: 'timeframe', options: [
        { label: 'As soon as possible', value: 'asap' },
        { label: 'Next month', value: 'next_month' },
        { label: 'In 2-3 months', value: '2_3_months' },
        { label: 'In 6+ months', value: '6_months_plus' },
        { label: 'Just getting quotes', value: 'quoting' },
      ]},
      { id: 'location', type: 'text', label: 'Project Location', required: true, step: 3, mapTo: 'location' },
      { id: 'message', type: 'textarea', label: 'Project Description', required: false, step: 3, mapTo: 'message' },
    ],
    settings: {
      ...defaultSettings,
      submitButtonText: 'Get a Quote',
      successMessage: "Thank you for your building enquiry. We'll review the details and be in touch within 24 hours.",
    },
  },
];

export function getTemplate(id: string): FormTemplate | undefined {
  return formTemplates.find((t) => t.id === id);
}

export function getDefaultTemplate(): FormTemplate {
  return formTemplates[0];
}

import { GenericFieldType } from '../models/generic-config.model';

// Your existing custom types under shared/components/forms/formly/*
export const TAILWIND_TYPE_MAP: Record<GenericFieldType, string> = {
  text: 'tailwind-input',
  textarea: 'tailwind-textarea',
  number: 'tailwind-input',
  date: 'tailwind-input',
  email: 'tailwind-input',
  boolean: 'tailwind-checkbox',
  select: 'tailwind-select',
  multiselect: 'tailwind-multiselect',
  relation: 'tailwind-select',
  file: 'tailwind-file-upload',
};

// @ngx-formly/primeng ships input/select/checkbox/radio/datepicker/textarea
// out of the box. It does NOT ship multiselect or file-upload types — those
// need a small custom type wrapping p-multiSelect / p-fileUpload yourself,
// exactly the way you already wrote the tailwind- ones. Confirm the exact
// key strings against your installed @ngx-formly/primeng version's docs
// before shipping — Formly's UI packages have renamed a couple of keys
// across major versions.
export const PRIMENG_TYPE_MAP: Record<GenericFieldType, string> = {
  text: 'input',
  textarea: 'textarea',
  number: 'input',
  date: 'datepicker',
  email: 'input',
  boolean: 'checkbox',
  select: 'select',
  multiselect: 'prime-multiselect', // custom — not in @ngx-formly/primeng
  relation: 'select',
  file: 'prime-file-upload', // custom — not in @ngx-formly/primeng
};

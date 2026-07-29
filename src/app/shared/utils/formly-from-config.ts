import { FormlyFieldConfig } from '@ngx-formly/core';
import {
  GenericTableConfig,
  GenericFieldType,
  GenericFieldConfig,
  localize,
} from '../models/generic-config.model';
import {
  GenericOptionsService,
  getPath,
} from '../services/generic-options.service';
import { TAILWIND_TYPE_MAP } from './formly-types-map';

export function buildFormlyFields<T>(
  config: GenericTableConfig<T>,
  mode: 'create' | 'edit',
  optionsService: GenericOptionsService,
  typeMap: Record<GenericFieldType, string> = TAILWIND_TYPE_MAP,
): FormlyFieldConfig[] {
  return config.fields
    .filter((f) => !f.hide && !f.useToFetch && f.actions?.[mode] !== false)
    .map((f) => buildField(f, mode, optionsService, typeMap));
}

function buildField<T>(
  f: GenericFieldConfig<T>,
  mode: 'create' | 'edit',
  optionsService: GenericOptionsService,
  typeMap: Record<GenericFieldType, string>,
): FormlyFieldConfig {
  const field: FormlyFieldConfig = {
    key: f.key,
    type: typeMap[f.type],
    className: f.className ?? 'col-span-12 md:col-span-6',
    defaultValue: f.defaultValue,
    props: {
      label: localize(f.label),
      required: !!f.validations?.required,
      disabled: !!f.validations?.readonly,
      type:
        f.type === 'number'
          ? 'number'
          : f.type === 'date'
            ? 'date'
            : f.type === 'email'
              ? 'email'
              : undefined,
    },
  };

  if (f.options?.kind === 'static') {
    field.props!['options'] = f.options.values.map((v) => ({
      label: localize(v.label),
      value: v.value,
    }));
  }

  if (f.options?.kind === 'remote') {
    const remote = f.options;
    field.hooks = {
      ...field.hooks,
      onInit: (fld) => {
        const model = fld.model ?? {};
        optionsService
          .search(remote, model)
          .subscribe((opts) => (fld.props!['options'] = opts));
      },
    };
    if (remote.dependsOn?.length) {
      field.expressionProperties = {
        ...(field as any).expressionProperties,
        // re-resolve options whenever a depended-on field changes value
        'model.__optionsRefreshTrigger': (model: any) =>
          remote.dependsOn!.map((d) => model?.[d.formKey]).join('|'),
      };
      field.hooks!.onChanges = (fld) => {
        fld.formControl?.parent?.valueChanges.subscribe((model) => {
          optionsService
            .search(remote, model)
            .subscribe((opts) => (fld.props!['options'] = opts));
        });
      };
    }
  }

  if (f.autocomplete) {
    const ac = f.autocomplete;
    field.hooks = {
      ...field.hooks,
      onInit: (fld) => {
        fld.form?.get(ac.watch)?.valueChanges.subscribe(async (id) => {
          if (id == null) return;
          const related = await optionsService.fetchRelated(ac.watch, id);
          fld.formControl?.setValue(getPath(related, ac.sourcePath));
        });
      },
    };
  }

  return field;
}

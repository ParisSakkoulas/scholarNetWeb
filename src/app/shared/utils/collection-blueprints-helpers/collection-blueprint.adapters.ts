import { FormlyFieldConfig } from '@ngx-formly/core';
import {
  CollectionBlueprint,
  TableColumn,
  ResolvedTableConfig,
} from '../../types/Collection-Blueprint/collection-blueprint.types';

export function toTableColumns<T>(
  blueprint: CollectionBlueprint<T>,
): TableColumn<T>[] {
  return blueprint.fields
    .filter((f) => f.table?.show !== false)
    .map((f) => ({
      field: f.key,
      header: f.label,
      sortable: f.table?.sortable,
      width: f.table?.width,
      hidden: f.table?.hidden,
      format: f.table?.format,
    }));
}

/** Table-level settings with defaults filled in. */
export function toTableConfig<T>(
  blueprint: CollectionBlueprint<T>,
): ResolvedTableConfig {
  const t = blueprint.table ?? {};
  return {
    pageSize: t.pageSize ?? 10,
    pageSizeOptions: t.pageSizeOptions ?? [10, 25, 50],
    defaultSort: t.defaultSort,
    emptyMessage: t.emptyMessage ?? 'Nothing here yet.',
    columnChooser: t.columnChooser ?? false,
    search: t.search ?? false,
    searchPlaceholder: t.searchPlaceholder ?? 'Search...',
  };
}

export function toFormlyFields<T>(
  blueprint: CollectionBlueprint<T>,
): FormlyFieldConfig[] {
  return blueprint.fields
    .filter((f) => f.form && f.form.show !== false && f.form.type)
    .sort((a, b) => (a.form!.order ?? 0) - (b.form!.order ?? 0))
    .map((f) => ({
      key: f.key,
      type: f.form!.type,
      props: { label: f.label, ...f.form!.props },
      validators: f.form!.validators,
    }));
}

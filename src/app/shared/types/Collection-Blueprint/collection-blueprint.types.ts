import { FormlyFieldConfig } from '@ngx-formly/core';

/** What the generic table needs for one column. Derived from a blueprint. */
export interface TableColumn<T = any> {
  field: keyof T & string;
  header: string;
  sortable?: boolean;
  width?: string;
  /** Off by default, but the user can turn it on in the column chooser. */
  hidden?: boolean;
  /** Turns the raw value into display text (dates, enums, ...). */
  format?: (value: any, row: T) => string;
}

export interface RowAction<T = any> {
  icon: string;
  /** Accessible name for the icon-only button. */
  label?: string;
  handler: (row: T) => void;
}

/** Table-level settings that apply to the whole collection. */
export interface TableConfig {
  /** Rows per page. Default 10. */
  pageSize?: number;
  /** Choices in the rows-per-page dropdown. Default [10, 25, 50]. */
  pageSizeOptions?: number[];
  /** Sort applied on first load. */
  defaultSort?: { field: string; order: 'asc' | 'desc' };
  /** Text shown when there are no rows. */
  emptyMessage?: string;
  /** Show a "Columns" picker so the user can show or hide columns. The choice is remembered per blueprint. */
  columnChooser?: boolean;
  /** Show a global search box. The backend does the actual filtering — see PageQuery.search. */
  search?: boolean;
  /** Placeholder text for the search box. Default "Search...". */
  searchPlaceholder?: string;
}

/** TableConfig with every default filled in (see toTableConfig). */
export interface ResolvedTableConfig {
  pageSize: number;
  pageSizeOptions: number[];
  defaultSort?: { field: string; order: 'asc' | 'desc' };
  emptyMessage: string;
  columnChooser: boolean;
  search: boolean;
  searchPlaceholder: string;
}

/** One field, with its table behavior and its form behavior side by side. */
export interface FieldBlueprint<T> {
  key: keyof T & string;
  label: string;

  /**
   * Omit `table` entirely and the field still shows as a column.
   * `show: false` means never a column. `hidden: true` means off by default
   * but available in the column chooser.
   */
  table?: {
    show?: boolean;
    hidden?: boolean;
    sortable?: boolean;
    width?: string;
    format?: (value: any, row: T) => string;
  };

  /** Omit `form` (or set `show: false`) and the field is left out of the form. */
  form?: {
    show?: boolean;
    type?: string; // 'input' | 'textarea' | 'select' | ...
    props?: Record<string, any>; // Formly props: required, options, placeholder, ...
    validators?: FormlyFieldConfig['validators'];
    order?: number;
  };
}

/** One config per entity. Drives the table columns, the table settings and the form fields. */
export interface CollectionBlueprint<T> {
  name: string;
  /** Table-level settings: page size, default sort, column chooser, empty message. */
  table?: TableConfig;
  fields: FieldBlueprint<T>[];
}

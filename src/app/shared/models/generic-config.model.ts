// shared/models/generic-config.model.ts
//
// One config object per entity drives: table columns, create form,
// edit form, list filters, bulk actions, and export column mapping.
// Field-level `key` is `keyof T` so authoring a config for a real
// entity gets autocomplete + compile errors on typos; the JSON this
// eventually gets stored/served as is just the erased, stringly-typed
// version of the same shape.

export type LocalizedText = string | Record<string, string>;

export type GenericFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'email'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'relation'
  | 'file';

/** A fixed list of choices you already have in memory. */
export interface StaticOptions {
  kind: 'static';
  values: { label: LocalizedText; value: any }[];
}

/**
 * A list fetched from the backend, optionally re-fetched whenever
 * fields it depends on change (cascading selects: country -> state -> city).
 */
export interface RemoteOptions {
  kind: 'remote';
  url: string; // e.g. 'locations/states'
  searchField: string; // field the backend text-searches on
  valueField: string; // field used as the option value
  titleField: string; // field used as the option label
  dependsOn?: { formKey: string; searchKey: string }[];
}

export type FieldOptions = StaticOptions | RemoteOptions;

/** Prefill this field from a related record when another field changes. */
export interface AutocompleteConfig {
  watch: string; // form key to watch, e.g. 'authorCode'
  sourcePath: string; // dotted path on the fetched related record, e.g. 'author.affiliation'
}

/** Marks this field as a reference to a document in another collection — not just a static dropdown. */
export interface RelationshipConfig {
  relatedCollection: string;
  relatedField: string; // field on the related collection this value matches
  displayField: string; // field to show the user
  cardinality: 'oneToOne' | 'oneToMany' | 'manyToMany';
}

/**
 * Per-context visibility. A field can be listable but not creatable
 * (computed columns), searchable via the global filter without being
 * a visible column, editable individually but not in a bulk edit, etc.
 * Anything omitted defaults to true — only set what you want to turn OFF.
 */
export interface FieldActions {
  create?: boolean;
  edit?: boolean;
  view?: boolean;
  list?: boolean;
  globalFilter?: boolean;
  massAction?: boolean;
}

export interface FieldValidations {
  required?: boolean;
  readonly?: boolean;
  unique?: boolean; // hint for an async validator hitting /api/{endpoint}/check-unique
}

export interface TableColumnSettings {
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  order?: number; // column position in the table
  exportOrder?: number; // column position in exports, can differ from table order
  width?: string;
}

export interface GenericFieldConfig<T = any> {
  key: keyof T & string;
  type: GenericFieldType;
  label: LocalizedText;

  /** Raw tailwind grid classes, e.g. 'col-span-12 md:col-span-4' or 'col-span-12 ml-auto'.
   *  A raw string beats a fixed 1-4 enum once real forms need irregular layouts. */
  className?: string;

  /** Hard kill switch — hidden everywhere regardless of `actions` below. */
  hide?: boolean;
  /** Value is only read to resolve another field (e.g. a code used to drive a relation fetch) — never rendered. */
  useToFetch?: boolean;

  actions?: FieldActions;
  validations?: FieldValidations;
  table?: TableColumnSettings;

  options?: FieldOptions;
  autocomplete?: AutocompleteConfig;
  relationship?: RelationshipConfig;

  defaultValue?: any;
  /** Table cell override — falls back to type-based formatting (date, boolean, multiselect join, etc). */
  formatter?: (value: any, row: T) => string;
}

/** Display-only, computed/joined fields — never part of the editable model or the save payload. */
export interface VirtualFieldConfig<T = any> {
  key: string;
  label: LocalizedText;
  compute: (row: T) => string;
}

export interface PageAction {
  alias: string;
  label: LocalizedText;
  icon?: string;
  position?: 'left' | 'right';
  style?: 'primary' | 'secondary' | 'danger';
  successMessage?: LocalizedText;
  failureMessage?: LocalizedText;
}

export interface GenericTableConfig<T = any> {
  entityName: string;
  idKey: keyof T & string;
  urlEndpoint: string; // e.g. 'publications' -> your NestJS route
  title: LocalizedText;

  fields: GenericFieldConfig<T>[];
  virtualFields?: VirtualFieldConfig<T>[];

  tableSettings?: {
    defaultSort?: string; // Mongo-style: '-year' = desc by year
    itemsPerPage?: number;
    rowsPerPageOptions?: number[];
    lazy?: boolean; // server-side pagination/sort/filter
    createMode?: 'dialog' | 'page';
  };

  tableActions?: {
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    search?: boolean;
    export?: boolean;
    massAction?: boolean;
  };

  pageActions?: PageAction[];
}

/** Resolve a LocalizedText to a plain string for the current locale. */
export function localize(
  value: LocalizedText | undefined,
  locale = 'en',
): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? Object.values(value)[0] ?? '';
}

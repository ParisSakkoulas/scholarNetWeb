import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';

import {
  GenericTableConfig,
  GenericFieldType,
} from '../../models/generic-config.model';
import { GenericOptionsService } from '../../services/generic-options.service';
import { buildFormlyFields } from '../../utils/formly-from-config';
import { TAILWIND_TYPE_MAP } from '../../utils/formly-types-map';

@Component({
  selector: 'app-generic-form',
  imports: [ReactiveFormsModule, FormlyModule],
  templateUrl: './generic-form.component.html',
  styleUrl: './generic-form.component.css',
})
export class GenericFormComponent<
  T extends Record<string, any>,
> implements OnChanges {
  @Input() config!: GenericTableConfig<T>;
  @Input() model: Partial<T> = {};
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() typeMap: Record<GenericFieldType, string> = TAILWIND_TYPE_MAP;
  @Output() save = new EventEmitter<Partial<T>>();
  @Output() cancel = new EventEmitter<void>();

  form = new FormGroup({});
  fields: FormlyFieldConfig[] = [];

  constructor(private optionsService: GenericOptionsService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config'] || changes['mode'] || changes['typeMap']) {
      this.fields = buildFormlyFields(
        this.config,
        this.mode,
        this.optionsService,
        this.typeMap,
      );
    }
  }

  onSubmit() {
    if (this.form.valid) this.save.emit(this.model as T);
  }
}

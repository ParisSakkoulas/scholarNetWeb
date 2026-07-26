import { Component, input, output } from '@angular/core';


import { Toast } from '../../../../core/models/toast.model';

@Component({
  selector: 'sn-toast',
  imports: [],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  toast = input.required<Toast>();
  onDismiss = output<string>();

  dismiss() {
    this.onDismiss.emit(this.toast().id);
  }
}

import { Component, inject } from '@angular/core';

import { ToastService } from '../../../../../core/services/toast.service';
import { ToastComponent } from '../toast.component';

@Component({
  selector: 'sn-toast-container',
  imports: [ToastComponent],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css'
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

}

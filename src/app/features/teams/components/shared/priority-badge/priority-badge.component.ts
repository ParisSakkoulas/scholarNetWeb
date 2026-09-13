import { CommonModule } from '@angular/common';
import { Component, computed, Input, signal } from '@angular/core';

import { TaskPriority } from '../../../models/task.model';

@Component({
  selector: 'app-priority-badge',
  imports: [CommonModule],
  templateUrl: './priority-badge.component.html',
  styleUrl: './priority-badge.component.css',
})
export class PriorityBadgeComponent {
  @Input({ required: true }) set priority(value: TaskPriority) {
    this._priority.set(value);
  }

  private _priority = signal<TaskPriority>('medium');

  readonly label = computed(() => {
    const map: Record<TaskPriority, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    };
    return map[this._priority()];
  });

  readonly classes = computed(() => {
    const map: Record<TaskPriority, string> = {
      low: 'bg-slate-100 text-slate-600',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return map[this._priority()];
  });
}

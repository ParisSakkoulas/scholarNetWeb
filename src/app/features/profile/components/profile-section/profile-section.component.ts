import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/** Shell shared by every profile section (positions, education, skills,
 *  interests…): title row, owner-only "+" button and an empty state.
 *  The item list itself is projected in by the parent. */
@Component({
  selector: 'sn-profile-section',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './profile-section.component.html',
  styleUrl: './profile-section.component.css',
})
export class ProfileSectionComponent {
  readonly title = input.required<string>();
  /** true only for the profile owner — shows the add button */
  readonly editable = input(false);
  readonly isEmpty = input(false);
  readonly emptyText = input('Nothing added yet');
  readonly addLabel = input('Add');

  readonly add = output<void>();
}

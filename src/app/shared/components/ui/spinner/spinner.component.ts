import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'sn-spinner',
  imports: [CommonModule],
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.css'
})
export class SpinnerComponent {
  @Input() size: number = 160;
  @Input() theme: 'light' | 'dark' = 'light';

  get nodeColor(): string {
    return this.theme === 'dark' ? '#ffffff' : '#1F2733';
  }

  get lineColor(): string {
    return this.theme === 'dark' ? '#ffffff' : '#1F2733';
  }

  get hubColor(): string {
    return this.theme === 'dark' ? '#e87a85' : '#5C2128';
  }

}

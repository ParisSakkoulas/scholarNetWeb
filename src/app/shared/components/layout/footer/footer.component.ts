import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Divider } from 'primeng/divider';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, Divider],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}

import { Component } from '@angular/core';
import { HeaderComponent } from "../../shared/components/layout/header/header.component";
import { FooterComponent } from "../../shared/components/layout/footer/footer.component";
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  imports: [HeaderComponent, FooterComponent, CommonModule, RouterOutlet],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.css'
})
export class PublicLayoutComponent {

}

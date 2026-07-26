import { Component } from '@angular/core';
import { FooterComponent } from "../../shared/components/layout/footer/footer.component";
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { InlineHeaderComponent } from '../../shared/components/layout/inline-header/inline-header.component';

@Component({
  selector: 'app-main-layout',
  imports: [InlineHeaderComponent, FooterComponent, CommonModule, RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {

}

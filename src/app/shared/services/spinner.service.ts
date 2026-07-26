import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {

  private visible = signal(false);

  constructor() { }

  show() {
    this.visible.set(true);
  }

  hide() {
    this.visible.set(false);
  }



}

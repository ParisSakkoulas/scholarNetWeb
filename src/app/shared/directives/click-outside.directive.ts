import { Directive, ElementRef, EventEmitter, HostListener, inject, Output } from '@angular/core';

/**
 * Emits when a click happens outside the host element.
 * Usage: <div class="profile-menu" (appClickOutside)="profileMenuOpen.set(false)">
 *
 * Replaces the @ViewChild + @HostListener('document:click') + .contains()
 * pattern — no ref name to keep in sync between the .ts and .html anymore.
 */
@Directive({
    selector: '[appClickOutside]',
    standalone: true,
})
export class ClickOutsideDirective {
    private readonly elementRef = inject(ElementRef<HTMLElement>);

    @Output() appClickOutside = new EventEmitter<void>();

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const target = event.target as Node;
        if (!this.elementRef.nativeElement.contains(target)) {
            this.appClickOutside.emit();
        }
    }
}

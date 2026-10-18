import { Component, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectButtonModule } from 'primeng/selectbutton';
import { debounceTime, firstValueFrom, from, Subject, switchMap } from 'rxjs';

import { Profile } from '../../../core/models/profile.model';
import { Publication } from '../../../core/models/publication.model';
import { ProfileService } from '../../../core/services/profile.service';
import { PublicationsService } from '../../../core/services/publications.service';
import {
  buildCvDefinition,
  CV_SECTIONS,
  CvOptions,
  CvSection,
  DEFAULT_CV_OPTIONS,
} from './cv-builder';

const PAGE = 100;
const MAX_PAGES = 10;

/** pdfmake is large, so it is only fetched when a CV is actually generated. */
async function loadPdfMake() {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  (pdfMake as any).vfs = vfs;
  return pdfMake;
}

@Component({
  selector: 'app-cv',
  standalone: true,
  imports: [FormsModule, RouterLink, ButtonModule, CheckboxModule, SelectButtonModule],
  templateUrl: './cv.component.html',
})
export class CvComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly profiles = inject(ProfileService);
  private readonly publications = inject(PublicationsService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly userId = this.route.snapshot.paramMap.get('userId') ?? '';
  private readonly storageKey = `cvOptions:${this.userId}`;

  readonly sections = CV_SECTIONS;
  readonly contactToggles: { key: 'showLocation' | 'showWebsite' | 'showPhone'; label: string }[] = [
    { key: 'showLocation', label: 'Show city and country' },
    { key: 'showWebsite', label: 'Show website' },
    { key: 'showPhone', label: 'Show mobile phone' },
  ];
  readonly styleOptions = [
    { label: 'APA', value: 'apa' },
    { label: 'IEEE', value: 'ieee' },
  ];
  readonly groupOptions = [
    { label: 'By year', value: 'year' },
    { label: 'By type', value: 'type' },
    { label: 'None', value: 'none' },
  ];

  readonly options = signal<CvOptions>(this.restoreOptions());
  readonly profile = signal<Profile | null>(null);
  readonly pubs = signal<Publication[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly generating = signal(false);
  readonly previewUrl = signal<SafeResourceUrl | null>(null);

  private rawUrl: string | null = null;
  private readonly rebuild$ = new Subject<void>();

  constructor() {
    this.load();

    // rebuild the preview shortly after any option or data change
    effect(() => {
      this.options();
      this.profile();
      this.pubs();
      untracked(() => this.rebuild$.next());
    });
    this.rebuild$
      .pipe(
        debounceTime(350),
        switchMap(() => from(this.renderPreview())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
    this.destroyRef.onDestroy(() => this.rawUrl && URL.revokeObjectURL(this.rawUrl));
  }

  // ---------------- options ----------------

  toggleSection(key: CvSection, on: boolean): void {
    this.update({ sections: { ...this.options().sections, [key]: on } });
  }

  update(patch: Partial<CvOptions>): void {
    const next = { ...this.options(), ...patch };
    this.options.set(next);
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(next));
    } catch {
      // storage unavailable: preferences just are not remembered
    }
  }

  updateContact(key: 'showLocation' | 'showWebsite' | 'showPhone', on: boolean): void {
    this.update({ [key]: on });
  }

  reset(): void {
    this.update({ ...DEFAULT_CV_OPTIONS, sections: { ...DEFAULT_CV_OPTIONS.sections } });
  }

  private restoreOptions(): CvOptions {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) ?? 'null');
      if (saved) {
        return {
          ...DEFAULT_CV_OPTIONS,
          ...saved,
          sections: { ...DEFAULT_CV_OPTIONS.sections, ...saved.sections },
        };
      }
    } catch {
      // fall through to the defaults
    }
    return { ...DEFAULT_CV_OPTIONS, sections: { ...DEFAULT_CV_OPTIONS.sections } };
  }

  // ---------------- data ----------------

  private async load(): Promise<void> {
    try {
      const profile = await firstValueFrom(this.profiles.getProfile(this.userId));
      this.profile.set(profile);

      const all: Publication[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await firstValueFrom(
          this.publications.byUser(this.userId, { page, limit: PAGE }),
        );
        all.push(...res.data);
        if (all.length >= res.total || !res.data.length) break;
      }
      this.pubs.set(all);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Could not load the data for this CV.');
    } finally {
      this.loading.set(false);
    }
  }

  // ---------------- pdf ----------------

  private definition() {
    return buildCvDefinition(this.profile()!, this.pubs(), this.options());
  }

  private async renderPreview(): Promise<void> {
    if (!this.profile()) return;
    try {
      const pdfMake = await loadPdfMake();
      const blob = await new Promise<Blob>((resolve) =>
        pdfMake.createPdf(this.definition()).getBlob(resolve),
      );
      if (this.rawUrl) URL.revokeObjectURL(this.rawUrl);
      this.rawUrl = URL.createObjectURL(blob);
      this.previewUrl.set(
        this.sanitizer.bypassSecurityTrustResourceUrl(`${this.rawUrl}#toolbar=0`),
      );
    } catch {
      this.error.set('Could not build the PDF preview.');
    }
  }

  async download(): Promise<void> {
    const p = this.profile();
    if (!p) return;
    this.generating.set(true);
    try {
      const pdfMake = await loadPdfMake();
      const name = `${p.user.firstName}-${p.user.lastName}-CV`.replace(/\s+/g, '-');
      pdfMake.createPdf(this.definition()).download(`${name}.pdf`);
    } finally {
      this.generating.set(false);
    }
  }
}

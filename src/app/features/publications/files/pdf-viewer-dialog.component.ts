import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import type { Observable } from 'rxjs';

import { PublicationFilesService } from '../../../core/services/publication-files.service';
import { fileIcon } from './file-utils';

const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const STEP = 0.2;

/** pdf.js and its worker are only fetched when someone opens a viewer. */
async function loadPdfJs() {
  // older browsers lack Promise.withResolvers, which pdf.js 4 relies on
  const P = Promise as unknown as { withResolvers?: () => unknown };
  if (!P.withResolvers) {
    P.withResolvers = function <T>() {
      let resolve!: (v: T | PromiseLike<T>) => void;
      let reject!: (r?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
  const pdfjs = await import('pdfjs-dist');
  // the worker is copied to /pdfjs by angular.json
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  return pdfjs;
}

/** Lets other features reuse the viewer: where the bytes come from and how to save them. */
export interface PdfSource {
  fetch: () => Observable<Blob>;
  download: () => Observable<unknown>;
}

interface PageBox {
  num: number;
  width: number;
  height: number;
}

/**
 * Reads a PDF the signed-in user may download and shows it page by page. The bytes come
 * through the authenticated download call, so it follows exactly the same access rules, and
 * nothing is put in a URL.
 */
@Component({
  selector: 'app-pdf-viewer-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: './pdf-viewer-dialog.component.html',
})
export class PdfViewerDialogComponent implements AfterViewInit, OnDestroy {
  private readonly api = inject(PublicationFilesService);

  /** Publication files: the viewer fetches through the publications API. */
  readonly publicationId = input<string>('');
  readonly file = input.required<{ _id: string; name: string }>();
  /** Any other feature passes its own source instead of a publication id. */
  readonly source = input<PdfSource | null>(null);
  readonly closed = output<void>();

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pages = signal<PageBox[]>([]);
  readonly current = signal(1);
  readonly scale = signal(1);
  readonly percent = computed(() => Math.round(this.scale() * 100));
  readonly icon = fileIcon;

  private doc: PDFDocumentProxy | null = null;
  /** page size at scale 1 (every page is laid out from this, so zoom needs no re-measuring) */
  private baseSizes: { width: number; height: number }[] = [];
  private observer: IntersectionObserver | null = null;
  private renderTasks = new Map<number, RenderTask>();
  /** page -> the scale it was last drawn at */
  private drawn = new Map<number, number>();
  private destroyed = false;

  ngAfterViewInit(): void {
    void this.open();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    this.renderTasks.forEach((t) => t.cancel());
    void this.doc?.destroy();
  }

  // ---------------- loading ----------------

  private async open(): Promise<void> {
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        this.bytes$().subscribe({ next: resolve, error: reject }),
      );
      const pdfjs = await loadPdfJs();
      const data = new Uint8Array(await blob.arrayBuffer());
      const doc = await pdfjs.getDocument({ data }).promise;
      if (this.destroyed) {
        void doc.destroy();
        return;
      }
      this.doc = doc;

      for (let n = 1; n <= doc.numPages; n++) {
        const vp = (await doc.getPage(n)).getViewport({ scale: 1 });
        this.baseSizes.push({ width: vp.width, height: vp.height });
      }
      this.scale.set(this.fitWidthScale());
      this.layout();
      this.loading.set(false);
      // wait for the page boxes to exist before watching them
      setTimeout(() => this.observe());
    } catch (err) {
      this.loading.set(false);
      this.error.set(await this.messageFor(err));
    }
  }

  private bytes$(): Observable<Blob> {
    return this.source()?.fetch() ?? this.api.fetchBlob(this.publicationId(), this.file()._id);
  }

  private async messageFor(err: unknown): Promise<string> {
    console.error('PDF viewer failed', err);
    const e = err as { name?: string; message?: string; status?: number; error?: unknown };
    if (e?.name === 'PasswordException') return 'This PDF is password-protected and cannot be previewed.';
    if (e?.name === 'InvalidPDFException') return 'This file is not a valid PDF.';
    // a failed blob request hides the API's JSON message inside the blob
    if (e?.error instanceof Blob) {
      try {
        const body = JSON.parse(await e.error.text());
        return Array.isArray(body.message) ? body.message.join(' ') : (body.message ?? 'Could not open the file.');
      } catch {
        /* fall through to the technical detail */
      }
    }
    // keep the real reason visible: it is what tells a network problem from a viewer problem
    const detail =
      e?.status !== undefined
        ? `request failed (HTTP ${e.status})`
        : [e?.name, e?.message].filter(Boolean).join(': ');
    return `Could not open the file${detail ? ` – ${detail}` : ''}.`;
  }

  // ---------------- layout & rendering ----------------

  private fitWidthScale(): number {
    const width = (this.scroller()?.nativeElement.clientWidth ?? 800) - 32;
    const base = this.baseSizes[0]?.width ?? 600;
    return Math.min(1.6, Math.max(MIN_SCALE, width / base));
  }

  private layout(): void {
    const s = this.scale();
    this.pages.set(
      this.baseSizes.map((b, i) => ({
        num: i + 1,
        width: Math.floor(b.width * s),
        height: Math.floor(b.height * s),
      })),
    );
  }

  private observe(): void {
    const root = this.scroller()?.nativeElement;
    if (!root || this.destroyed) return;
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) void this.draw(Number((e.target as HTMLElement).dataset['page']));
        }
      },
      // start drawing a little before a page scrolls into view
      { root, rootMargin: '600px 0px' },
    );
    root.querySelectorAll<HTMLElement>('[data-page]').forEach((el) => this.observer!.observe(el));
  }

  private async draw(num: number): Promise<void> {
    const doc = this.doc;
    const root = this.scroller()?.nativeElement;
    if (!doc || !root || this.destroyed) return;
    const scale = this.scale();
    if (this.drawn.get(num) === scale) return;

    const canvas = root.querySelector<HTMLCanvasElement>(`[data-page="${num}"] canvas`);
    if (!canvas) return;
    this.renderTasks.get(num)?.cancel();

    const page = await doc.getPage(num);
    const ratio = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale });
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const task = page.render({
      canvasContext: ctx,
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
    });
    this.renderTasks.set(num, task);
    try {
      await task.promise;
      this.drawn.set(num, scale);
    } catch {
      /* cancelled by a newer render (zoom change); that one will finish the job */
    }
  }

  // ---------------- toolbar ----------------

  zoom(delta: number): void {
    this.setScale(Math.round((this.scale() + delta) * 100) / 100);
  }

  fit(): void {
    this.setScale(this.fitWidthScale());
  }

  private setScale(next: number): void {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    if (clamped === this.scale()) return;
    const el = this.scroller()?.nativeElement;
    // keep the same spot on the page when the page sizes change
    const ratio = el && el.scrollHeight ? el.scrollTop / el.scrollHeight : 0;
    this.scale.set(clamped);
    this.layout();
    this.drawn.clear();
    setTimeout(() => {
      if (el) el.scrollTop = ratio * el.scrollHeight;
      this.observe();
    });
  }

  zoomIn = () => this.zoom(STEP);
  zoomOut = () => this.zoom(-STEP);

  goTo(num: number): void {
    const n = Math.min(this.pages().length, Math.max(1, num));
    this.scroller()
      ?.nativeElement.querySelector(`[data-page="${n}"]`)
      ?.scrollIntoView({ block: 'start' });
    this.current.set(n);
  }

  /** the page nearest the top of the viewport is the "current" one */
  onScroll(): void {
    const root = this.scroller()?.nativeElement;
    if (!root) return;
    const top = root.getBoundingClientRect().top;
    let best = 1;
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-page]'))) {
      if (el.getBoundingClientRect().bottom - top > 80) {
        best = Number(el.dataset['page']);
        break;
      }
    }
    if (best !== this.current()) this.current.set(best);
  }

  onPageInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.goTo(Number(input.value) || this.current());
    input.value = String(this.current());
  }

  download(): void {
    const download$ = this.source()?.download() ?? this.api.download(this.publicationId(), this.file());
    download$.subscribe({
      error: () => this.error.set('Could not download the file.'),
    });
  }
}

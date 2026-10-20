// Angular basics
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { availabilityLabel } from './edit-profile/availability-options';
import { linkIcon, linkLabel } from './edit-profile/link-type-options';
import { EDITABLE_SECTIONS, PROFILE_SECTION_FORMS } from './configs/profile-section-forms';

import { ProfileSectionComponent } from './components/profile-section/profile-section.component';
import { map, Observable } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FollowListDialogComponent } from './components/follow-list-dialog/follow-list-dialog.component';
import { FollowsService } from '../../core/services/follows.service';
import {
  FollowCounts,
  FollowListMode,
  FollowStatus,
} from '../../core/models/follow.model';
import { ProfileItemDialogComponent } from './components/profile-item-dialog/profile-item-dialog.component';
import { SpinnerComponent } from '../../shared/components/ui/spinner/spinner.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ProfileService } from '../../core/services/profile.service';

import { ProfilePublicationsComponent } from './components/profile-publications/profile-publications.component';
import { UserService } from '../../core/services/user.service';
import {
  Profile,
  ProfilePosition,
  ProfileSectionKey,
  ProfileStat,
} from '../../core/models/profile.model';

type ProfileTab =
  | 'overview'
  | 'publications'
  | 'jobs'
  | 'interests'
  | 'education'
  | 'talks'
  | 'teaching'
  | 'network'
  | 'endorsements';

interface ProfileTabDef {
  id: ProfileTab;
  label: string;
  count?: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    SpinnerComponent,
    ButtonModule,
    TagModule,
    ProfileSectionComponent,
    ProfileItemDialogComponent,
    FollowListDialogComponent,
    ProfilePublicationsComponent,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly toastService = inject(ToastService);
  private readonly title = inject(Title);
  private readonly messages = inject(MessageService);
  private readonly followsService = inject(FollowsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmation = inject(ConfirmationService);

  private userService = inject(UserService);

  readonly profile = signal<Profile | null>(null);

  loading = signal(false);

  /** true when the profile being viewed belongs to the signed-in user —
   *  drives Edit profile/Generate CV vs Follow/Send message in the header. */
  /** Angular reuses this component when only :userId changes (e.g. opening a
   *  profile from the followers list), so follow the param, not a snapshot. */
  private readonly routeUserId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('userId'))),
    { initialValue: this.route.snapshot.paramMap.get('userId') },
  );

  readonly isOwnProfile = computed(() => {
    const targetId = this.routeUserId();
    const currentId = this.authService.currentUser()?.id;
    return !targetId || targetId === currentId;
  });

  readonly activeTab = signal<ProfileTab>('overview');

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // a different profile: clear everything that belonged to the last one
        this.profile.set(null);
        this.activeTab.set('overview');
        this.followList.set(null);
        this.followStatus.set({ isFollowing: false, isFollowedBy: false });
        this.followCounts.set({ followers: 0, following: 0 });
        this.loadProfile();
        window.scrollTo({ top: 0 });
      });
  }

  loadProfile() {
    this.loading.set(true);

    const targetId =
      this.route.snapshot.paramMap.get('userId') ??
      this.authService.currentUser()?.id;

    if (!targetId) {
      this.loading.set(false);
      return;
    }
    this.profileService.getProfile(targetId).subscribe({
      next: (response) => {
        this.profile.set(response);
        this.loading.set(false);
        this.loadFollowInfo(response.user._id);
      },
      error: () => this.loading.set(false),
    });
  }

  initials(profile: Profile): string {
    return `${profile.user.firstName[0] ?? ''}${profile.user.lastName[0] ?? ''}`.toUpperCase();
  }

  /** First position flagged current, falling back to the first entry so
   *  something sensible still shows if `current` was never set on import. */
  currentPosition(profile: Profile): ProfilePosition | undefined {
    return profile.positions.find((pos) => pos.current) ?? profile.positions[0];
  }

  editSection(section: string): void {
    const ownId = this.authService.currentUser()?.id;
    this.router.navigate([`/main/profile/${ownId}/edit`]);
  }

  /** Open item dialog: `item` set = editing that entry, unset = adding. */
  readonly dialog = signal<{
    section: ProfileSectionKey;
    item: Record<string, any> | null;
  } | null>(null);

  addItem(section: ProfileSectionKey): void {
    this.dialog.set({ section, item: null });
  }

  editItem(section: ProfileSectionKey, item: Record<string, any>): void {
    this.dialog.set({ section, item });
  }

  canEdit(section: ProfileSectionKey): boolean {
    return EDITABLE_SECTIONS.includes(section);
  }

  onItemSaved(): void {
    this.dialog.set(null);
    this.loadProfile();
  }

  removeItem(section: ProfileSectionKey, id: string): void {
    const noun = PROFILE_SECTION_FORMS[section].noun;
    this.confirmation.confirm({
      header: `Remove ${noun}`,
      message: `Are you sure you want to remove this ${noun}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Remove',
      rejectLabel: 'Cancel',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: () =>
        this.profileService.removeSection(section, id).subscribe({
          next: () => {
            this.messages.add({
              severity: 'success',
              summary: 'Removed',
              detail: `Your ${noun} was removed.`,
            });
            this.loadProfile();
          },
          error: (err) =>
            this.messages.add({
              severity: 'error',
              summary: 'Could not remove',
              detail: err?.error?.message ?? 'Something went wrong',
            }),
        }),
    });
  }

  // ---------------- FOLLOW ----------------

  readonly followCounts = signal<FollowCounts>({ followers: 0, following: 0 });
  readonly followStatus = signal<FollowStatus>({
    isFollowing: false,
    isFollowedBy: false,
  });
  readonly followBusy = signal(false);
  /** which list the connections dialog shows; null = closed */
  readonly followList = signal<FollowListMode | null>(null);

  private loadFollowInfo(userId: string): void {
    this.followsService
      .getCounts(userId)
      .subscribe({ next: (counts) => this.followCounts.set(counts) });

    if (!this.isOwnProfile() && this.authService.currentUser()) {
      this.followsService
        .getStatus(userId)
        .subscribe({ next: (status) => this.followStatus.set(status) });
    }
  }

  /** Follow / unfollow the profile being viewed. */
  followProfile(): void {
    const p = this.profile();
    if (!p || this.followBusy()) return;

    const wasFollowing = this.followStatus().isFollowing;
    const request$: Observable<unknown> = wasFollowing
      ? this.followsService.unfollow(p.user._id)
      : this.followsService.follow(p.user._id);

    this.followBusy.set(true);
    request$.subscribe({
      next: () => {
        this.followBusy.set(false);
        this.followStatus.update((s) => ({ ...s, isFollowing: !wasFollowing }));
        this.followCounts.update((c) => ({
          ...c,
          followers: Math.max(0, c.followers + (wasFollowing ? -1 : 1)),
        }));
        this.messages.add({
          severity: 'success',
          summary: wasFollowing ? 'Unfollowed' : 'Following',
          detail: `${p.user.firstName} ${p.user.lastName}`,
        });
      },
      error: (err) => {
        this.followBusy.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Could not update follow',
          detail: err?.error?.message ?? 'Something went wrong',
        });
      },
    });
  }

  messageProfile(): void {
    const p = this.profile();
    if (!p) return;
    this.router.navigate(['/main/messages'], {
      queryParams: { user: p.user._id },
    });
  }

  readonly linkIcon = linkIcon;
  readonly linkLabel = linkLabel;

  availabilityText(p: Profile): string {
    return (p.availability ?? []).map(availabilityLabel).join(', ');
  }

  displayUrl(url: string): string {
    return url.replace(/^https?:\/\//, '');
  }

  publicationCount(p: Profile): number {
    return p.publicationCount ?? p.yearlyPublications.reduce((sum, y) => sum + y.count, 0);
  }

  stats(p: Profile): ProfileStat[] {
    return [
      { value: String(this.publicationCount(p)), label: 'Publications' },
      { value: p.citationCount.toLocaleString(), label: 'Citations' },
      {
        value: String(p.hIndex),
        label: 'h-index',
        detail: `i10-index · ${p.i10Index}`,
      },
      { value: p.profileViews.toLocaleString(), label: 'Profile views' },
    ];
  }

  /** Counts default to undefined until the backing data exists — the
   *  template only renders a count badge when one is actually present
   *  (`@if (tab.count !== undefined)`), so this is safe to extend
   *  incrementally as each section gets built. */
  tabs(p: Profile): ProfileTabDef[] {
    return [
      { id: 'overview', label: 'Overview' },
      {
        id: 'publications',
        label: 'Publications',
        count: this.publicationCount(p),
      },
      { id: 'education', label: 'Education' },
      { id: 'jobs', label: 'Jobs' },
      { id: 'interests', label: 'Interests' },

      { id: 'talks', label: 'Talks' },

      { id: 'endorsements', label: 'Endorsements' },

      { id: 'teaching', label: 'Teaching' },
      { id: 'network', label: 'Network' },
    ];
  }

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
    document
      .getElementById(tab)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async copyToClipboard(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.toastService.success('Copied to clipboard!');
    } catch {
      this.toastService.success('Could not copy, try selecting it manually');
    }
  }
}

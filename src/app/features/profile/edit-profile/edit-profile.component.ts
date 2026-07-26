import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, computed, effect, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Profile, ProfilePosition, ProfileStat } from '../../../core/models/profile.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { SpinnerComponent } from '../../../shared/components/ui/spinner/spinner.component';

import { InputTextModule } from 'primeng/inputtext';



type ProfileTab = 'overview' | 'publications' | 'jobs' | 'interests' | 'education' | 'talks' | 'teaching' | 'network' | 'endorsements';


interface ProfileTabDef {
  id: ProfileTab;
  label: string;
  count?: number;
}

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, FormsModule, CommonModule, SpinnerComponent, InputTextModule],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.css',
})
export class EditProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly toastService = inject(ToastService);
  private readonly title = inject(Title);

  private userService = inject(UserService);

  readonly profile = signal<Profile | null>(null);

  loading = signal(false);

  private readonly fb = inject(NonNullableFormBuilder);

  readonly userForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });




  /** true when the profile being viewed belongs to the signed-in user —
   *  drives Edit profile/Generate CV vs Follow/Send message in the header. */
  readonly isOwnProfile = computed(() => {
    const targetId = this.route.snapshot.paramMap.get('userId');
    const currentId = this.authService.currentUser()?.id;
    return !targetId || targetId === currentId;
  });

  readonly activeTab = signal<ProfileTab>('overview');


  constructor() {
    // Repopulates both forms whenever the profile signal changes —
    // covers the initial load without a second ngOnInit branch.
    effect(() => {
      const p = this.profile();
      if (!p) return;

      this.userForm.patchValue({
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        username: p.user.username,
        email: p.user.email,
      });
    })
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile() {

    this.loading.set(true)


    const targetId =
      this.route.snapshot.paramMap.get('userId') ??
      this.authService.currentUser()?.id;

    if (!targetId) return;
    this.profileService.getProfile(targetId).subscribe({
      next: (response) => {
        this.profile.set(response);
        this.loading.set(false)

        // console.log(response)
      },
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
    this.router.navigate(['/main/profile', ownId], { queryParams: { section } });
  }

  followProfile(): void {
    // wire up once the follow endpoint exists, e.g.:
    // this.userService.follow(this.profile()!.user._id).subscribe(() =>
    //   this.toastService.show('Following — notifications enabled for this profile.')
    // );
  }



  messageProfile(): void {
    // this.router.navigate(['/messages', this.profile()!.user._id]);
  }

  displayUrl(url: string): string {
    return url.replace(/^https?:\/\//, '');
  }

  publicationCount(p: Profile): number {
    return p.yearlyPublications.reduce((sum, y) => sum + y.count, 0);
  }


  stats(p: Profile): ProfileStat[] {
    return [
      { value: String(this.publicationCount(p)), label: 'Publications' },
      { value: p.citationCount.toLocaleString(), label: 'Citations' },
      { value: String(p.hIndex), label: 'h-index', detail: `i10-index · ${p.i10Index}` },
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
      { id: 'publications', label: 'Publications', count: this.publicationCount(p) },
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
    document.getElementById(tab)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


  async copyToClipboard(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.toastService.success("Copied to clipboard!");


    } catch {
      this.toastService.success("Could not copy, try selecting it manually");

    }
  }


  saveUserBasicInfo() {

  }




}
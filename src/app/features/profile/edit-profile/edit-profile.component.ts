import {
  FormArray,
  FormGroup,
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import {
  Profile,
  ProfilePosition,
  ProfileStat,
} from '../../../core/models/profile.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { SpinnerComponent } from '../../../shared/components/ui/spinner/spinner.component';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { ProfileTab } from '../../../shared/types/Profile/profile-tab';
import { ProfileTabDef } from '../../../shared/interfaces/Profile/profiel-tab-definition';
import { ProfileLink } from '../../../shared/interfaces/Profile/profile-linkt';
import { linkTypeOptions } from './link-type-options';

import { Select } from 'primeng/select';
import { uniqueFieldValidator } from '../../../shared/utils/custom-validators/unique-field.validator';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    SpinnerComponent,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    SelectButtonModule,
    AutoCompleteModule,
    TabViewModule,
    ToastModule,
    Select,
  ],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.css',
  providers: [MessageService],
})
export class EditProfileComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  private userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  readonly activeTab = signal<ProfileTab>('overview');
  readonly profile = signal<Profile | null>(null);
  readonly availability = signal<string[]>([]);
  readonly languages = signal<string[]>([]);
  readonly languageInput = signal('');
  loading = signal(false);

  linkTypeOptions = linkTypeOptions;

  private currentUserId = '';
  private currentUsername = '';
  private currentEmail = '';

  readonly isOwnProfile = computed(() => {
    const targetId = this.route.snapshot.paramMap.get('userId');
    const currentId = this.authService.currentUser()?.id;
    return !targetId || targetId === currentId;
  });

  readonly userForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    username: [
      '',
      [Validators.required],
      [
        uniqueFieldValidator(
          (val) =>
            this.userService.checkUsernameExists(val, this.currentUserId),
          () => this.currentUsername,
        ),
      ],
    ],
    email: [
      '',
      [Validators.required, Validators.email],
      [
        uniqueFieldValidator(
          (val) => this.userService.checkEmailExists(val, this.currentUserId),
          () => this.currentEmail,
        ),
      ],
    ],
  });

  readonly profileForm = this.fb.group({
    bio: [''],
    city: [''],
    country: [''],
    timezone: [''],
    websiteUrl: [''],
    orcidId: [''],
    googleScholarId: [''],
    scopusId: [''],
    researcherId: [''],
    availability: this.fb.control<string[]>([]),
    languages: this.fb.control<string[]>([]),
    links: this.fb.array<FormGroup>([]),
  });

  readonly changePasswordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', Validators.required],
    confirmPassword: ['', Validators.required],
  });

  readonly deletAccountForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    currentPassword: ['', Validators.required],
  });

  readonly availabilityOptions = [
    { label: 'Available for collaboration', value: 'collaboration' },
    { label: 'Available for supervision', value: 'supervision' },
    { label: 'Open to consulting', value: 'consulting' },
    { label: 'Not currently available', value: 'unavailable' },
  ];

  toggleAvailability(option: string): void {
    this.availability.update((list) =>
      list.includes(option)
        ? list.filter((o) => o !== option)
        : [...list, option],
    );
  }

  addLanguage(): void {
    const value = this.languageInput().trim();
    if (!value || this.languages().includes(value)) return;
    this.languages.update((list) => [...list, value]);
    this.languageInput.set('');
  }

  removeLanguage(lang: string): void {
    this.languages.update((list) => list.filter((l) => l !== lang));
  }

  constructor() {
    effect(() => {
      const p = this.profile();
      if (!p) return;

      this.currentUserId = p.user._id;
      this.currentUsername = p.user.username;
      this.currentEmail = p.user.email;

      this.userForm.patchValue({
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        username: p.user.username,
        email: p.user.email,
      });
    });
  }

  ngOnInit(): void {
    this.loadProfile();
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
        this.profileForm.patchValue(response);
        this.patchLinks(response.links);
        this.loading.set(false);
      },
    });
  }

  initials(profile: Profile): string {
    return `${profile.user.firstName[0] ?? ''}${profile.user.lastName[0] ?? ''}`.toUpperCase();
  }

  currentPosition(profile: Profile): ProfilePosition | undefined {
    return profile.positions.find((pos) => pos.current) ?? profile.positions[0];
  }

  editSection(section: string): void {
    const ownId = this.authService.currentUser()?.id;
    this.router.navigate(['/main/profile', ownId], {
      queryParams: { section },
    });
  }

  onLanguageInput(event: { query: string }): void {}

  onLinkInput(event: { query: string }): void {}

  followProfile(): void {}

  messageProfile(): void {}

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
      {
        value: String(p.hIndex),
        label: 'h-index',
        detail: `i10-index · ${p.i10Index}`,
      },
      { value: p.profileViews.toLocaleString(), label: 'Profile views' },
    ];
  }

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

  get links(): FormArray<FormGroup> {
    return this.profileForm.get('links') as FormArray<FormGroup>;
  }

  private buildLinkGroup(link?: ProfileLink): FormGroup {
    return this.fb.group({
      type: [link?.type ?? 'website', Validators.required],
      url: [link?.url ?? '', [Validators.required]],
    });
  }

  addLink(): void {
    this.links.push(this.buildLinkGroup());
  }

  removeLink(index: number): void {
    this.links.removeAt(index);
  }

  patchLinks(existingLinks: ProfileLink[] | undefined): void {
    this.links.clear();
    (existingLinks ?? []).forEach((l) =>
      this.links.push(this.buildLinkGroup(l)),
    );
  }

  saveUserBasicInfo() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const userInfoChange = {
      firstName: this.userForm.value.firstName,
      lastName: this.userForm.value.lastName,
      username: this.userForm.value.username,
      email: this.userForm.value.email,
    };
  }

  saveProfileInfo(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const profileInfo = {
      bio: this.profileForm.value.bio,
      city: this.profileForm.value.city,
      country: this.profileForm.value.country,
      timezone: this.profileForm.value.timezone,
      websiteUrl: this.profileForm.value.websiteUrl,
      orcidId: this.profileForm.value.orcidId,
      googleScholarId: this.profileForm.value.googleScholarId,
      scopusId: this.profileForm.value.scopusId,
      researcherId: this.profileForm.value.researcherId,
      languages: this.profileForm.value.languages,
      availability: this.profileForm.value.availability,
      links: this.links.value,
    };

    this.profileService.updateProfileInfo(profileInfo).subscribe({
      next: (response) => {
        console.log(response);
        this.loading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Profile Info Updated Successfully!',
        });
      },

      error: (err) => {
        console.log('Err', err);
        this.loading.set(false);
        this.messageService.add({
          severity: 'danger',
          summary: 'Error',
          detail: 'Something went wrong',
        });
      },
    });
  }

  changePassword() {}

  deleteAccount() {}
}

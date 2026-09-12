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
import { Profile } from '../../../core/models/profile.model';
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
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { ProfileLink } from '../../../shared/interfaces/Profile/profile-linkt';
import { linkTypeOptions } from './link-type-options';

import { passwordMatchValidator } from '../../../features/auth/utils/helpers';

import { Select } from 'primeng/select';
import { uniqueFieldValidator } from '../../../shared/utils/custom-validators/unique-field.validator';

// This component's own tab set — distinct from ProfileTab, which belongs
// to the main profile page (overview/publications/jobs/etc.) and was
// imported here by mistake.
type SettingsTab = 'profile' | 'account' | 'email' | 'password' | 'delete';

interface SettingsTabDef {
  id: SettingsTab;
  label: string;
}

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

  readonly activeTab = signal<SettingsTab>('profile');

  readonly settingsTabs: SettingsTabDef[] = [
    { id: 'profile', label: 'Profile Info' },
    { id: 'account', label: 'Account Setting' },
    { id: 'email', label: 'Email' },
    { id: 'password', label: 'Change Password' },
    { id: 'delete', label: 'Delete Account' },
  ];

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

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

  readonly requestEmailForm = this.fb.group(
    {
      currentPassword: [
        '',
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/),
      ],

      confirmPassword: ['', Validators.required],
      newEmail: ['', [Validators.required, Validators.email]],
    },
    { validators: passwordMatchValidator },
  );

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

  onLanguageInput(event: { query: string }): void {}

  onLinkInput(event: { query: string }): void {}

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

  changeRequestEmail() {
    if (this.requestEmailForm.invalid) {
      this.requestEmailForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newEmail } = this.requestEmailForm.getRawValue();

    this.userService.requestEmailChange(currentPassword, newEmail).subscribe({
      next: (response) => {
        console.log(response);
      },
    });
  }

  changePassword() {}

  deleteAccount() {}
}

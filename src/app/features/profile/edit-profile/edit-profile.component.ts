import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
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
  CONTACT_VISIBILITY_OPTIONS,
  ContactVisibilityLevel, Profile } from '../../../core/models/profile.model';
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
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';

import { ProfileLink } from '../../../shared/interfaces/Profile/profile-linkt';
import { linkTypeOptions } from './link-type-options';
import { availabilityOptions } from './availability-options';

function passwordsMatch(a: string, b: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null =>
    group.get(a)?.value === group.get(b)?.value
      ? null
      : { passwordMismatch: true };
}

import { Select } from 'primeng/select';
import { uniqueFieldValidator } from '../../../shared/utils/custom-validators/unique-field.validator';

// This component's own tab set — distinct from ProfileTab, which belongs
// to the main profile page (overview/publications/jobs/etc.) and was
// imported here by mistake.
type SettingsTab =
  | 'profile'
  | 'account'
  | 'email'
  | 'password'
  | 'delete'
  | 'forgotPassword';

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
    PasswordModule,
    CheckboxModule,
    MessageModule,
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
    { id: 'forgotPassword', label: 'Forgot Passowrd' },
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
    website: [''],
    phone: ['', Validators.pattern(/^(\+?[0-9\s\-().]{6,24})?$/)],
    contactVisibility: this.fb.group({
      location: ['public' as ContactVisibilityLevel],
      website: ['public' as ContactVisibilityLevel],
      phone: ['private' as ContactVisibilityLevel],
    }),
    orcidId: [''],
    googleScholarId: [''],
    scopusId: [''],
    researcherId: [''],
    availability: this.fb.control<string[]>([]),
    languages: this.fb.control<string[]>([]),
    links: this.fb.array<FormGroup>([]),
  });

  readonly visibilityOptions = CONTACT_VISIBILITY_OPTIONS;

  readonly changePasswordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', Validators.required],
    confirmPassword: ['', Validators.required],
  });

  readonly forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly deletAccountForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    currentPassword: ['', Validators.required],
  });

  readonly requestEmailForm = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required],
      newEmail: ['', [Validators.required, Validators.email]],
    },
    { validators: passwordsMatch('currentPassword', 'confirmPassword') },
  );

  readonly availabilityOptions = availabilityOptions;

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

      this.forgotPasswordForm.patchValue({
        email: this.currentEmail,
      });

      this.forgotPasswordForm.controls.email.disable();
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

    const { firstName, lastName, username } = this.userForm.getRawValue();

    this.loading.set(true);
    this.userService
      .updateUserInfo({ firstName, lastName, username })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.currentUsername = username;
          this.authService.updateCurrentUser({ firstName, lastName, username });
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Account settings updated successfully!',
          });
        },
        error: (err) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message ?? 'Something went wrong',
          });
        },
      });
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
      website: this.profileForm.value.website?.trim() ?? '',
      phone: this.profileForm.value.phone?.trim() ?? '',
      contactVisibility: this.profileForm.getRawValue().contactVisibility,
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
          severity: 'error',
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

    this.loading.set(true);
    this.userService.requestEmailChange(currentPassword, newEmail).subscribe({
      next: () => {
        this.loading.set(false);
        this.requestEmailForm.reset();
        this.messageService.add({
          severity: 'success',
          summary: 'Check your inbox',
          detail: `We sent a confirmation link to ${newEmail}. Your email changes once you confirm it.`,
          life: 8000,
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Could not change email',
          detail: err?.error?.message ?? 'Something went wrong',
        });
      },
    });
  }

  forgotPassowrd() {
    this.loading.set(true);

    this.authService
      .forgotPassword(this.forgotPasswordForm.controls.email.value)
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.authService.logout();
        },

        error: (err) => {
          this.loading.set(false);

          console.log(err);
        },
      });
  }

  backToProfile(): void {
    const id =
      this.route.snapshot.paramMap.get('userId') ??
      this.authService.currentUser()?.id;

    this.router.navigate(['/main/profile', id]);
  }

  changePassword() {}

  deleteAccount() {}
}

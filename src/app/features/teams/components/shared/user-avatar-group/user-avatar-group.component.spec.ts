import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserAvatarGroupComponent } from './user-avatar-group.component';

describe('UserAvatarGroupComponent', () => {
  let component: UserAvatarGroupComponent;
  let fixture: ComponentFixture<UserAvatarGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAvatarGroupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserAvatarGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

type SettingsTab = 'profile' | 'account' | 'email' | 'password' | 'delete';

interface SettingsTabDef {
  id: SettingsTab;
  label: string;
}

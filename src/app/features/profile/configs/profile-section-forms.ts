import { ProfileSectionKey } from '../../../core/models/profile.model';

export type SectionFieldType = 'text' | 'year' | 'date' | 'checkbox';

export interface SectionField {
  key: string;
  label: string;
  type: SectionFieldType;
  required?: boolean;
}

/** Sections the API can PATCH (skills/interests are add/remove only). */
export const EDITABLE_SECTIONS: ProfileSectionKey[] = ['positions', 'education'];

export interface SectionFormConfig {
  header: string;
  /** singular noun, used in toasts and confirmations */
  noun: string;
  fields: SectionField[];
}

/** Field lists mirror the API DTOs in api/src/features/profile/dto. */
export const PROFILE_SECTION_FORMS: Record<ProfileSectionKey, SectionFormConfig> =
  {
    positions: {
      header: 'Position',
      noun: 'position',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'institution', label: 'Institution', type: 'text', required: true },
        { key: 'department', label: 'Department', type: 'text' },
        { key: 'startDate', label: 'Start date', type: 'date', required: true },
        { key: 'endDate', label: 'End date', type: 'date' },
        { key: 'current', label: 'I currently hold this position', type: 'checkbox' },
      ],
    },
    education: {
      header: 'Education',
      noun: 'education entry',
      fields: [
        { key: 'degree', label: 'Degree', type: 'text', required: true },
        { key: 'institution', label: 'Institution', type: 'text', required: true },
        { key: 'fieldOfStudy', label: 'Field of study', type: 'text' },
        { key: 'startYear', label: 'Start year', type: 'year', required: true },
        { key: 'endYear', label: 'End year', type: 'year' },
      ],
    },
    skills: {
      header: 'Skill',
      noun: 'skill',
      fields: [{ key: 'name', label: 'Skill', type: 'text', required: true }],
    },
    interests: {
      header: 'Interest',
      noun: 'interest',
      fields: [{ key: 'name', label: 'Interest', type: 'text', required: true }],
    },
  };

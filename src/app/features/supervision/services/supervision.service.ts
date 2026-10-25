import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { environment } from '../../../../environmets/environment';
import {
  ActionItem,
  ActionItemStatus,
  CommentStatus,
  DocumentComment,
  DocumentStatus,
  DocumentVersion,
  DraftState,
  ThesisDocument,
  ThesisDocumentDetail,
  InvitePayload,
  Meeting,
  MeetingStatus,
  MeetingWithItems,
  Milestone,
  MilestoneStatus,
  Supervision,
  SupervisionOverview,
} from '../models/supervision.model';

/** Dates go out as ISO strings (UTC); the UI shows them in the user's own zone. */
@Injectable({ providedIn: 'root' })
export class SupervisionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/supervisions`;
  private readonly docs = `${environment.apiUrl}/documents`;

  // ---- supervisions ----
  invite(payload: InvitePayload) {
    return this.http.post<Supervision>(this.base, payload);
  }
  respond(id: string, accept: boolean) {
    return this.http.patch<Supervision>(`${this.base}/${id}/respond`, { accept });
  }
  mine() {
    return this.http.get<Supervision[]>(this.base + '/mine');
  }
  students() {
    return this.http.get<Supervision[]>(this.base + '/students');
  }
  overview(id: string) {
    return this.http.get<SupervisionOverview>(`${this.base}/${id}/overview`);
  }
  end(id: string) {
    return this.http.patch<Supervision>(`${this.base}/${id}/end`, {});
  }
  exportSummary(id: string) {
    return this.http.get<Record<string, any>>(`${this.base}/${id}/export`);
  }

  // ---- milestones ----
  addMilestone(id: string, body: { title: string; description?: string; dueDate?: string }) {
    return this.http.post<Milestone>(`${this.base}/${id}/milestones`, body);
  }
  applyTemplate(id: string, startDate?: string) {
    return this.http.post<Milestone[]>(`${this.base}/${id}/milestones/template`, {
      template: 'thesis',
      startDate,
    });
  }
  updateMilestone(
    id: string,
    milestoneId: string,
    body: Partial<{ title: string; description: string; dueDate: string; status: MilestoneStatus }>,
  ) {
    return this.http.patch<Milestone>(`${this.base}/${id}/milestones/${milestoneId}`, body);
  }
  removeMilestone(id: string, milestoneId: string) {
    return this.http.delete(`${this.base}/${id}/milestones/${milestoneId}`);
  }

  // ---- meetings ----
  meetings(id: string) {
    return this.http.get<Meeting[]>(`${this.base}/${id}/meetings`);
  }
  meeting(id: string, meetingId: string) {
    return this.http.get<MeetingWithItems>(`${this.base}/${id}/meetings/${meetingId}`);
  }
  addMeeting(id: string, body: { scheduledAt: string; firstAgendaItem?: string }) {
    return this.http.post<Meeting>(`${this.base}/${id}/meetings`, body);
  }
  updateMeeting(
    id: string,
    meetingId: string,
    body: Partial<{ scheduledAt: string; status: MeetingStatus; notes: string }>,
  ) {
    return this.http.patch<Meeting>(`${this.base}/${id}/meetings/${meetingId}`, body);
  }
  removeMeeting(id: string, meetingId: string) {
    return this.http.delete(`${this.base}/${id}/meetings/${meetingId}`);
  }
  addAgendaItem(id: string, meetingId: string, text: string) {
    return this.http.post<Meeting>(`${this.base}/${id}/meetings/${meetingId}/agenda`, { text });
  }
  removeAgendaItem(id: string, meetingId: string, itemId: string) {
    return this.http.delete<Meeting>(`${this.base}/${id}/meetings/${meetingId}/agenda/${itemId}`);
  }

  // ---- action items ----
  actionItems(id: string, filter: { status?: ActionItemStatus; meetingId?: string } = {}) {
    let params = new HttpParams();
    if (filter.status) params = params.set('status', filter.status);
    if (filter.meetingId) params = params.set('meetingId', filter.meetingId);
    return this.http.get<ActionItem[]>(`${this.base}/${id}/action-items`, { params });
  }
  addActionItem(
    id: string,
    body: { text: string; assigneeId: string; meetingId?: string; dueDate?: string },
  ) {
    return this.http.post<ActionItem>(`${this.base}/${id}/action-items`, body);
  }
  updateActionItem(
    id: string,
    itemId: string,
    body: Partial<{ text: string; assigneeId: string; dueDate: string; status: ActionItemStatus }>,
  ) {
    return this.http.patch<ActionItem>(`${this.base}/${id}/action-items/${itemId}`, body);
  }
  removeActionItem(id: string, itemId: string) {
    return this.http.delete(`${this.base}/${id}/action-items/${itemId}`);
  }
  /** Supervisor only: attach a file to a task for the student. */
  uploadActionItemFile(id: string, itemId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ActionItem>(`${this.base}/${id}/action-items/${itemId}/files`, form);
  }
  removeActionItemFile(id: string, itemId: string, fileId: string) {
    return this.http.delete<ActionItem>(`${this.base}/${id}/action-items/${itemId}/files/${fileId}`);
  }
  /** Bytes of an attached file, through the authenticated API. */
  actionItemFileBlob(id: string, itemId: string, fileId: string) {
    return this.http.get(`${this.base}/${id}/action-items/${itemId}/files/${fileId}`, { responseType: 'blob' });
  }
  downloadActionItemFile(id: string, itemId: string, fileId: string, name: string) {
    return this.actionItemFileBlob(id, itemId, fileId).pipe(map((blob) => this.saveBlob(blob, name)));
  }

  // ---- thesis documents ----
  documents(id: string, filter: { milestoneId?: string; meetingId?: string } = {}) {
    let params = new HttpParams();
    if (filter.milestoneId) params = params.set('milestoneId', filter.milestoneId);
    if (filter.meetingId) params = params.set('meetingId', filter.meetingId);
    return this.http.get<ThesisDocument[]>(`${this.base}/${id}/documents`, { params });
  }
  createDocument(id: string, body: { title: string; milestoneId?: string; meetingId?: string }) {
    return this.http.post<ThesisDocument>(`${this.base}/${id}/documents`, body);
  }
  /** Creates a document and puts its first file in, in one go. */
  uploadNewDocument(
    id: string,
    body: { title: string; milestoneId?: string; meetingId?: string },
    file: File,
    note?: string,
  ) {
    return this.createDocument(id, body).pipe(
      switchMap((doc) => this.uploadVersion(doc._id, file, note).pipe(map((version) => ({ doc, version })))),
    );
  }
  document(docId: string) {
    return this.http.get<ThesisDocumentDetail>(`${this.docs}/${docId}`);
  }
  uploadVersion(docId: string, file: File, note?: string) {
    const form = new FormData();
    form.append('file', file);
    if (note?.trim()) form.append('note', note.trim());
    return this.http.post<DocumentVersion>(`${this.docs}/${docId}/versions`, form);
  }
  setDocumentStatus(docId: string, status: DocumentStatus) {
    return this.http.patch<ThesisDocument>(`${this.docs}/${docId}/status`, { status });
  }
  /** Bytes of one version, through the authenticated API (a plain link would not carry the JWT). */
  versionBlob(docId: string, version: number) {
    return this.http.get(`${this.docs}/${docId}/versions/${version}/file`, { responseType: 'blob' });
  }
  downloadVersion(docId: string, version: number, name: string) {
    return this.versionBlob(docId, version).pipe(map((blob) => this.saveBlob(blob, name)));
  }
  private saveBlob(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  // ---- co-working document (editor mode) ----
  workspace(id: string) {
    return this.http.get<ThesisDocument | null>(`${this.base}/${id}/documents/workspace`);
  }
  createWorkspace(id: string, title?: string) {
    return this.http.post<ThesisDocument>(`${this.base}/${id}/documents/workspace`, { title });
  }
  draft(docId: string) {
    return this.http.get<DraftState>(`${this.docs}/${docId}/draft`);
  }
  saveDraft(docId: string, content: Record<string, unknown>, baseRevision: number) {
    return this.http.put<{ revision: number; updatedAt: string }>(`${this.docs}/${docId}/draft`, {
      content,
      baseRevision,
    });
  }
  saveEditorVersion(docId: string, note?: string) {
    return this.http.post<DocumentVersion>(`${this.docs}/${docId}/versions/editor`, {
      note: note?.trim() || undefined,
    });
  }
  versionContent(docId: string, version: number) {
    return this.http.get<{ number: number; content: Record<string, unknown> }>(
      `${this.docs}/${docId}/versions/${version}/content`,
    );
  }

  // ---- document comments ----
  comments(docId: string, filter: { versionId?: string; status?: CommentStatus } = {}) {
    let params = new HttpParams();
    if (filter.versionId) params = params.set('versionId', filter.versionId);
    if (filter.status) params = params.set('status', filter.status);
    return this.http.get<DocumentComment[]>(`${this.docs}/${docId}/comments`, { params });
  }
  addComment(
    docId: string,
    body: {
      text: string;
      versionId?: string;
      parentId?: string;
      anchor?: { page?: number; from?: number; to?: number; quote?: string; before?: string; after?: string };
    },
  ) {
    return this.http.post<DocumentComment>(`${this.docs}/${docId}/comments`, body);
  }
  resolveComment(commentId: string, status: CommentStatus) {
    return this.http.patch<DocumentComment>(`${environment.apiUrl}/comments/${commentId}/resolve`, {
      status,
    });
  }
  deleteComment(commentId: string) {
    return this.http.delete<{ deleted: boolean }>(`${environment.apiUrl}/comments/${commentId}`);
  }
}

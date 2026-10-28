import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environmets/environment';
import {
  MyReview,
  Proposal,
  ProposalComment,
  ProposalFile,
  ProposalHistory,
  ProposalSection,
  ReviewerCandidate,
  SectionReview,
  StartProposalPayload,
} from '../models/proposal.model';

@Injectable({ providedIn: 'root' })
export class ProposalsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** "Start proposal" on a call. */
  start(callId: string, payload: StartProposalPayload) {
    return this.http.post<Proposal>(`${this.base}/grants/${callId}/proposals`, payload);
  }

  /** My proposals; `callId` narrows it to one call. */
  list(callId?: string) {
    let params = new HttpParams();
    if (callId) params = params.set('callId', callId);
    return this.http.get<Proposal[]>(`${this.base}/proposals`, { params });
  }

  get(id: string) {
    return this.http.get<Proposal>(`${this.base}/proposals/${id}`);
  }

  update(id: string, payload: { title?: string; status?: string; internalDeadline?: string | null; outcomeNote?: string | null }) {
    return this.http.patch<Proposal>(`${this.base}/proposals/${id}`, payload);
  }

  remove(id: string) {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/proposals/${id}`);
  }

  /** My own track record: how many proposals, submitted, awarded... */
  history() {
    return this.http.get<ProposalHistory>(`${this.base}/proposals/history`);
  }

  /** Review requests waiting for me, across every proposal. */
  myReviews() {
    return this.http.get<MyReview[]>(`${this.base}/proposals/reviews/mine`);
  }

  reviewers(id: string) {
    return this.http.get<ReviewerCandidate[]>(`${this.base}/proposals/${id}/reviewers`);
  }

  requestReview(id: string, sectionId: string, payload: { reviewerId: string; note?: string }) {
    return this.http.post<SectionReview>(`${this.base}/proposals/${id}/sections/${sectionId}/reviews`, payload);
  }

  respondReview(id: string, reviewId: string, payload: { decision: 'approve' | 'changes'; response?: string }) {
    return this.http.patch<SectionReview>(`${this.base}/proposals/${id}/reviews/${reviewId}`, payload);
  }

  cancelReview(id: string, reviewId: string) {
    return this.http.delete<SectionReview>(`${this.base}/proposals/${id}/reviews/${reviewId}`);
  }

  comments(id: string, sectionId: string) {
    return this.http.get<ProposalComment[]>(`${this.base}/proposals/${id}/sections/${sectionId}/comments`);
  }

  addComment(id: string, sectionId: string, body: string) {
    return this.http.post<ProposalComment>(`${this.base}/proposals/${id}/sections/${sectionId}/comments`, { body });
  }

  removeComment(id: string, commentId: string) {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/proposals/${id}/comments/${commentId}`);
  }

  addSection(id: string, payload: { title: string; dueDate?: string }) {
    return this.http.post<ProposalSection>(`${this.base}/proposals/${id}/sections`, payload);
  }

  updateSection(
    id: string,
    sectionId: string,
    payload: { title?: string; status?: string; ownerId?: string | null; dueDate?: string | null },
  ) {
    return this.http.patch<ProposalSection>(`${this.base}/proposals/${id}/sections/${sectionId}`, payload);
  }

  removeSection(id: string, sectionId: string) {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/proposals/${id}/sections/${sectionId}`);
  }

  upload(id: string, sectionId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ProposalFile>(`${this.base}/proposals/${id}/sections/${sectionId}/files`, form);
  }

  /** The endpoint needs the login token, so a plain link will not do: fetch the bytes and save them. */
  download(id: string, file: ProposalFile) {
    return this.http.get(`${this.base}/proposals/${id}/files/${file._id}`, { responseType: 'blob' });
  }

  removeFile(id: string, fileId: string) {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/proposals/${id}/files/${fileId}`);
  }
}

import type { MediaAsset, MediaExtraction, Paged } from '../../shared/types';
import { call } from './transport';

export const mediaApi = {
  mediaAssets: (params = new URLSearchParams()) => call<Paged<MediaAsset>>(`/media-assets${params.size ? `?${params}` : ''}`),
  mediaAsset: (id: string) => call<MediaAsset>(`/media-assets/${encodeURIComponent(id)}`),
  createMediaAsset: (body: unknown) => call<MediaAsset>('/media-assets', { method: 'POST', body: JSON.stringify(body) }),
  requestMediaExtraction: (id: string, body: unknown) => call<MediaExtraction>(`/media-assets/${encodeURIComponent(id)}/extractions`, { method: 'POST', body: JSON.stringify(body) }),
  reviewMediaExtraction: (id: string, body: unknown) => call<MediaExtraction>(`/media-extractions/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify(body) }),
  disableMediaAsset: (id: string, reason: string) => call<MediaAsset>(`/media-assets/${encodeURIComponent(id)}/disable`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

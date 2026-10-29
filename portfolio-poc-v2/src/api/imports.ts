import type { ActivityCatalogueExport, ImportBatchDetail, ImportWorkspace } from '../../shared/types';
import { call } from './transport';

export const importsApi = {
  imports: () => call<ImportWorkspace>('/imports'),
  exportActivityCatalogue: () => call<ActivityCatalogueExport>('/imports/activity-catalogue/export'),
  uploadActivityCatalogue: (file: File) => {
    const body = new FormData();
    body.set('file', file);
    return call<ImportBatchDetail>('/imports/activity-catalogue/files', { method: 'POST', body });
  },
  importDetail: (batchId: string) => call<ImportBatchDetail>(`/imports/${batchId}`),
  uploadImport: (activityId: string, file: File) => {
    const body = new FormData();
    body.set('activityId', activityId);
    body.set('file', file);
    return call<ImportBatchDetail>('/imports/files', { method: 'POST', body });
  },
  runImportConnector: (sourceSystemId: string, body: { activityId: string; sourceParentKey: string }) => call<ImportBatchDetail>(`/imports/connectors/${sourceSystemId}/runs`, { method: 'POST', body: JSON.stringify(body) }),
  correctImportRecord: (batchId: string, recordId: string, body: { fieldName: string; afterValue: string; reason: string }) => call<ImportBatchDetail>(`/imports/${batchId}/records/${recordId}/corrections`, { method: 'POST', body: JSON.stringify(body) }),
  decideImportRecord: (batchId: string, recordId: string, body: { decision: 'exclude' | 'restore'; reason: string }) => call<ImportBatchDetail>(`/imports/${batchId}/records/${recordId}/decisions`, { method: 'POST', body: JSON.stringify(body) }),
  commitImport: (batchId: string, reason: string) => call<ImportBatchDetail>(`/imports/${batchId}/commit`, { method: 'POST', body: JSON.stringify({ reason }) }),
  disableImport: (batchId: string, reason: string) => call<ImportBatchDetail>(`/imports/${batchId}/disable`, { method: 'POST', body: JSON.stringify({ reason }) }),
  setSourceStatus: (sourceId: string, status: 'active' | 'disabled', reason: string) => call<ImportWorkspace>(`/source-systems/${sourceId}/${status === 'active' ? 'enable' : 'disable'}`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

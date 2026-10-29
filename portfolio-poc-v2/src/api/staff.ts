import type { ReferenceData, Staff } from '../../shared/types';
import { call } from './transport';

export const staffApi = {
  referenceData: () => call<ReferenceData>('/reference-data'),
  staff: (params: URLSearchParams) => call<Staff[]>(`/staff?${params}`),
};

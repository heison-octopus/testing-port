import type { CatalogueLabel, Paged, QuestionBankItem, QuestionBlock, Staff } from '../../shared/types';
import { call } from './transport';

const query = (path: string, params: URLSearchParams) => `${path}${params.size ? `?${params}` : ''}`;

export const authoringApi = {
  teacherDirectory: (params = new URLSearchParams(), signal?: AbortSignal) => call<Paged<Staff>>(query('/directory/teachers', params), { signal }),
  catalogueLabels: (params = new URLSearchParams(), signal?: AbortSignal) => call<Paged<CatalogueLabel>>(query('/catalogue-labels', params), { signal }),
  questionBank: (params = new URLSearchParams(), signal?: AbortSignal) => call<Paged<QuestionBankItem>>(query('/question-bank', params), { signal }),
  questionBlocks: (params = new URLSearchParams(), signal?: AbortSignal) => call<Paged<QuestionBlock>>(query('/question-blocks', params), { signal }),
};

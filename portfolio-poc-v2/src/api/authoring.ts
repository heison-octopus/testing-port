import type { CatalogueLabel, Paged, QuestionBankItem, QuestionBlock, Staff } from '../../shared/types';
import { call } from './transport';

const query = (path: string, params: URLSearchParams) => `${path}${params.size ? `?${params}` : ''}`;

export const authoringApi = {
  teacherDirectory: (params = new URLSearchParams()) => call<Paged<Staff>>(query('/directory/teachers', params)),
  catalogueLabels: (params = new URLSearchParams()) => call<Paged<CatalogueLabel>>(query('/catalogue-labels', params)),
  questionBank: (params = new URLSearchParams()) => call<Paged<QuestionBankItem>>(query('/question-bank', params)),
  questionBlocks: (params = new URLSearchParams()) => call<Paged<QuestionBlock>>(query('/question-blocks', params)),
};

import type { PortfolioDetail, PortfolioEditorDetail, PortfolioRow, PortfolioViewDetail } from '../../shared/types';
import { call } from './transport';

export const portfoliosApi = {
  portfolios: () => call<PortfolioRow[]>('/portfolios'),
  portfolio: (studentId: string) => call<PortfolioDetail>(`/portfolios/${studentId}`),
  portfolioEditor: (studentId: string) => call<PortfolioEditorDetail>(`/portfolio-editor/${studentId}`),
  portfolioView: (studentId: string) => call<PortfolioViewDetail>(`/portfolio-view/${studentId}`),
  createDraft: (studentId: string, body: unknown) => call<PortfolioEditorDetail>(`/portfolios/${studentId}/drafts`, { method: 'POST', body: JSON.stringify(body) }),
  submitPortfolio: (id: string) => call(`/portfolio-versions/${id}/submit`, { method: 'POST' }),
  reviewPortfolio: (id: string, body: unknown) => call(`/portfolio-versions/${id}/review`, { method: 'POST', body: JSON.stringify(body) }),
};

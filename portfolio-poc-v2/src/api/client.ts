import { activitiesApi } from './activities';
import { aiDraftsApi } from './aiDrafts';
import { approvalsApi } from './approvals';
import { policyApi } from './policy';
import { portfoliosApi } from './portfolios';
import { sessionApi } from './session';
import { staffApi } from './staff';
import { llmPlaygroundApi } from './llmPlayground';
import { assessmentsApi } from './assessments';
import { memorableApi } from './memorable';
import { importsApi } from './imports';
import { authoringApi } from './authoring';
import { mediaApi } from './media';

export const api = { ...sessionApi, ...staffApi, ...authoringApi, ...activitiesApi, ...mediaApi, ...assessmentsApi, ...memorableApi, ...importsApi, ...approvalsApi, ...portfoliosApi, ...policyApi, ...aiDraftsApi, ...llmPlaygroundApi };

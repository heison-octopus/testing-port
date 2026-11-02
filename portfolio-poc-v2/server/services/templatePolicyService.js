import { identityRepository } from '../repositories/identityRepository.js';
import { portfolioTemplateRepository } from '../repositories/portfolioTemplateRepository.js';
import { rubricRepository } from '../repositories/rubricRepository.js';
import { requireCapability } from './access.js';

export const templatePolicyService = {
  workspace(user) {
    requireCapability(user, 'policy.manage', { school_id: user.school_id });
    return {
      roleTemplates: identityRepository.roleTemplatePackages(),
      rubricTemplates: {
        catalogues: rubricRepository.allCatalogues(),
        assignments: rubricRepository.assignments(user.school_id),
      },
      portfolioTemplates: {
        packages: portfolioTemplateRepository.packages(user.school_id),
        assignments: portfolioTemplateRepository.assignments(user.school_id),
      },
    };
  },
};

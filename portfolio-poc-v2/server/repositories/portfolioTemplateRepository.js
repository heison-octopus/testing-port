import { sql } from './database.js';

const asOfDate = () => process.env.POC_V2_AS_OF || '2027-01-20';

export const portfolioTemplateRepository = {
  packages(schoolId) {
    return sql.all(`SELECT * FROM portfolio_templates WHERE owner_scope_type='system' OR school_id=? ORDER BY owner_scope_type,template_code`, schoolId).map(template => ({
      ...template,
      versions: sql.all(`SELECT * FROM portfolio_template_versions WHERE portfolio_template_id=? ORDER BY version_number DESC`, template.portfolio_template_id).map(version => ({
        ...version,
        sections: sql.all(`SELECT * FROM portfolio_template_sections WHERE portfolio_template_version_id=? ORDER BY COALESCE(parent_section_id,''),display_order,section_key`, version.portfolio_template_version_id),
      })),
    }));
  },
  assignments(schoolId) { return sql.all(`SELECT * FROM school_portfolio_template_assignments WHERE school_id=? ORDER BY scope_type,scope_id,assigned_at DESC`, schoolId); },
  version(versionId) {
    const version = sql.get(`SELECT version.*,template.template_code,template.name_en,template.name_zh,template.description_en,template.description_zh,template.owner_scope_type,template.school_id template_school_id
      FROM portfolio_template_versions version JOIN portfolio_templates template ON template.portfolio_template_id=version.portfolio_template_id
      WHERE version.portfolio_template_version_id=?`, versionId);
    if (!version) return null;
    return {
      ...version,
      sections: sql.all(`SELECT * FROM portfolio_template_sections WHERE portfolio_template_version_id=? AND status='active' ORDER BY COALESCE(parent_section_id,''),display_order,section_key`, versionId),
    };
  },
  assigned(schoolId, resource = {}, asOf = asOfDate()) {
    const assignment = sql.get(`SELECT assignment.* FROM school_portfolio_template_assignments assignment
      JOIN portfolio_template_versions version ON version.portfolio_template_version_id=assignment.portfolio_template_version_id AND version.lifecycle_status='published'
      WHERE assignment.school_id=? AND assignment.status='active'
        AND assignment.effective_from<=? AND (assignment.effective_until IS NULL OR assignment.effective_until>=?)
        AND ((assignment.scope_type='programme' AND assignment.scope_id=?)
          OR (assignment.scope_type='grade' AND assignment.scope_id=?)
          OR (assignment.scope_type='school' AND assignment.scope_id=?))
      ORDER BY CASE assignment.scope_type WHEN 'programme' THEN 1 WHEN 'grade' THEN 2 ELSE 3 END,assignment.assigned_at DESC LIMIT 1`, schoolId, asOf, asOf, resource.programme_id || null, resource.grade_id || null, schoolId);
    if (!assignment) return null;
    return { assignment, ...this.version(assignment.portfolio_template_version_id) };
  },
};

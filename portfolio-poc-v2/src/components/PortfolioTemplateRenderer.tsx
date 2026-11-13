import type { ReactNode } from 'react';
import { ChartPolar, Quotes } from '@phosphor-icons/react';
import type { PortfolioItem, PortfolioTemplate, PortfolioTemplateSection, PortfolioVersion, SkillSummary } from '../../shared/types';
import { Status } from './Layout';
import { useI18n } from '../i18n';

type PortfolioTemplateRendererProps = {
  template: PortfolioTemplate | null;
  version: PortfolioVersion;
  skillSummary: SkillSummary[];
  itemFilter?: (item: PortfolioItem) => boolean;
  renderItem?: (item: PortfolioItem) => ReactNode;
  renderNarrative?: () => ReactNode;
};

function ordered(sections: PortfolioTemplateSection[]) {
  return [...sections].sort((left, right) => left.display_order - right.display_order || left.section_key.localeCompare(right.section_key));
}

export function PortfolioTemplateRenderer({ template, version, skillSummary, itemFilter = () => true, renderItem, renderNarrative }: PortfolioTemplateRendererProps) {
  const { isChinese, text, codeLabel } = useI18n();
  const sections = ordered((template?.sections || []).filter(section => Boolean(section.visible) && section.status === 'active'));
  const sectionIds = new Set(sections.map(section => section.portfolio_template_section_id));

  function defaultItem(item: PortfolioItem) {
    return <article className="template-portfolio-item" key={item.portfolio_version_item_id}>
      <span><b>{codeLabel(item.section_key)}</b><Status value={item.class_teacher_decision} /></span>
      <blockquote>{item.student_text || `${codeLabel(item.source_type)}: ${item.source_id}`}</blockquote>
      <small>{codeLabel(item.authorship_origin)}{item.decision_reason ? ` · ${item.decision_reason}` : ''}</small>
    </article>;
  }

  function sectionContent(section: PortfolioTemplateSection) {
    if (section.source_type === 'portfolio_item') {
      const items = version.items.filter(item => item.section_key === section.section_key && itemFilter(item));
      return items.length ? <div className="template-item-list">{items.map(item => renderItem ? renderItem(item) : defaultItem(item))}</div> : <p className="template-empty">{text('No content is included in this section.', '此部分未有包括任何內容。')}</p>;
    }
    if (section.source_type === 'published_rubric_result') {
      return <div className="skill-visual-grid">{skillSummary.map(skill => {
        const level = Number(skill.published_numeric_value || 0);
        return <article className={level ? '' : 'missing'} key={skill.axis_id}><div className="skill-level"><b>{level || '—'}</b><span>/16</span></div><div><b>{isChinese ? skill.name_zh : skill.name_en}</b><div className="level-track" aria-label={level ? `${level} of 16` : text('No published result', '未有已發布結果')}>{Array.from({ length: 16 }, (_, index) => <i className={index < level ? 'filled' : ''} key={index} />)}</div><small>{level ? `${skill.published_level_id} · ${skill.contributing_observation_ids || ''}` : text('No published evidence-backed result', '未有已發布並具佐證的結果')}</small></div></article>;
      })}</div>;
    }
    if (section.source_type === 'learner_narrative_version') {
      if (renderNarrative) return renderNarrative();
      if (!version.narrative) return <p className="template-empty">{text('No approved learner narrative is included.', '未有包括已批核的學習者敘述。')}</p>;
      return <div className="template-narrative"><Quotes size={26} weight="fill"/><blockquote>{version.narrative.final_approved_text || version.narrative.teacher_edited_text || version.narrative.generated_text}</blockquote><small>{text('Source-linked learner narrative', '已連繫來源的學習者敘述')} · {version.narrative.source_manifest_id || version.narrative.learner_narrative_version_id}</small></div>;
    }
    if (section.source_type === 'frozen_manifest') {
      const sourceIds = version.items.filter(itemFilter).map(item => item.source_id || item.portfolio_version_item_id);
      if (version.narrative) sourceIds.push(version.narrative.source_manifest_id || version.narrative.learner_narrative_version_id);
      return <dl className="template-source-trace"><div><dt>{text('Template', '範本')}</dt><dd>{isChinese ? version.template_name_zh : version.template_name_en} · v{version.template_version_number || template?.version_number}</dd></div><div><dt>{text('Frozen manifest', '已凍結清單')}</dt><dd className="mono">{version.template_manifest_sha256}</dd></div><div><dt>{text('Rubric', 'Rubric')}</dt><dd>{isChinese ? version.rubric_name_zh : version.rubric_name_en} · {version.rubric_version}</dd></div><div><dt>{text('Included source records', '已包括來源紀錄')}</dt><dd>{sourceIds.length ? sourceIds.join(', ') : text('None', '沒有')}</dd></div></dl>;
    }
    return null;
  }

  function renderSection(section: PortfolioTemplateSection): ReactNode {
    const children = ordered(sections.filter(candidate => candidate.parent_section_id === section.portfolio_template_section_id));
    const title = isChinese ? section.title_zh : section.title_en;
    const body = <>{sectionContent(section)}{children.length > 0 && <div className="template-child-sections">{children.map(renderSection)}</div>}</>;
    const common = {
      'data-section-key': section.section_key,
      'data-presentation-mode': section.presentation_mode,
      'data-layout-region': section.layout_region,
    };

    if (section.presentation_mode === 'disclosure') return <details className={`portfolio-template-section template-${section.visual_variant}`} open={Boolean(section.default_expanded)} key={section.portfolio_template_section_id} {...common}><summary><span>{title}</span><small>{text('Expand or collapse', '展開或收起')}</small></summary><div className="template-section-body">{body}</div></details>;
    if (section.presentation_mode === 'link_button') return <details className={`portfolio-template-section template-link-button template-${section.visual_variant}`} open={Boolean(section.default_expanded)} key={section.portfolio_template_section_id} {...common}><summary>{title}</summary><div className="template-section-body">{body}</div></details>;
    return <section className={`portfolio-template-section template-${section.visual_variant}`} key={section.portfolio_template_section_id} {...common}><header>{section.source_type === 'published_rubric_result' && <ChartPolar size={24}/>}<div><h3>{title}</h3>{section.source_type === 'published_rubric_result' && <small>{text('Published results only · 16 steps per skill', '只顯示已發布結果 · 每項技能 16 階段')}</small>}</div></header><div className="template-section-body">{body}</div></section>;
  }

  if (!sections.length) return <div className="portfolio-template-renderer template-fallback"><div className="template-item-list">{version.items.filter(itemFilter).map(item => renderItem ? renderItem(item) : defaultItem(item))}</div>{version.narrative && (renderNarrative ? renderNarrative() : sectionContent({ source_type: 'learner_narrative_version' } as PortfolioTemplateSection))}</div>;

  return <div className="portfolio-template-renderer" data-template-version={version.portfolio_template_version_id}>{sections.filter(section => !section.parent_section_id || !sectionIds.has(section.parent_section_id)).map(renderSection)}</div>;
}

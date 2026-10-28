export type PortfolioWidgetKey = 'identity' | 'skills' | 'learnerSummary' | 'evidenceStories' | 'growthFocus' | 'sourceTrace';

export type PortfolioWidget = {
  key: PortfolioWidgetKey;
  title: string;
  order: number;
  width: 'sidebar' | 'half' | 'full';
  visible: boolean;
  variant: 'identity' | 'teal' | 'plain' | 'warning';
};

// The single layout registry requested for the POC. Components render data only;
// order, visibility, width and visual treatment live here.
export const portfolioWidgets: PortfolioWidget[] = [
  { key: 'identity', title: 'Learner profile', order: 10, width: 'sidebar', visible: true, variant: 'identity' },
  { key: 'skills', title: 'Skills Builder overview', order: 20, width: 'full', visible: true, variant: 'teal' },
  { key: 'learnerSummary', title: 'Me as a learner', order: 30, width: 'full', visible: true, variant: 'teal' },
  { key: 'evidenceStories', title: 'Evidence stories', order: 40, width: 'half', visible: true, variant: 'plain' },
  { key: 'growthFocus', title: 'Growth focus', order: 50, width: 'half', visible: true, variant: 'warning' },
  { key: 'sourceTrace', title: 'Why this outcome?', order: 60, width: 'full', visible: true, variant: 'plain' },
];

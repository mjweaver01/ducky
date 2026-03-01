/**
 * Shared docs nav config for sidebar and marketing layout drawer.
 */

export interface DocsNavItem {
  label: string;
  to: string;
}

export interface DocsNavGroup {
  group: string;
  items: DocsNavItem[];
}

export const docsNavItems: DocsNavGroup[] = [
  {
    group: 'Getting Started',
    items: [{ label: 'Introduction', to: '/docs' }],
  },
  {
    group: 'CLI Reference',
    items: [
      { label: 'Overview', to: '/docs/cli' },
      { label: 'ducky http', to: '/docs/cli#http' },
      { label: 'Config commands', to: '/docs/cli#config-commands' },
    ],
  },
  {
    group: 'API Reference',
    items: [
      { label: 'Authentication', to: '/docs/api' },
      { label: 'Tunnels', to: '/docs/api#tunnels' },
      { label: 'Tokens', to: '/docs/api#tokens' },
      { label: 'Domains', to: '/docs/api#domains' },
      { label: 'User', to: '/docs/api#user' },
    ],
  },
];

export const docsTrackedIds = docsNavItems.flatMap((g) =>
  g.items.filter((i) => i.to.includes('#')).map((i) => i.to.split('#')[1])
);

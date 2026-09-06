import { defineConfig } from 'vitepress';
import apiSidebar from '../api/typedoc-sidebar.json';

export default defineConfig({
  title: 'worldwind-ui',
  description: 'UI libraries for NASA WorldWind: worldwind-kit, react-worldwind and ngx-worldwind.',
  base: '/worldwind-ui/',
  lastUpdated: false,
  cleanUrls: true,
  head: [['link', { rel: 'icon', href: '/worldwind-ui/favicon.svg' }]],
  themeConfig: {
    logo: '/favicon.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      {
        text: 'Demos',
        items: [
          { text: 'React demo', link: '/react/', target: '_self' },
          { text: 'Angular demo', link: '/angular/', target: '_self' },
        ],
      },
      { text: 'npm', items: [
        { text: 'worldwind-kit', link: 'https://www.npmjs.com/package/worldwind-kit' },
        { text: 'react-worldwind', link: 'https://www.npmjs.com/package/react-worldwind' },
        { text: 'ngx-worldwind', link: 'https://www.npmjs.com/package/ngx-worldwind' },
      ] },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'React', link: '/guide/react' },
            { text: 'Angular', link: '/guide/angular' },
            { text: 'The kit', link: '/guide/kit' },
            { text: 'Bundling WorldWind', link: '/guide/bundling' },
            { text: 'Testing without WebGL', link: '/guide/testing' },
            { text: 'Demos', link: '/guide/demos' },
          ],
        },
      ],
      '/api/': apiSidebar,
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/qwertymuzaffar/worldwind-ui' }],
    search: { provider: 'local' },
    footer: {
      message: 'MIT licensed. Not affiliated with NASA; WorldWind is NASA\'s open-source virtual globe.',
      copyright: 'Copyright 2026 Muzaffar Qosimov',
    },
    outline: { level: [2, 3] },
  },
});

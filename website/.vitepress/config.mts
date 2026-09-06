import { defineConfig } from 'vitepress';
import apiSidebar from '../api/typedoc-sidebar.json';

const site = 'https://qwertymuzaffar.github.io/worldwind-ui/';
const repo = 'https://github.com/qwertymuzaffar/worldwind-ui';
const description = 'UI libraries for NASA WorldWind: worldwind-kit, react-worldwind and ngx-worldwind.';

export default defineConfig({
  title: 'worldwind-ui',
  description,
  base: '/worldwind-ui/',
  lastUpdated: false,
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', href: '/worldwind-ui/favicon.svg' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'worldwind-ui' }],
    ['meta', { property: 'og:title', content: 'worldwind-ui: UI libraries for NASA WorldWind' }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:url', content: site }],
    ['meta', { property: 'og:image', content: `${site}screenshot.jpg` }],
    ['meta', { property: 'og:image:width', content: '1000' }],
    ['meta', { property: 'og:image:height', content: '625' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'worldwind-ui: UI libraries for NASA WorldWind' }],
    ['meta', { name: 'twitter:description', content: description }],
    ['meta', { name: 'twitter:image', content: `${site}screenshot.jpg` }],
  ],
  themeConfig: {
    logo: '/favicon.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      {
        text: 'Demos',
        items: [
          { text: 'In the docs', link: '/guide/demos' },
          { text: 'React demo', link: '/react/', target: '_self' },
          { text: 'Angular demo', link: '/angular/', target: '_self' },
        ],
      },
      { text: 'Changelog', link: '/changelog' },
      {
        text: 'npm',
        items: [
          { text: 'worldwind-kit', link: 'https://www.npmjs.com/package/worldwind-kit' },
          { text: 'react-worldwind', link: 'https://www.npmjs.com/package/react-worldwind' },
          { text: 'ngx-worldwind', link: 'https://www.npmjs.com/package/ngx-worldwind' },
        ],
      },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Concepts', link: '/guide/concepts' },
            { text: 'React', link: '/guide/react' },
            { text: 'Angular', link: '/guide/angular' },
            { text: 'The kit (any framework)', link: '/guide/kit' },
            { text: 'Widgets', link: '/guide/widgets' },
            { text: 'Theming', link: '/guide/theming' },
            { text: 'Bundling WorldWind', link: '/guide/bundling' },
            { text: 'Testing without WebGL', link: '/guide/testing' },
            { text: 'Performance', link: '/guide/performance' },
            { text: 'Demos', link: '/guide/demos' },
          ],
        },
      ],
      '/api/': apiSidebar,
    },
    editLink: {
      // Serialised for the client, so no references to module-level constants here.
      pattern: ({ filePath }) => {
        const dirs: Record<string, string> = { 'worldwind-kit': 'kit', 'react-worldwind': 'react', 'ngx-worldwind': 'angular' };
        const api = /^api\/([^/]+)\//.exec(filePath);
        if (api) return `https://github.com/qwertymuzaffar/worldwind-ui/tree/main/packages/${dirs[api[1]!] ?? api[1]}/src`;
        return `https://github.com/qwertymuzaffar/worldwind-ui/edit/main/website/${filePath}`;
      },
      text: 'Edit this page on GitHub',
    },
    socialLinks: [{ icon: 'github', link: repo }],
    search: { provider: 'local' },
    footer: {
      message: "MIT licensed. Not affiliated with NASA; WorldWind is NASA's open-source virtual globe.",
      copyright: 'Copyright 2026 Muzaffar Qosimov',
    },
    outline: { level: [2, 3] },
  },
});

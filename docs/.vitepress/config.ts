import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Lanonasis Memory Service',
  description: 'Complete documentation for Lanonasis Memory as a Service (MaaS)',
  base: '/',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3c82f6' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'en' }],
    ['meta', { property: 'og:title', content: 'Lanonasis Memory Service | Documentation' }],
    ['meta', { property: 'og:site_name', content: 'Lanonasis Docs' }],
    ['meta', { property: 'og:url', content: 'https://docs.lanonasis.com/' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'CLI', link: '/cli/' },
      { text: 'SDK', link: '/sdk/' },
      { text: 'Dashboard', link: 'https://api.lanonasis.com/dashboard' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Authentication', link: '/guide/authentication' },
            { text: 'API Keys', link: '/guide/api-keys' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Memory Management', link: '/guide/memory-management' },
            { text: 'Search & Retrieval', link: '/guide/search' },
            { text: 'Embeddings', link: '/guide/embeddings' },
            { text: 'Real-time Updates', link: '/guide/real-time' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Batch Operations', link: '/guide/batch' },
            { text: 'Analytics', link: '/guide/analytics' },
            { text: 'Rate Limiting', link: '/guide/rate-limiting' },
            { text: 'Error Handling', link: '/guide/errors' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Authentication', link: '/api/auth' },
            { text: 'Memory Operations', link: '/api/memory' },
            { text: 'Search', link: '/api/search' },
            { text: 'Real-time (SSE)', link: '/api/sse' },
            { text: 'Error Codes', link: '/api/errors' }
          ]
        }
      ],
      '/cli/': [
        {
          text: 'CLI Reference',
          items: [
            { text: 'Installation', link: '/cli/' },
            { text: 'Configuration', link: '/cli/config' },
            { text: 'Memory Commands', link: '/cli/memory' },
            { text: 'MCP Integration', link: '/cli/mcp' }
          ]
        }
      ],
      '/sdk/': [
        {
          text: 'SDK Reference',
          items: [
            { text: 'JavaScript/TypeScript', link: '/sdk/' },
            { text: 'Python', link: '/sdk/python' },
            { text: 'Examples', link: '/sdk/examples' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/lanonasis/memory-service' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Lanonasis'
    },

    search: {
      provider: 'local'
    }
  }
})

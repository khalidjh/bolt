/**
 * Centralised SEO configuration and helpers for Etlaq.
 *
 * Keeping the canonical site metadata in one place lets every route share a
 * consistent title/description, absolute Open Graph URLs and structured data.
 */

export const SITE_URL = 'https://etlaq.sa';
export const SITE_NAME = 'Etlaq';

export const DEFAULT_TITLE = 'Etlaq | إطلاق';
export const DEFAULT_DESCRIPTION =
  'Empower founders to build, launch, and scale tech products without technical knowledge. From idea to project in minutes — no coding required.';

export const OG_IMAGE = `${SITE_URL}/og-image.png`;
export const TWITTER_HANDLE = '@etlaq';

/** Resolve a relative path to an absolute URL on the canonical origin. */
export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export interface SeoMetaOptions {
  title?: string;
  description?: string;
  /** Path of the current page, used for the canonical and og:url tags. */
  path?: string;
  image?: string;
  /** When true, instructs crawlers not to index the page (e.g. private chats). */
  noindex?: boolean;
}

/**
 * Build a full set of Remix meta descriptors: title, description, canonical
 * link, Open Graph and Twitter Card tags, plus robots directives.
 */
export function buildMeta({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = OG_IMAGE,
  noindex = false,
}: SeoMetaOptions = {}) {
  const url = absoluteUrl(path);
  const ogImage = absoluteUrl(image);

  const meta: Array<Record<string, unknown>> = [
    { title },
    { name: 'description', content: description },
    { name: 'application-name', content: SITE_NAME },
    { name: 'author', content: SITE_NAME },
    {
      name: 'robots',
      content: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    },

    // Canonical URL
    { tagName: 'link', rel: 'canonical', href: url },

    // Open Graph
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:url', content: url },
    { property: 'og:locale', content: 'en_US' },
    { property: 'og:locale:alternate', content: 'ar_SA' },
    { property: 'og:image', content: ogImage },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: title },

    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: TWITTER_HANDLE },
    { name: 'twitter:creator', content: TWITTER_HANDLE },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: ogImage },
    { name: 'twitter:image:alt', content: title },
  ];

  return meta;
}

/**
 * JSON-LD structured data describing Etlaq as a web-based software application.
 * Returned in a Remix-compatible `script:ld+json` meta descriptor.
 */
export function structuredData() {
  return {
    'script:ld+json': {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SITE_URL}/#organization`,
          name: SITE_NAME,
          alternateName: 'إطلاق',
          url: SITE_URL,
          logo: absoluteUrl('/logo-etlaq-light.svg'),
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          name: SITE_NAME,
          url: SITE_URL,
          description: DEFAULT_DESCRIPTION,
          inLanguage: ['en', 'ar'],
          publisher: { '@id': `${SITE_URL}/#organization` },
        },
        {
          '@type': 'SoftwareApplication',
          name: SITE_NAME,
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Web',
          url: SITE_URL,
          description: DEFAULT_DESCRIPTION,
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        },
      ],
    },
  };
}

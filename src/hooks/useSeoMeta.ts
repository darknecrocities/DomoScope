import { useEffect } from 'react';

export interface SeoMetaOptions {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  robots?: string;
}

export function applySeoMeta({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  robots,
}: SeoMetaOptions) {
  if (typeof document === 'undefined') return;

  if (title) {
    document.title = title;
    setMetaTag('property', 'og:title', title);
    setMetaTag('name', 'twitter:title', title);
  }

  if (description) {
    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:description', description);
    setMetaTag('name', 'twitter:description', description);
  }

  if (keywords) {
    setMetaTag('name', 'keywords', keywords);
  }

  if (canonical) {
    setMetaTag('property', 'og:url', canonical);
    setLinkTag('canonical', canonical);
  }

  if (ogImage) {
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('name', 'twitter:image', ogImage);
  }

  if (robots) {
    setMetaTag('name', 'robots', robots);
  }
}

/**
 * useSeoMeta
 * Dynamically synchronizes document title, canonical link, description,
 * keywords, and OpenGraph/Twitter card metadata as users navigate client-side routes.
 */
export function useSeoMeta(options: SeoMetaOptions) {
  useEffect(() => {
    applySeoMeta(options);
  }, [
    options.title,
    options.description,
    options.keywords,
    options.canonical,
    options.ogImage,
    options.robots,
  ]);
}

function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

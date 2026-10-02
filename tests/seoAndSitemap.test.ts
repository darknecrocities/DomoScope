import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { applySeoMeta } from '../src/hooks/useSeoMeta';

describe('SEO & Sitemap Validation', () => {
  describe('index.html Meta & Structured Data', () => {
    const htmlPath = path.resolve('index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    it('contains exact Google site verification tag requested by user', () => {
      expect(htmlContent).toContain(
        '<meta\n      name="google-site-verification"\n      content="g2PXfPnR7hBDwA13CGRFTyYkjLklpskUVTGVpMGUed0"\n    />'
      );
    });

    it('contains search crawler directives and canonical link', () => {
      expect(htmlContent).toContain('name="robots"');
      expect(htmlContent).toContain('index, follow');
      expect(htmlContent).toContain('<link rel="canonical" href="https://domoscope.vercel.app/" />');
    });

    it('contains OpenGraph and Twitter card metadata', () => {
      expect(htmlContent).toContain('property="og:title"');
      expect(htmlContent).toContain('property="og:description"');
      expect(htmlContent).toContain('property="og:image"');
      expect(htmlContent).toContain('name="twitter:card" content="summary_large_image"');
      expect(htmlContent).toContain('name="twitter:title"');
    });

    it('contains rich Structured Data JSON-LD schemas matching Domodomo standard', () => {
      expect(htmlContent).toContain('"@type": "SoftwareApplication"');
      expect(htmlContent).toContain('"@type": "Organization"');
      expect(htmlContent).toContain('"@type": "WebSite"');
      expect(htmlContent).toContain('"@type": "FAQPage"');
      expect(htmlContent).toContain('"name": "DomoScope"');
      expect(htmlContent).toContain('Arron Kian Parejas');
    });
  });

  describe('Robots.txt & Manifest.json', () => {
    it('provides search crawler rules and points to sitemap.xml in robots.txt', () => {
      const robotsPath = path.resolve('public/robots.txt');
      expect(fs.existsSync(robotsPath)).toBe(true);
      const robotsContent = fs.readFileSync(robotsPath, 'utf-8');

      expect(robotsContent).toContain('User-agent: *');
      expect(robotsContent).toContain('User-agent: Googlebot');
      expect(robotsContent).toContain('Host: https://domoscope.vercel.app');
      expect(robotsContent).toContain('Sitemap: https://domoscope.vercel.app/sitemap.xml');
    });

    it('provides valid manifest.json with app metadata and icons', () => {
      const manifestPath = path.resolve('public/manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      expect(manifest.name).toContain('DomoScope');
      expect(manifest.short_name).toBe('DomoScope');
      expect(manifest.icons.length).toBeGreaterThan(0);
    });
  });

  describe('Sitemap Generator & Synchronization', () => {
    it('generates public/sitemap.xml with static routes and deep repository tabs', () => {
      const sitemapPath = path.resolve('public/sitemap.xml');
      expect(fs.existsSync(sitemapPath)).toBe(true);
      const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');

      expect(sitemapContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemapContent).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(sitemapContent).toContain('<loc>https://domoscope.vercel.app/</loc>');
      expect(sitemapContent).toContain('<loc>https://domoscope.vercel.app/setup</loc>');
      expect(sitemapContent).toContain('<loc>https://domoscope.vercel.app/repository/facebook/react</loc>');
      expect(sitemapContent).toContain('<loc>https://domoscope.vercel.app/repository/facebook/react/architecture</loc>');
      expect(sitemapContent).toContain('<loc>https://domoscope.vercel.app/repository/DarkNecrocities/DomoScope</loc>');
    });
  });

  describe('applySeoMeta Helper', () => {
    it('executes safely in node/SSR environments without document', () => {
      expect(() => {
        applySeoMeta({
          title: 'Test Title',
          description: 'Test Desc',
        });
      }).not.toThrow();
    });

    it('updates title and meta attributes when DOM elements are present', () => {
      const elements: Record<string, { attributes: Record<string, string>; content: string }> = {};

      const mockDocument = {
        title: '',
        querySelector: (selector: string) => {
          return elements[selector] ? {
            setAttribute: (attr: string, val: string) => {
              elements[selector].attributes[attr] = val;
              if (attr === 'content' || attr === 'href') elements[selector].content = val;
            },
            getAttribute: (attr: string) => elements[selector].attributes[attr] || elements[selector].content,
          } : null;
        },
        createElement: (tag: string) => {
          const newEl = {
            attributes: {} as Record<string, string>,
            content: '',
            setAttribute(attr: string, val: string) {
              this.attributes[attr] = val;
              if (attr === 'content' || attr === 'href') this.content = val;
            },
            getAttribute(attr: string) {
              return this.attributes[attr] || this.content;
            },
          };
          return newEl;
        },
        head: {
          appendChild: (el: any) => {
            if (el.attributes.name) {
              elements[`meta[name="${el.attributes.name}"]`] = el;
            }
            if (el.attributes.property) {
              elements[`meta[property="${el.attributes.property}"]`] = el;
            }
            if (el.attributes.rel) {
              elements[`link[rel="${el.attributes.rel}"]`] = el;
            }
          },
        },
      };

      (globalThis as any).document = mockDocument;

      try {
        applySeoMeta({
          title: 'Custom Repo - Architecture | DomoScope',
          description: 'Custom repository architecture and AST diagram.',
          canonical: 'https://domoscope.vercel.app/repository/foo/bar/architecture',
          keywords: 'foo, bar, ast',
        });

        expect(mockDocument.title).toBe('Custom Repo - Architecture | DomoScope');
        expect(elements['meta[name="description"]']?.content).toBe('Custom repository architecture and AST diagram.');
        expect(elements['meta[property="og:title"]']?.content).toBe('Custom Repo - Architecture | DomoScope');
        expect(elements['link[rel="canonical"]']?.content).toBe('https://domoscope.vercel.app/repository/foo/bar/architecture');
      } finally {
        delete (globalThis as any).document;
      }
    });
  });
});

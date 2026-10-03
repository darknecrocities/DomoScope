import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { applySeoMeta } from '../src/hooks/useSeoMeta';

describe('SEO & Sitemap Validation', () => {
  describe('index.html Meta & Structured Data', () => {
    const htmlPath = path.resolve('index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    it('contains exact Google site verification tags requested by user', () => {
      expect(htmlContent).toContain(
        '<meta\n      name="google-site-verification"\n      content="g2PXfPnR7hBDwA13CGRFTyYkjLklpskUVTGVpMGUed0"\n    />'
      );
      expect(htmlContent).toContain(
        '<meta\n      name="google-site-verification"\n      content="265fea273f067470"\n    />'
      );
    });

    it('contains valid static Google verification files in public/ with secure content', () => {
      const fileA = path.resolve('public/google265fea273f067470.html');
      const fileB = path.resolve('public/googleg2PXfPnR7hBDwA13CGRFTyYkjLklpskUVTGVpMGUed0.html');
      expect(fs.existsSync(fileA)).toBe(true);
      expect(fs.existsSync(fileB)).toBe(true);
      expect(fs.readFileSync(fileA, 'utf-8').trim()).toBe('google-site-verification: google265fea273f067470.html');
      expect(fs.readFileSync(fileB, 'utf-8').trim()).toBe('google-site-verification: googleg2PXfPnR7hBDwA13CGRFTyYkjLklpskUVTGVpMGUed0.html');
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

  describe('Favicon & Search Engine Snippet Icons (Google Favicon Guidelines)', () => {
    it('ensures root favicon.ico exists and has valid multi-resolution ICO header', () => {
      const icoPath = path.resolve('public/favicon.ico');
      expect(fs.existsSync(icoPath)).toBe(true);
      const icoBuffer = fs.readFileSync(icoPath);
      // ICO header check: reserved 0, type 1 (icon)
      expect(icoBuffer[0]).toBe(0);
      expect(icoBuffer[1]).toBe(0);
      expect(icoBuffer[2]).toBe(1);
      expect(icoBuffer[3]).toBe(0);
    });

    it('ensures Google Favicon 48px square requirement is met with favicon-48x48.png and domoscope.png', () => {
      const icon48Path = path.resolve('public/favicon-48x48.png');
      const iconPngPath = path.resolve('public/domoscope.png');
      expect(fs.existsSync(icon48Path)).toBe(true);
      expect(fs.existsSync(iconPngPath)).toBe(true);
    });

    it('ensures favicon.svg renders official mascot and does not contain legacy crosshairs', () => {
      const svgPath = path.resolve('public/favicon.svg');
      expect(fs.existsSync(svgPath)).toBe(true);
      const svgContent = fs.readFileSync(svgPath, 'utf-8');
      expect(svgContent).not.toContain('stroke-width="2"');
      expect(svgContent).not.toContain('r="7" stroke="#FFFFFF"');
      expect(svgContent).toContain('<image href="data:image/png;base64,');
    });

    it('ensures index.html includes links to favicon.ico, multi-size PNGs, and mascot image', () => {
      const htmlPath = path.resolve('index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      expect(htmlContent).toContain('<link rel="icon" href="/favicon.ico"');
      expect(htmlContent).toContain('href="/favicon-48x48.png"');
      expect(htmlContent).toContain('href="/domoscope.png"');
      expect(htmlContent).toContain('href="/apple-touch-icon.png"');
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

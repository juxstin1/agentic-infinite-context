import * as cheerio from 'cheerio';

export interface ScrapedContent {
  url: string;
  title: string;
  description?: string;
  content: string;
  markdown: string;
  images: string[];
  links: string[];
  metadata: {
    author?: string;
    publishDate?: string;
    wordCount: number;
    readingTime: number; // minutes
  };
  timestamp: string;
}

export class WebScraper {
  /**
   * Scrape content from a URL
   */
  async scrape(url: string): Promise<ScrapedContent> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove scripts, styles, and other non-content elements
      $('script, style, nav, header, footer, aside, iframe').remove();

      // Extract title
      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text() ||
        'Untitled';

      // Extract description
      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '';

      // Extract author
      const author =
        $('meta[name="author"]').attr('content') ||
        $('meta[property="article:author"]').attr('content') ||
        $('[rel="author"]').text().trim() ||
        undefined;

      // Extract publish date
      const publishDate =
        $('meta[property="article:published_time"]').attr('content') ||
        $('meta[name="publish_date"]').attr('content') ||
        $('time[datetime]').attr('datetime') ||
        undefined;

      // Extract main content
      const contentSelectors = [
        'article',
        '[role="main"]',
        'main',
        '.post-content',
        '.article-content',
        '.entry-content',
        '#content',
        '.content',
      ];

      let contentElement = null;
      for (const selector of contentSelectors) {
        contentElement = $(selector).first();
        if (contentElement.length > 0) break;
      }

      if (!contentElement || contentElement.length === 0) {
        contentElement = $('body');
      }

      // Extract text content
      const content = contentElement.text().trim().replace(/\s+/g, ' ');

      // Extract markdown-style content
      const markdown = this.htmlToMarkdown(contentElement, $);

      // Extract images
      const images: string[] = [];
      contentElement.find('img').each((_, el) => {
        const src = $(el).attr('src');
        if (src) {
          images.push(this.normalizeUrl(src, url));
        }
      });

      // Extract links
      const links: string[] = [];
      contentElement.find('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('#')) {
          links.push(this.normalizeUrl(href, url));
        }
      });

      // Calculate reading time (average 200 words per minute)
      const wordCount = content.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);

      return {
        url,
        title: title.trim(),
        description: description.trim(),
        content,
        markdown,
        images: [...new Set(images)], // Remove duplicates
        links: [...new Set(links)], // Remove duplicates
        metadata: {
          author,
          publishDate,
          wordCount,
          readingTime,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(
        `Failed to scrape ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert HTML to Markdown
   */
  private htmlToMarkdown(element: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string {
    let markdown = '';

    element.children().each((_, el) => {
      const $el = $(el);
      const tagName = el.tagName?.toLowerCase();

      switch (tagName) {
        case 'h1':
          markdown += `\n# ${$el.text().trim()}\n\n`;
          break;
        case 'h2':
          markdown += `\n## ${$el.text().trim()}\n\n`;
          break;
        case 'h3':
          markdown += `\n### ${$el.text().trim()}\n\n`;
          break;
        case 'h4':
          markdown += `\n#### ${$el.text().trim()}\n\n`;
          break;
        case 'h5':
          markdown += `\n##### ${$el.text().trim()}\n\n`;
          break;
        case 'h6':
          markdown += `\n###### ${$el.text().trim()}\n\n`;
          break;
        case 'p':
          markdown += `${$el.text().trim()}\n\n`;
          break;
        case 'ul':
          $el.find('li').each((_, li) => {
            markdown += `- ${$(li).text().trim()}\n`;
          });
          markdown += '\n';
          break;
        case 'ol':
          $el.find('li').each((i, li) => {
            markdown += `${i + 1}. ${$(li).text().trim()}\n`;
          });
          markdown += '\n';
          break;
        case 'blockquote':
          const lines = $el.text().trim().split('\n');
          lines.forEach(line => {
            markdown += `> ${line}\n`;
          });
          markdown += '\n';
          break;
        case 'code':
          markdown += `\`${$el.text()}\``;
          break;
        case 'pre':
          markdown += `\`\`\`\n${$el.text().trim()}\n\`\`\`\n\n`;
          break;
        case 'a':
          const href = $el.attr('href');
          const text = $el.text().trim();
          if (href) {
            markdown += `[${text}](${href})`;
          } else {
            markdown += text;
          }
          break;
        case 'img':
          const src = $el.attr('src');
          const alt = $el.attr('alt') || '';
          if (src) {
            markdown += `![${alt}](${src})\n\n`;
          }
          break;
        case 'strong':
        case 'b':
          markdown += `**${$el.text().trim()}**`;
          break;
        case 'em':
        case 'i':
          markdown += `*${$el.text().trim()}*`;
          break;
        case 'br':
          markdown += '\n';
          break;
        default:
          // Recursively process child elements
          if ($el.children().length > 0) {
            markdown += this.htmlToMarkdown($el, $);
          } else {
            markdown += $el.text().trim() + ' ';
          }
      }
    });

    return markdown.trim();
  }

  /**
   * Normalize relative URLs to absolute URLs
   */
  private normalizeUrl(href: string, baseUrl: string): string {
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  }

  /**
   * Extract just the main text (no formatting)
   */
  async extractText(url: string): Promise<string> {
    const content = await this.scrape(url);
    return content.content;
  }

  /**
   * Extract structured data from the page
   */
  async extractMetadata(url: string): Promise<Record<string, any>> {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const metadata: Record<string, any> = {};

    // Extract Open Graph metadata
    $('meta[property^="og:"]').each((_, el) => {
      const property = $(el).attr('property')?.replace('og:', '');
      const content = $(el).attr('content');
      if (property && content) {
        metadata[property] = content;
      }
    });

    // Extract Twitter Card metadata
    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name')?.replace('twitter:', '');
      const content = $(el).attr('content');
      if (name && content) {
        metadata[`twitter_${name}`] = content;
      }
    });

    // Extract JSON-LD structured data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonLd = JSON.parse($(el).html() || '{}');
        metadata.structured_data = jsonLd;
      } catch {
        // Ignore invalid JSON-LD
      }
    });

    return metadata;
  }
}

export const webScraper = new WebScraper();

/**
 * PageCub - Page Content Extractor
 * Extracts clean content from any webpage
 */

class PageExtractor {
  extract() {
    return {
      title: this.getTitle(),
      author: this.getAuthor(),
      url: window.location.href,
      publishDate: this.getPublishDate(),
      bodyText: this.getCleanText(),
      timestamp: new Date().toISOString()
    };
  }

  getTitle() {
    // Try h1 first
    const h1 = document.querySelector('h1');
    if (h1 && h1.innerText.trim()) {
      return h1.innerText.trim();
    }

    // Try meta og:title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.content) {
      return ogTitle.content.trim();
    }

    // Fallback to document title
    return document.title.trim();
  }

  getAuthor() {
    // Try meta author
    const author = document.querySelector('meta[name="author"]');
    if (author && author.content) {
      return author.content.trim();
    }

    // Try meta article:author
    const articleAuthor = document.querySelector('meta[property="article:author"]');
    if (articleAuthor && articleAuthor.content) {
      return articleAuthor.content.trim();
    }

    // Try common author selectors
    const authorEl = document.querySelector('.author, .byline, [rel="author"]');
    if (authorEl && authorEl.innerText.trim()) {
      return authorEl.innerText.trim();
    }

    return 'Unknown';
  }

  getPublishDate() {
    // Try time element with datetime
    const timeEl = document.querySelector('time[datetime]');
    if (timeEl) {
      return timeEl.getAttribute('datetime');
    }

    // Try meta article:published_time
    const published = document.querySelector('meta[property="article:published_time"]');
    if (published && published.content) {
      return published.content;
    }

    // Fallback to current date
    return new Date().toISOString();
  }

  getCleanText() {
    // Try to find main article content using common selectors
    const selectors = [
      'article',
      'main',
      '[role="main"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.post-body',
      '.article-body'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.length > 200) {
        // Found substantial content
        const clone = element.cloneNode(true);

        // Remove unwanted elements
        const unwanted = clone.querySelectorAll(
          'script, style, nav, aside, footer, header, ' +
          '.ad, .ads, .advertisement, .social-share, ' +
          '.comments, .related-posts, [class*="sidebar"]'
        );
        unwanted.forEach(el => el.remove());

        return clone.innerText.trim();
      }
    }

    // Fallback: get body text and clean it
    const bodyClone = document.body.cloneNode(true);
    const unwanted = bodyClone.querySelectorAll(
      'script, style, nav, aside, footer, header, ' +
      '.ad, .ads, .advertisement, .social-share, .comments'
    );
    unwanted.forEach(el => el.remove());

    return bodyClone.innerText.trim();
  }
}

// Make available globally
window.PageExtractor = PageExtractor;

console.log('PageCub: Page extractor loaded');

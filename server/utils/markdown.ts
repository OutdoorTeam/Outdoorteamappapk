import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

export function markdownToSafeHtml(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  try {
    // Convert markdown to HTML
    const html = marked(markdown);
    
    // Sanitize the HTML to prevent XSS
    const safeHtml = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 
        'tr', 'td', 'th', 'hr', 'div', 'span'
      ],
      ALLOWED_ATTR: ['class'],
      ALLOW_DATA_ATTR: false
    });

    return safeHtml;
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    return '';
  }
}

export function stripMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  try {
    // Convert to HTML first
    const html = marked(markdown);
    // Strip all HTML tags
    return html.replace(/<[^>]*>/g, '').trim();
  } catch (error) {
    console.error('Error stripping markdown:', error);
    return markdown;
  }
}

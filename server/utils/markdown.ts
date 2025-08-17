import { marked } from 'marked';

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
    
    // Basic HTML sanitization - removing dangerous tags and attributes
    const safeHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '');

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

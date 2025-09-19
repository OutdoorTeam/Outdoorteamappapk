import { marked } from 'marked';

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

const parseMarkdown = (markdown: string): string => {
  const parsed = marked.parse(markdown);
  return typeof parsed === 'string' ? parsed : '';
};

export function markdownToSafeHtml(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  try {
    // Convert markdown to HTML
    const html = parseMarkdown(markdown);

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
    const html = parseMarkdown(markdown);
    // Strip all HTML tags
    return html.replace(/<[^>]*>/g, '').trim();
  } catch (error) {
    console.error('Error stripping markdown:', error);
    return markdown;
  }
}

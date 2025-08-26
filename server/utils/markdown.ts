import { marked } from 'marked';

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

export async function markdownToSafeHtml(markdown: string): Promise<string> {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  try {
    // Convert markdown to HTML
        // Convert markdown to HTML
    const html = await marked(markdown);
    
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

export async function stripMarkdown(markdown: string): Promise<string> {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  try {
    // Convert to HTML first
    const html = await marked(markdown);
    // Strip all HTML tags
    return html.replace(/<[^>]*>/g, '').trim();
  } catch (error) {
    console.error('Error stripping markdown:', error);
    return markdown;
  }
}

export function formatCardText(text: string): string {
  if (!text) return '';
  
  // 1. Escape basic HTML tags to prevent broken layouts
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
    
  // 2. Restore intended <br> tags
  formatted = formatted.replace(/&lt;br\s*\/?&gt;/gi, '<br />');

  // 3. Format inline list choices (e.g. "a) ", "B.) ") onto new indented lines
  // Matches patterns like: a), B), c.), D.)
  formatted = formatted.replace(/(^|\s+)([a-zA-Z])\.?\)\s+/g, (match, whitespace, letter, offset) => {
    const prefix = offset === 0 ? '' : '<br />&nbsp;&nbsp;&nbsp;&nbsp;';
    return `${prefix}<b>${letter})</b> `;
  });

  // 4. Format Roman numerals list items (e.g. " I. ", " II. ") onto new indented lines
  formatted = formatted.replace(/(^|\s+)(I|II|III|IV|V)\.\s+/g, (match, whitespace, numeral, offset) => {
    const prefix = offset === 0 ? '' : '<br />&nbsp;&nbsp;&nbsp;&nbsp;';
    return `${prefix}<b>${numeral}.</b> `;
  });

  return formatted;
}

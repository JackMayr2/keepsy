/**
 * Replace {{PLACEHOLDER}} tokens in group email templates (mail merge / ESP).
 * Keys are uppercase with underscores, matching the .txt / .html files in this folder.
 */
export function fillEmailTemplate(
  template: string,
  values: Partial<Record<string, string>>,
): string {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (full, key: string) => {
    const v = values[key];
    return v !== undefined && v !== '' ? v : full;
  });
}

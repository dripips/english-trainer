import { useMemo } from 'react';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

export function Markdown({ children }: { children: string }) {
  const html = useMemo(() => marked.parse(children || '', { async: false }) as string, [children]);
  return <div className="prose-rich" dangerouslySetInnerHTML={{ __html: html }} />;
}

import { useMemo } from 'react';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

export function Markdown({ children }: { children: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(children || '', { async: false }) as string;
    // Wrap tables in a horizontally scrollable container so wide tables can scroll
    // right instead of overflowing the screen.
    return raw.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
  }, [children]);
  return <div className="prose-rich" data-lookup dangerouslySetInnerHTML={{ __html: html }} />;
}

import type { EditorNodeJson } from './editor-json';

/**
 * Turns the editor document (ProseMirror JSON) into a real .docx in the browser. The library is
 * loaded only when someone clicks Export. Comments are review notes, not part of the document,
 * so they are not exported.
 */
export async function exportToDocx(content: EditorNodeJson, title: string): Promise<void> {
  const docx = await import('docx');
  const {
    AlignmentType,
    Document,
    ExternalHyperlink,
    HeadingLevel,
    LevelFormat,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
    BorderStyle,
  } = docx;

  type Run = InstanceType<typeof TextRun> | InstanceType<typeof ExternalHyperlink>;
  type Block = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;

  const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  };
  const HEADINGS = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ];

  let orderedInstances = 0;
  const hex = (v: unknown) => String(v).replace('#', '').toUpperCase();

  // ---------- inline ----------
  const runs = (nodes: EditorNodeJson[] = [], base: Record<string, unknown> = {}): Run[] =>
    nodes.flatMap((node): Run[] => {
      if (node.type === 'hardBreak') return [new TextRun({ break: 1 })];
      if (node.type !== 'text' || !node.text) return [];

      const style: Record<string, unknown> = { ...base, text: node.text };
      let link: string | null = null;
      for (const mark of node.marks ?? []) {
        const a = (mark.attrs ?? {}) as Record<string, string>;
        switch (mark.type) {
          case 'bold': style['bold'] = true; break;
          case 'italic': style['italics'] = true; break;
          case 'underline': style['underline'] = {}; break;
          case 'strike': style['strike'] = true; break;
          case 'subscript': style['subScript'] = true; break;
          case 'superscript': style['superScript'] = true; break;
          case 'code': style['font'] = 'Courier New'; break;
          case 'highlight':
            style['shading'] = { type: ShadingType.CLEAR, fill: hex(a['color'] ?? '#fef08a'), color: 'auto' };
            break;
          case 'textStyle':
            if (a['fontFamily']) style['font'] = a['fontFamily'];
            if (a['fontSize']) style['size'] = Math.round(parseFloat(a['fontSize']) * 2); // half-points
            if (a['color']) style['color'] = hex(a['color']);
            break;
          case 'link': link = a['href'] ?? null; break;
        }
      }
      if (link) {
        style['style'] = 'Hyperlink';
        style['color'] = style['color'] ?? '2563EB';
        style['underline'] = {};
        return [new ExternalHyperlink({ link, children: [new TextRun(style)] })];
      }
      return [new TextRun(style)];
    });

  // ---------- blocks ----------
  const blocks = (nodes: EditorNodeJson[] = [], ctx: { quote?: boolean; list?: { kind: 'bullet' | 'ordered'; level: number; instance: number } } = {}): Block[] =>
    nodes.flatMap((node): Block[] => {
      const align = node.attrs?.['textAlign'] as string | undefined;
      const alignment = align ? ALIGN[align] : undefined;

      switch (node.type) {
        case 'paragraph': {
          const list = ctx.list;
          return [
            new Paragraph({
              children: runs(node.content),
              alignment,
              ...(ctx.quote && {
                indent: { left: 720 },
                border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'CBD5E1', space: 8 } },
              }),
              ...(list?.kind === 'bullet' && { bullet: { level: list.level } }),
              ...(list?.kind === 'ordered' && {
                numbering: { reference: 'ordered', level: list.level, instance: list.instance },
              }),
            }),
          ];
        }
        case 'heading':
          return [
            new Paragraph({
              children: runs(node.content),
              heading: HEADINGS[(Number(node.attrs?.['level']) || 1) - 1],
              alignment,
            }),
          ];
        case 'bulletList':
        case 'orderedList': {
          const kind = node.type === 'bulletList' ? 'bullet' : 'ordered';
          const level = ctx.list ? ctx.list.level + 1 : 0;
          const instance = kind === 'ordered' ? ++orderedInstances : 0; // each list restarts at 1
          return (node.content ?? []).flatMap((item) =>
            blocks(item.content, { list: { kind, level, instance } }),
          );
        }
        case 'blockquote':
          return blocks(node.content, { ...ctx, quote: true });
        case 'codeBlock':
          return (node.content ?? []).map(
            (t) => new Paragraph({ children: [new TextRun({ text: t.text ?? '', font: 'Courier New' })] }),
          );
        case 'horizontalRule':
          return [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1', space: 1 } },
            }),
          ];
        case 'table':
          return [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: (node.content ?? []).map(
                (row) =>
                  new TableRow({
                    children: (row.content ?? []).map(
                      (cell) =>
                        new TableCell({
                          columnSpan: Number(cell.attrs?.['colspan']) || 1,
                          rowSpan: Number(cell.attrs?.['rowspan']) || 1,
                          shading:
                            cell.type === 'tableHeader'
                              ? { type: ShadingType.CLEAR, fill: 'F1F5F9', color: 'auto' }
                              : undefined,
                          children: cellBlocks(cell),
                        }),
                    ),
                  }),
              ),
            }),
            new Paragraph(''), // Word needs a paragraph after a table
          ];
        default:
          return [];
      }
    });

  const cellBlocks = (cell: EditorNodeJson): InstanceType<typeof Paragraph>[] => {
    const out = blocks(cell.content).filter((b): b is InstanceType<typeof Paragraph> => b instanceof Paragraph);
    return out.length ? out : [new Paragraph('')];
  };

  const document = new Document({
    title,
    numbering: {
      config: [
        {
          reference: 'ordered',
          levels: [0, 1, 2, 3].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ children: blocks(content.content) as Block[] }],
  });

  const blob = await Packer.toBlob(document);
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80) || 'document'}.docx`;
  window.document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** What the summary shows, already turned into plain text so PDF and Word share one source. */
export interface SummaryData {
  title: string;
  student: string;
  supervisors: string;
  exportedAt: string;
  milestones: { status: string; title: string; due: string; description?: string }[];
  meetings: { date: string; status: string; agenda: string[]; notes?: string }[];
  actionItems: { status: string; text: string; assignee: string; due: string }[];
}

const FILE_BASE = 'thesis-supervision-summary';

function save(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** pdfmake is large, so it is only fetched when someone exports. */
export async function exportSummaryPdf(s: SummaryData): Promise<void> {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  (pdfMake as any).vfs = vfs;

  const list = (items: string[], empty: string) =>
    items.length ? { ul: items, margin: [0, 0, 0, 8] as [number, number, number, number] } : { text: empty, italics: true, color: '#64748b' };

  const doc = {
    content: [
      { text: s.title, style: 'title' },
      { text: `Student: ${s.student}`, margin: [0, 6, 0, 0] },
      { text: `Supervisors: ${s.supervisors}` },
      { text: `Exported ${s.exportedAt}`, color: '#64748b', fontSize: 9, margin: [0, 2, 0, 12] },

      { text: 'Milestones', style: 'h2' },
      list(
        s.milestones.map((m) => `[${m.status}] ${m.title} (due ${m.due})${m.description ? ` - ${m.description}` : ''}`),
        'No milestones.',
      ),

      { text: 'Meetings', style: 'h2' },
      ...(s.meetings.length
        ? s.meetings.flatMap((m) => [
            { text: `${m.date} (${m.status})`, style: 'h3' },
            ...(m.agenda.length ? [{ text: 'Agenda', bold: true, fontSize: 10 }, { ul: m.agenda, margin: [0, 0, 0, 4] as [number, number, number, number] }] : []),
            ...(m.notes ? [{ text: 'Notes', bold: true, fontSize: 10 }, { text: m.notes, margin: [0, 0, 0, 6] as [number, number, number, number] }] : []),
          ])
        : [{ text: 'No meetings.', italics: true, color: '#64748b' }]),

      { text: 'Action items', style: 'h2' },
      list(
        s.actionItems.map((i) => `[${i.status}] ${i.text} (${i.assignee}, due ${i.due})`),
        'No action items.',
      ),
    ],
    styles: {
      title: { fontSize: 20, bold: true },
      h2: { fontSize: 14, bold: true, margin: [0, 12, 0, 4] as [number, number, number, number] },
      h3: { fontSize: 11, bold: true, margin: [0, 6, 0, 2] as [number, number, number, number] },
    },
    defaultStyle: { fontSize: 10 },
    info: { title: `${s.title} - supervision summary` },
  };
  (pdfMake as any).createPdf(doc).download(`${FILE_BASE}.pdf`);
}

/** The docx library is loaded only when someone exports. */
export async function exportSummaryDocx(s: SummaryData): Promise<void> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');

  const text = (t: string, opts: { bold?: boolean; color?: string; size?: number } = {}) =>
    new TextRun({ text: t, ...opts });
  const para = (t: string, opts: { bold?: boolean; color?: string; size?: number } = {}) =>
    new Paragraph({ children: [text(t, opts)], spacing: { after: 60 } });
  const bullet = (t: string) => new Paragraph({ children: [text(t)], bullet: { level: 0 } });
  const empty = (t: string) => para(t, { color: '64748b' });
  const heading = (t: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) =>
    new Paragraph({ text: t, heading: level, spacing: { before: 240, after: 80 } });

  const children = [
    new Paragraph({ text: s.title, heading: HeadingLevel.TITLE }),
    para(`Student: ${s.student}`),
    para(`Supervisors: ${s.supervisors}`),
    para(`Exported ${s.exportedAt}`, { color: '64748b', size: 18 }),

    heading('Milestones', HeadingLevel.HEADING_1),
    ...(s.milestones.length
      ? s.milestones.map((m) => bullet(`[${m.status}] ${m.title} (due ${m.due})${m.description ? ` - ${m.description}` : ''}`))
      : [empty('No milestones.')]),

    heading('Meetings', HeadingLevel.HEADING_1),
    ...(s.meetings.length
      ? s.meetings.flatMap((m) => [
          heading(`${m.date} (${m.status})`, HeadingLevel.HEADING_2),
          ...(m.agenda.length ? [para('Agenda', { bold: true }), ...m.agenda.map(bullet)] : []),
          ...(m.notes ? [para('Notes', { bold: true }), para(m.notes)] : []),
        ])
      : [empty('No meetings.')]),

    heading('Action items', HeadingLevel.HEADING_1),
    ...(s.actionItems.length
      ? s.actionItems.map((i) => bullet(`[${i.status}] ${i.text} (${i.assignee}, due ${i.due})`))
      : [empty('No action items.')]),
  ];

  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  save(blob, `${FILE_BASE}.docx`);
}

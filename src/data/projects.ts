export interface Project {
  title: string;
  year: string;
  description: string;
  stack: string;
  /** shown when the row is opened */
  details: string[];
  /** live demo or repo */
  href?: string;
}

export const projects: Project[] = [
  {
    title: 'Split Bill',
    year: '2026',
    description: 'Scan a receipt, tap who ate what, share a fair per-person split.',
    stack: 'react · ts · gemini',
    details: [
      'Gemini reads every line item, tax and service charge from a photo of the receipt',
      'You fix anything the scan got wrong before splitting',
      'Tax and service charge are shared in proportion to what each person ate',
      'Exports the result as an image for the group chat',
    ],
    href: undefined, // TODO: add the live or repo URL
  },
];

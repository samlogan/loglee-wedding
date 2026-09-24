/*=============================================>>>>>
= How the guest sheet tells your columns from the site's =
===============================================>>>>>*/

/**
 * The guest sheet has two kinds of column: the ones the couple fill in — names, email, nationality,
 * stay, nights, contribution, notes — first, and the ones the site fills in after them: the guest ID,
 * the personal link, the RSVP status, when each email went, and every answer from the RSVP form.
 *
 * The site's are greyed — header and cells, in the site's stone tones — so it is plain at a glance
 * which columns are yours to edit. Any column the site adds later (`addSiteColumns` in
 * `tools/guests/sheet.ts`) is added at the end and greyed the same way.
 */

const rgb = (hex: string) => ({
  blue: Number.parseInt(hex.slice(5, 7), 16) / 255,
  green: Number.parseInt(hex.slice(3, 5), 16) / 255,
  red: Number.parseInt(hex.slice(1, 3), 16) / 255
});

/** stone/200 behind the header, stone/600 italic text: the site's column, not yours. */
export const SITE_HEADER_FORMAT = {
  backgroundColor: rgb('#e8e5dc'),
  textFormat: { bold: true, foregroundColor: rgb('#65635c'), italic: true }
};

/** stone/50 behind the site's cells. */
export const SITE_CELL_FORMAT = { backgroundColor: rgb('#f3f1ea') };

/** Your columns' header: bold, on pine/50, so the columns to fill in stand out. */
export const COUPLE_HEADER_FORMAT = {
  backgroundColor: rgb('#e3ebe5'),
  textFormat: { bold: true, foregroundColor: rgb('#131412'), italic: false }
};

type Format = typeof SITE_HEADER_FORMAT | typeof SITE_CELL_FORMAT | typeof COUPLE_HEADER_FORMAT;

const paint = (sheetId: number, column: number, rows: [number, number | undefined], format: Format) => ({
  repeatCell: {
    cell: { userEnteredFormat: format },
    fields: `userEnteredFormat(${Object.keys(format).join(',')})`,
    range: {
      endColumnIndex: column + 1,
      sheetId,
      startColumnIndex: column,
      startRowIndex: rows[0],
      ...(rows[1] === undefined ? {} : { endRowIndex: rows[1] })
    }
  }
});

/** The Sheets API requests that grey one of the site's columns: its header, then every row below. */
export const siteColumnRequests = (sheetId: number, column: number) => [
  paint(sheetId, column, [0, 1], SITE_HEADER_FORMAT),
  paint(sheetId, column, [1, undefined], SITE_CELL_FORMAT)
];

/** The request that sets one of the couple's column headers apart. */
export const coupleColumnRequest = (sheetId: number, column: number) =>
  paint(sheetId, column, [0, 1], COUPLE_HEADER_FORMAT);

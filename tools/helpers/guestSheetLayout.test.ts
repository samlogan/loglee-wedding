import { describe, expect, it } from 'vitest';

import { SITE_CELL_FORMAT, SITE_HEADER_FORMAT, siteColumnRequests } from './guestSheetLayout';

describe('siteColumnRequests', () => {
  it('greys the header cell, then every row under it, in that one column', () => {
    const [header, cells] = siteColumnRequests(7, 12);
    expect(header.repeatCell.range).toEqual({
      endColumnIndex: 13,
      endRowIndex: 1,
      sheetId: 7,
      startColumnIndex: 12,
      startRowIndex: 0
    });
    expect(header.repeatCell.cell.userEnteredFormat).toBe(SITE_HEADER_FORMAT);
    expect(cells.repeatCell.range).toEqual({ endColumnIndex: 13, sheetId: 7, startColumnIndex: 12, startRowIndex: 1 });
    expect(cells.repeatCell.cell.userEnteredFormat).toBe(SITE_CELL_FORMAT);
  });

  it('only touches the formats it sets, so the value and any other formatting stay', () => {
    const [header, cells] = siteColumnRequests(0, 0);
    expect(header.repeatCell.fields).toBe('userEnteredFormat(backgroundColor,textFormat)');
    expect(cells.repeatCell.fields).toBe('userEnteredFormat(backgroundColor)');
  });

  it('writes colours as the 0–1 channels the Sheets API takes — #f3f1ea here', () => {
    expect(SITE_CELL_FORMAT.backgroundColor).toEqual({ blue: 234 / 255, green: 241 / 255, red: 243 / 255 });
  });
});

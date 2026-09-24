/**
 * The guest emails, built for upload to Loops.
 *
 *   yarn emails:build
 *
 * Writes, for each email in `EMAILS` below:
 *   tools/emails/dist/<name>.zip           — upload this in Loops: email editor → Code → upload
 *   tools/emails/dist/<name>/index.mjml    — what the zip holds, with img/header.png
 *   tools/emails/dist/<name>.preview.html  — the compiled email with sample values, to open in a browser
 *
 * ## Why coded, not Loops's visual editor
 *
 * To match the site: its colours, its three typefaces, the pine mono eyebrows, the plum rounded
 * button, the raised card on the stone page. The parts that cannot be live text are
 * the display and handwritten type — Gmail and Outlook ignore web fonts, so the site's Archivo
 * capitals and handwritten Caveat byline are images (`header.html`, rendered to `img/header.png` and `img/signoff.png` by this script) — the
 * handwritten sign-off too, after a real inbox showed it in Bradley Hand.
 *
 * The body falls back from the site's fonts (Instrument Sans, JetBrains Mono) to Helvetica /
 * Arial and Courier, so Gmail and Outlook get the same layout in system type.
 *
 * ## Placeholders
 *
 * Loops fills `{firstName}`, `{guestId}` and `{rsvpLink}` from the contact properties the site sets
 * when it sends (`tools/guests/loops.ts` on the guest-emails branch), and requires
 * `{unsubscribe_link}`. The subject and preview line are set in Loops; suggestions are in `EMAILS`.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, 'dist');

/** The site's tokens, from tools/sass/global/_variables.scss. */
const C = {
  accent: '#1e4632', // pine/600 — eyebrows, links
  button: '#972a6a', // signal/300 — plum, the accent button
  card: '#f8f7f2', // stone/25 — --bg-raised
  muted: '#65635c', // stone/600 — --fg-muted
  page: '#f3f1ea', // stone/50 — --bg-default
  stroke: '#e8e5dc', // stone/200 — card border
  text: '#131412' // stone/900 — --fg-default
};

const SANS = "'Instrument Sans', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, 'Courier New', monospace";

const SITE = 'https://samandlauren.wedding';

/** The sign-off image's width at email size, set by `renderArtwork` before any email is laid out. */
let SIGNOFF_WIDTH = 240;

/** Sample values for the preview only — Loops fills the real ones. */
const SAMPLE = { firstName: 'Sam', guestId: 'SAM-6137', rsvpLink: `${SITE}/g/SAM-6137/`, unsubscribe_link: '#' };

const eyebrow = (text) =>
  `<mj-text font-family="${MONO}" font-size="12px" font-weight="500" letter-spacing="1.2px" color="${C.accent}" padding="0 0 14px">${text.toUpperCase()}</mj-text>`;

const paragraph = (html) => `<mj-text padding="0 0 16px">${html}</mj-text>`;

/** The When / Where / RSVP rows, with mono labels as the site sets its micro-labels. */
const details = (rows) => `
        <mj-table padding="8px 0 24px" font-size="15px" line-height="1.5" color="${C.text}">
${rows
  .map(
    ([label, value]) => `          <tr>
            <td style="width:92px;padding:10px 12px 10px 0;border-top:1px solid ${C.stroke};vertical-align:top;font-family:${MONO};font-size:11px;letter-spacing:1.1px;color:${C.accent};text-transform:uppercase;">${label}</td>
            <td style="padding:9px 0;border-top:1px solid ${C.stroke};vertical-align:top;">${value}</td>
          </tr>`
  )
  .join('\n')}
        </mj-table>`;

/**
 * The proposal photo, above the card in the invitation. From the Sanity asset, as a 1120px JPEG — the
 * original is a 3.2 MB PNG, far too heavy for an inbox — twice the 560px it shows at, for retina.
 * Kept in the repo (`img/photo.jpg`) so the build does not depend on the network.
 */
const PHOTO = {
  alt: 'Sam proposing to Lauren under a green garden arch by the water',
  source:
    'https://cdn.sanity.io/images/tftcitbh/production/3a01e4a145e85516c9e54974b8aa9c02f191178d-2038x1172.png?w=1120&fm=jpg&q=78'
};

const photo = `
    <mj-wrapper padding="0 20px 16px">
      <mj-section padding="0">
        <mj-column>
          <mj-image src="img/photo.jpg" alt="${PHOTO.alt}" width="560px" border-radius="8px" padding="0" />
        </mj-column>
      </mj-section>
    </mj-wrapper>
`;

const layout = ({ title, preheader, body, withPhoto = false }) => `<mjml>
  <mj-head>
    <mj-title>${title}</mj-title>
    <mj-preview>${preheader}</mj-preview>
    <mj-font name="Instrument Sans" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&amp;display=swap" />
    <mj-font name="JetBrains Mono" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&amp;display=swap" />
        <mj-attributes>
      <mj-all font-family="${SANS}" />
      <mj-text font-size="17px" line-height="1.55" color="${C.text}" />
      <mj-section padding="0" />
      <mj-column padding="0" />
    </mj-attributes>
    <mj-style inline="inline">
      a { color: ${C.accent}; }
    </mj-style>
    <mj-style>
      /* Apple Mail turns dates, addresses and numbers into links; keep them as the text around them. */
      a[x-apple-data-detectors] { color: inherit !important; font: inherit !important; text-decoration: none !important; }
    </mj-style>
    <mj-raw>
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light" />
    </mj-raw>
  </mj-head>
  <mj-body background-color="${C.page}" width="600px">
    <mj-section padding="16px 0 0">
      <mj-column>
        <mj-image src="img/header.png" alt="Sam &amp; Lauren are getting married" width="600px" padding="0" href="${SITE}" />
      </mj-column>
    </mj-section>
${withPhoto ? photo : ''}
    <mj-wrapper padding="0 20px">
      <mj-section background-color="${C.card}" border="1px solid ${C.stroke}" border-radius="8px" padding="36px 30px 26px">
        <mj-column>
${body}
          <mj-image src="img/signoff.png" alt="With love, Sam &amp; Lauren" width="${SIGNOFF_WIDTH}px" align="left" padding="18px 0 0" />
        </mj-column>
      </mj-section>
    </mj-wrapper>

    <mj-section padding="24px 20px 36px">
      <mj-column>
        <mj-text align="center" font-family="${MONO}" font-size="11px" letter-spacing="1.1px" line-height="1.8" color="${C.muted}" padding="0">
          <span style="white-space:nowrap;">12–14&#8288; FEB&#8288; 2027</span> · THE LODGE JAMBEROO<br />
          <a href="${SITE}" style="color:${C.muted};white-space:nowrap;">SAMANDLAUREN.WEDDING</a> · <a href="{unsubscribe_link}" style="color:${C.muted};">UNSUBSCRIBE</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

const button = (label) =>
  `<mj-button href="{rsvpLink}" align="left" background-color="${C.button}" color="#ffffff" font-size="17px" font-weight="600" border-radius="8px" inner-padding="16px 30px" padding="0 0 18px">${label} →</mj-button>`;

const guestIdNote = `<mj-text font-size="14px" line-height="1.5" color="${C.muted}" padding="0">The button signs you straight in. On another device, go to <a href="${SITE}" style="white-space:nowrap;">samandlauren.wedding</a> and enter your guest ID: <span style="font-family:${MONO};font-size:13px;color:${C.text};letter-spacing:0.5px;">{guestId}</span></mj-text>`;

const WHEN = 'Friday 12 – Sunday 14 February 2027';
const WHERE =
  'The Lodge Jamberoo<br /><span style="color:#65635c;">406 Jamberoo Mountain Rd, Jamberoo NSW · 90 min south of Sydney</span>';

const EMAILS = {
  invitation: {
    subject: 'Sam & Lauren are getting married',
    title: 'You’re invited — Sam & Lauren',
    preheader: 'Join us at The Lodge Jamberoo, 12–14 February 2027. RSVP by 30 November.',
    withPhoto: true,
    body: [
      eyebrow('You’re invited'),
      `<mj-text font-size="28px" font-weight="600" line-height="1.2" padding="0 0 18px">Hi {firstName},</mj-text>`,
      paragraph(
        'We’re getting married, and we’d love you to be there. Join us for a whole weekend at The Lodge Jamberoo, in the hills south of Sydney.'
      ),
      paragraph('Everyone stays on site and we’ve booked the rooms, so all you need to do is tell us you’re coming.'),
      details([
        ['When', WHEN],
        ['Where', WHERE],
        ['RSVP by', '30 November 2026']
      ]),
      button('RSVP now'),
      guestIdNote
    ].join('\n          ')
  },
  reminder: {
    subject: 'A gentle reminder to RSVP',
    title: 'A gentle reminder — Sam & Lauren',
    preheader: 'Replies close on 30 November. It only takes a minute.',
    body: [
      eyebrow('A gentle reminder'),
      `<mj-text font-size="28px" font-weight="600" line-height="1.2" padding="0 0 18px">Hi {firstName},</mj-text>`,
      paragraph(
        'We haven’t had your RSVP yet, and replies close on <strong>30 November</strong>. It only takes a minute, and it helps us confirm rooms and numbers with the venue.'
      ),
      details([
        ['When', WHEN],
        ['Where', WHERE]
      ]),
      button('RSVP now'),
      guestIdNote
    ].join('\n          ')
  }
};

/**
 * Render the artwork in `header.html` — the header and the sign-off — to PNG. Returns the sign-off's
 * width in CSS pixels at email size (half its 2x render), which its `<mj-image>` is set to.
 */
const renderArtwork = async () => {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { height: 1000, width: 1200 } });
  await page.goto(`file://${path.join(here, 'header.html')}`);
  await page.evaluate(() => document.fonts.ready);
  await (await page.$('.header')).screenshot({ path: path.join(here, 'img', 'header.png') });
  // Transparent, so the edges blend into the card rather than showing a box of a near-match colour.
  await page.evaluate(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  });
  const signoff = await page.$('.signoff');
  await signoff.screenshot({ omitBackground: true, path: path.join(here, 'img', 'signoff.png') });
  const { width } = await signoff.boundingBox();
  await browser.close();
  return Math.round(width / 2);
};

const mjml = (file) =>
  execFileSync('npx', ['--yes', 'mjml@4', file, '--stdout', '--config.validationLevel=strict'], { encoding: 'utf8' });

SIGNOFF_WIDTH = await renderArtwork();
rmSync(dist, { force: true, recursive: true });

for (const [name, email] of Object.entries(EMAILS)) {
  const folder = path.join(dist, name);
  mkdirSync(path.join(folder, 'img'), { recursive: true });
  writeFileSync(path.join(folder, 'index.mjml'), layout(email));
  copyFileSync(path.join(here, 'img', 'header.png'), path.join(folder, 'img', 'header.png'));
  copyFileSync(path.join(here, 'img', 'signoff.png'), path.join(folder, 'img', 'signoff.png'));
  if (email.withPhoto) {
    copyFileSync(path.join(here, 'img', 'photo.jpg'), path.join(folder, 'img', 'photo.jpg'));
  }

  // The preview: compiled, with sample values and the local header, to open straight in a browser.
  let html = mjml(path.join(folder, 'index.mjml'));
  for (const [key, value] of Object.entries(SAMPLE)) {
    html = html.replaceAll(`{${key}}`, value);
  }
  writeFileSync(path.join(dist, `${name}.preview.html`), html.replaceAll('"img/', `"${name}/img/`));

  execFileSync('zip', ['-qr', path.join(dist, `${name}.zip`), 'index.mjml', 'img'], { cwd: folder });
  console.log(`${name.padEnd(11)} → tools/emails/dist/${name}.zip   subject: “${email.subject}”`);
}

console.log(
  `\nPreview: open tools/emails/dist/*.preview.html. Header: ${readFileSync(path.join(here, 'img', 'header.png')).length} bytes.`
);

/**
 * A document's chart (doc.ts `Chart`) as a DrawingML chart part, for the Word copy and the Excel copy: two series as bars
 * across, the years top to bottom as on the page and in the PDF, each figure at its bar's end, the tight year's bars in
 * amber. In the Excel copy the series read the model's own cells (`refs`), so the chart follows the figures when an input
 * changes; in the Word copy they hold the figures as given. Pure text, no DOM.
 */
import type { Chart } from './doc';

export const CHART_URI = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
export const CHART_TYPE = 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml';
export const CHART_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const xml = (t: string) => t.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The chart's size in points: its title and key, then two bars a year. */
export const chartSize = (c: Chart, width: number) => ({ w: width, h: 74 + c.rows.length * 30 });
/** Points to EMU, DrawingML's unit. */
export const emu = (pt: number) => Math.round(pt * 12700);

/** Where the Excel copy's labels and two series are, as ranges ('Statement'!$C$4:$H$4). */
export interface ChartRefs { labels: string; a: string; b: string }

const INK = '1A1A1A', LIGHT = 'A0A6B3', AMBER = 'B45309', AMBER_LIGHT = 'F0C080', RULE = 'BFBFBF';
const fill = (c: string) => `<c:spPr><a:solidFill><a:srgbClr val="${c}"/></a:solidFill></c:spPr>`;
const text = (size: number, bold = false, color = INK) => `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}" b="${bold ? 1 : 0}">`
  + `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="en-IN"/></a:p></c:txPr>`;

/** The chart part. Element order follows the schema (CT_ChartSpace, CT_Chart, CT_BarChart, CT_BarSer, CT_DLbls, the axes). */
export function chartXml(c: Chart, refs?: ChartRefs): string {
  const scale = c.scale ?? 1, decimals = c.decimals ?? 0, n = c.rows.length;
  const format = decimals ? `#,##0.${'0'.repeat(decimals)}` : '#,##0';
  const tight = c.rows.findIndex((r) => r.tight);
  const labels = `<c:ptCount val="${n}"/>${c.rows.map((r, i) => `<c:pt idx="${i}"><c:v>${xml(r.label)}</c:v></c:pt>`).join('')}`;
  const values = (k: 0 | 1) => `<c:formatCode>${xml(format)}</c:formatCode><c:ptCount val="${n}"/>`
    + c.rows.map((r, i) => `<c:pt idx="${i}"><c:v>${Number((r.values[k] / scale).toFixed(10))}</c:v></c:pt>`).join('');
  const cat = refs ? `<c:cat><c:strRef><c:f>${xml(refs.labels)}</c:f><c:strCache>${labels}</c:strCache></c:strRef></c:cat>`
    : `<c:cat><c:strLit>${labels}</c:strLit></c:cat>`;
  const val = (k: 0 | 1) => (refs ? `<c:val><c:numRef><c:f>${xml(k ? refs.b : refs.a)}</c:f><c:numCache>${values(k)}</c:numCache></c:numRef></c:val>`
    : `<c:val><c:numLit>${values(k)}</c:numLit></c:val>`);
  const series = (k: 0 | 1) => `<c:ser><c:idx val="${k}"/><c:order val="${k}"/><c:tx><c:v>${xml(c.names[k])}</c:v></c:tx>${fill(k ? LIGHT : INK)}`
    + '<c:invertIfNegative val="0"/>'
    + (tight >= 0 ? `<c:dPt><c:idx val="${tight}"/><c:invertIfNegative val="0"/><c:bubble3D val="0"/>${fill(k ? AMBER_LIGHT : AMBER)}</c:dPt>` : '')
    + `<c:dLbls><c:numFmt formatCode="${xml(format)}" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${text(800)}`
    + '<c:dLblPos val="outEnd"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>'
    + `${cat}${val(k)}</c:ser>`;
  const title = `${c.title} (${c.unit})`;
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + `<c:chartSpace xmlns:c="${CHART_URI}" xmlns:a="${A}" xmlns:r="${R}"><c:roundedCorners val="0"/><c:chart>`
    + `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1000" b="1"/></a:pPr><a:r><a:rPr lang="en-IN" sz="1000" b="1"/><a:t>${xml(title)}</a:t></a:r></a:p></c:rich></c:tx>`
    + '<c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>'
    + `<c:barChart><c:barDir val="bar"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series(0)}${series(1)}<c:gapWidth val="70"/><c:overlap val="-5"/><c:axId val="1001"/><c:axId val="1002"/></c:barChart>`
    + '<c:catAx><c:axId val="1001"/><c:scaling><c:orientation val="maxMin"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:numFmt formatCode="General" sourceLinked="0"/>'
    + `<c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="${RULE}"/></a:solidFill></a:ln></c:spPr>${text(850)}`
    + '<c:crossAx val="1002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>'
    + '<c:valAx><c:axId val="1002"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="1"/><c:axPos val="t"/>'
    + `<c:numFmt formatCode="${xml(format)}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>`
    + '<c:crossAx val="1001"/><c:crosses val="max"/><c:crossBetween val="between"/></c:valAx>'
    + '<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:plotArea>'
    + `<c:legend><c:legendPos val="t"/><c:overlay val="0"/>${text(850)}</c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>`
    + `<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${text(850)}</c:chartSpace>`;
}

/** The line under the chart that names the amber year, as the page and the PDF shade it. */
export const tightLine = (c: Chart) => {
  const t = c.rows.find((r) => r.tight);
  return t ? `In amber: ${t.label}, the ${c.tightName} year.` : '';
};

/** The pen's strokes for home's trailers after the first (AG3b, D-UX-78), fetched as the reader nears each. */
import type { APIRoute } from 'astro';
import { LAZY_TRAILERS } from '../../home/story';
import { strokesOf } from '../../home/sheet';

export const getStaticPaths = () => LAZY_TRAILERS.map((t) => ({ params: { id: t.id }, props: { t } }));
export const GET: APIRoute = ({ props }) => new Response(JSON.stringify(strokesOf(props.t)), { headers: { 'Content-Type': 'application/json' } });

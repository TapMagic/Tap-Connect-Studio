/** LOCAL TEST SCAFFOLD ONLY. Writes a route into an isolated checkout, never the
 * deployed app. Use one copy at the accepted commit and one at the candidate.
 * RENDER_COMPAT_FIXTURE=1 npm run dev -- --webpack --hostname 127.0.0.1 --port PORT
 * Open /everencore/render-compat at desktop and 390px browser viewports.
 * Pass --props /private/path/props.json for an approved saved document fixture.
 * No database, credentials, publishing or external mutation is involved.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { defaultTapConnectCard } from '../lib/brand/tap-card';
import { renderingCompatibilityFixture } from '../lib/fusion/creative-studio/__tests__/fixtures/rendering-compatibility';
async function main() {
const { values } = parseArgs({ options: { target: { type: 'string' }, props: { type: 'string' }, authored: { type: 'boolean' } } });
if (!values.target) throw new Error('--target isolated checkout required');
const props = values.props ? JSON.parse(await readFile(path.resolve(values.props), 'utf8')) : {
  config: { ...defaultTapConnectCard({ businessName: 'Rendering compatibility', accentColor: '#b8ff2c' }), sections: [], rootComposition: renderingCompatibilityFixture(values.authored) },
  profile: { displayName: 'Rendering compatibility' }, businessName: 'Rendering compatibility', businessId: 'local-render-fixture', deviceSlotId: 'local-render-fixture', keepCardEnabled: false, walletFeatureOn: false,
};
function rejectSecrets(value: unknown) {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (/tokenHash|password|secret|privateKey|credentialState|connectionString|DATABASE_URL/i.test(key)) throw new Error('Use render props only; credential material is forbidden');
    rejectSecrets(item);
  }
}
rejectSecrets(props);
const target = path.resolve(values.target);
const fixture = path.join(target, 'tmp/render-compatibility/props.json');
await mkdir(path.dirname(fixture), { recursive: true, mode: 0o700 });
await writeFile(fixture, JSON.stringify(props), { mode: 0o600 });
const route = path.join(target, 'app/everencore/render-compat');
await mkdir(route, { recursive: true });
await writeFile(path.join(route, 'page.tsx'), `import {readFile} from 'node:fs/promises';
import {notFound} from 'next/navigation';
import {TapConnectCardPublic} from '@/components/tap/tap-connect-card-public';
export default async function RenderingFixture(){if(process.env.RENDER_COMPAT_FIXTURE!=='1'||process.env.NODE_ENV!=='development')notFound();const props=JSON.parse(await readFile(${JSON.stringify(fixture)},'utf8'));return <TapConnectCardPublic {...props}/>;}
`);
console.log('Local-only fixture prepared. Do not commit generated routes or private fixture data.');

}
main().catch(error => { console.error(error instanceof Error ? error.message : "Fixture preparation failed"); process.exitCode = 1; });

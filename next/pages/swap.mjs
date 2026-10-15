// Pages the old site had that the swap needs: member.html?u=<discord id> (Discord /profile embeds link to it).
import { shell } from '../lib/ui.mjs';
export function member() {
  const body = `<div class="wrap"><section class="sec"><h1 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Member profile</h1><div id="member-page" data-member-page><div class="panel" style="min-height:220px"><p class="muted">Loading the profile…</p></div></div></section></div>`;
  return shell({ group: '', page: 'member.html', title: 'Member', body, extraHead: '<script src="member.js" defer></script><meta name="robots" content="noindex">' });
}
export default function (P) { P('member.html', member()); }

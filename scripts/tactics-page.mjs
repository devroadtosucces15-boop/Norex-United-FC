// Tactics Studio / Playbook (redesign BE1). The Worker owns permissions and document validation;
// this page is the production member/manager surface for the already-tested /api/plays contract.
export function buildTactics({ write, page, pageHead, emptyState, config }) {
  write('tactics.html', page({
    title: `Tactics – ${config.siteTitle}`, base: '', active: 'tactics-studio',
    description: `${config.siteTitle} playbook – learn published plays, take quizzes and manage club tactics.`,
    body: `${pageHead('🧠 Tactics Studio', 'The club playbook: set pieces, formations and drills. Learn the plan before match night.', '')}
<div data-flag="tactics" hidden><div class="tx" data-tactics></div></div>
<div class="tx-soon">${emptyState('🧠', 'Tactics Studio is being staged', 'The playbook is available to the roles currently enabled for this feature.')}</div>
<link rel="stylesheet" href="assets/tactics.css"><script src="assets/tactics.js" defer></script>`,
  }));
}

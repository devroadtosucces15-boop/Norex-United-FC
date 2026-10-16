const workflows = [
  {
    id: 'ND-025',
    matches: value =>
      /\bND-025\b/i.test(value) ||
      (/shadow rehearsal/i.test(value) && /evidence/i.test(value)),
    title: 'End-to-end Shadow rehearsal',
    scope: '.norex/** only',
    risk: 'R1',
    requires_approval: true,
    steps: [
      { id: 'checkpoint', capability: 'git.status', action: 'Verify clean Shadow checkpoint' },
      { id: 'evidence', capability: 'evidence.write', action: 'Create ND-025 rehearsal evidence under .norex/evidence/' },
      { id: 'diff', capability: 'git.diff', action: 'Inspect resulting Shadow-only diff' },
      { id: 'validate', capability: 'ci.shadow', action: 'Run deterministic Shadow validation' },
      { id: 'record', capability: 'evidence.record', action: 'Record validation result and rehearsal outcome' }
    ]
  }
];

export function planIntent(raw) {
  if (typeof raw !== 'string') throw new Error('Intent must be text');

  const intent = raw.trim();

  if (!intent || intent.length > 1000) {
    throw new Error('Intent must contain 1-1000 characters');
  }

  const workflow = workflows.find(candidate => candidate.matches(intent));

  if (!workflow) {
    return {
      recognized: false,
      status: 'GATED',
      message: 'No deterministic local workflow matches this request. No command was generated or executed.'
    };
  }

  return {
    recognized: true,
    status: 'PROPOSED',
    workflow_id: workflow.id,
    title: workflow.title,
    scope: workflow.scope,
    risk: workflow.risk,
    requires_approval: workflow.requires_approval,
    steps: workflow.steps,
    message: 'Plan created locally. No step has executed. Explicit approval is required before execution.'
  };
}

const form = document.querySelector('#composer'), input = document.querySelector('#prompt'), stream = document.querySelector('#stream'), artifact = document.querySelector('#artifact'), tabs = [...document.querySelectorAll('.artifact-tab')];
let generation = 0;
const history = new Map();
async function api(path, body) {
  const response = await fetch('/api/' + path, { method: body ? 'POST' : 'GET', headers: { 'X-Norex-Local': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Local request failed');
  return value;
}
function element(tag, text, className) { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; }
function button(label, callback) { const node = element('button', label); node.type = 'button'; node.addEventListener('click', callback); return node; }
function select(label, options) {
  const wrapper = element('label', label), node = element('select');
  for (const [value, text] of options) { const option = element('option', text); option.value = value; node.append(option); }
  wrapper.append(node); return [wrapper, node];
}
async function showArtifact(name) {
  const version = ++generation;
  tabs.forEach(t => { const active = t.dataset.artifact === name; t.classList.toggle('active', active); t.setAttribute('aria-selected', String(active)); });
  artifact.hidden = name === 'session'; stream.hidden = name !== 'session';
  if (name === 'session') return;
  const head = element('div', '', 'artifact-head'), title = element('h3', name.toUpperCase()), badge = element('span', name === 'preview' ? 'GATED' : 'LOCAL', 'artifact-state');
  head.append(title, badge);
  const meta = element('p', 'Loading local service…', 'artifact-meta'), controls = element('div', '', 'service-controls'), output = element('pre', 'Loading…');
  output.setAttribute('aria-live', 'polite'); output.setAttribute('tabindex', '0');
  artifact.replaceChildren(head, meta, controls, output);
  try {
    if (name === 'preview') {
      badge.textContent = 'LOCAL'; meta.textContent = 'Ephemeral Chromium · localhost only · no persistent profile · $0.00';
      output.textContent = 'Preview is approval-gated and may inspect only this local Dev OS origin.';
      const run = button('Approve local preview', async () => { run.disabled = true; badge.textContent = 'RUNNING'; try { const result = await api('preview', { approved: true }); output.textContent = `${result.status.toUpperCase()} · ${result.url} · exit ${result.exit_code}\n\n${result.output}`; badge.textContent = result.status.toUpperCase(); } catch (error) { output.textContent = error.message; badge.textContent = 'BLOCKED'; } finally { run.disabled = false; refreshRuntimePulse(); } });
      controls.append(run); return;
    }
    const state = await api('state');
    if (version !== generation) return;
    meta.textContent = state.branch + ' · .norex/ only · ' + state.budget + ' metered spend';
    if (name === 'diff') {
      const [status, inventory] = await Promise.all([api('git/status'), api('files')]);
      if (version !== generation) return;
      const summary = status.changes.length ? status.changes.map(c => c.status + ' ' + c.path).join('\n') : 'No readable Shadow changes.';
      output.textContent = summary;
      const paths = [...new Set([...status.changes.map(c => c.path), ...inventory.files])];
      const [label, chosen] = select('Shadow file', paths.map(p => [p, p]));
      let selection = 0;
      const inspect = async mode => {
        const request = ++selection; output.textContent = 'Reading…';
        try {
          const result = await api((mode === 'diff' ? 'git/diff' : 'file') + '?path=' + encodeURIComponent(chosen.value));
          if (request !== selection) return;
          output.textContent = mode === 'diff' ? 'STAGED\n' + (result.staged || '(none)') + '\nUNSTAGED\n' + (result.unstaged || '(none)') + '\n' + result.note : result.content;
        } catch (error) { if (request === selection) output.textContent = error.message; }
      };
      controls.append(button('Refresh status', () => showArtifact('diff')), label, button('Show diff', () => inspect('diff')), button('Inspect file', () => inspect('file')));
    } else {
      const available = state.commands.filter(c => name !== 'tests' || c.id.startsWith('shadow-'));
      const [label, chosen] = select(name === 'tests' ? 'Validation target' : 'Allowed command', available.map(c => [c.id, c.label]));
      const proposal = element('p', '', 'artifact-meta');
      const update = () => { proposal.textContent = available.find(c => c.id === chosen.value).command + ' · fixed arguments · 30-second limit per process'; };
      chosen.addEventListener('change', update); update();
      let requestId = null, poll = null;
      const cancel = button('Cancel active run', async () => {
        if (!requestId) return;
        cancel.disabled = true;
        try { await api('cancel', { request_id: requestId }); badge.textContent = 'CANCELLING'; }
        catch (error) { output.textContent += `\n\nCancel failed: ${error.message}`; cancel.disabled = false; }
      });
      cancel.disabled = true;
      const run = button('Approve & run locally', async () => {
        run.disabled = true; chosen.disabled = true; badge.textContent = 'RUNNING'; output.textContent = 'Starting selected local command…';
        poll = setInterval(async () => {
          try {
            const state = await api('state');
            if (state.active_run) {
              requestId = state.active_run.request_id; cancel.disabled = false;
              output.textContent = state.active_run.output || 'Running selected local command…';
            }
          } catch {}
        }, 150);
        try {
          const result = await api('run', { command_id: chosen.value, approved: true });
          requestId = result.request_id;
          const text = `${result.command}\n${result.status.toUpperCase()} · exit ${result.exit_code}\n${result.started_at} → ${result.finished_at}\nRequest: ${result.request_id}\n\n${result.output || '(no output)'}`;
          history.set(name, text); output.textContent = text; badge.textContent = result.status.toUpperCase();
        } catch (error) { output.textContent = error.message; badge.textContent = 'BLOCKED'; }
        finally { clearInterval(poll); poll = null; requestId = null; cancel.disabled = true; run.disabled = false; chosen.disabled = false; refreshRuntimePulse(); }
      });
      controls.append(label, proposal, run, cancel);
      const durable = await api('artifacts');
      const recent = durable.artifacts.filter(item => item.kind === name).slice(-5);
      output.textContent = history.get(name) || (recent.length ? `Durable run references:\n${recent.map(item => `${item.created_at} · ${item.ref}`).join('\n')}\n\nSelect a durable run to load its bounded persisted output.` : 'Select a fixed command and approve this run. Durable run metadata and bounded output are recorded after execution. No free-form shell is available.');
      for (const item of recent) {
        if (!item.execution_id) continue;
        controls.append(button('Load ' + item.execution_id.slice(0, 8), async () => {
          try { const saved = await api('execution/output?id=' + encodeURIComponent(item.execution_id)); output.textContent = saved.output ? `${item.ref}\n${saved.output.truncated ? 'TRUNCATED · ' : ''}${saved.output.created_at}\n\n${saved.output.output}` : 'No persisted output for this execution.'; } catch (error) { output.textContent = error.message; }
        }));
      }
    }
  } catch (error) { badge.textContent = 'UNAVAILABLE'; output.textContent = error.message; }
}
tabs.forEach(t => t.addEventListener('click', () => showArtifact(t.dataset.artifact)));
form.addEventListener('submit', async event => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) return;

  showArtifact('session');

  const card = element('article', '', 'event mike');
  card.append(element('small', 'MIKE'), element('p', value));
  stream.append(card);

  input.value = '';
  input.style.height = 'auto';
  input.disabled = true;

  const response = element('article', '', 'event orchestrator');
  response.append(element('small', 'ORCHESTRATOR'), element('p', 'Planning locally…'));
  stream.append(response);
  stream.scrollTop = stream.scrollHeight;

  try {
    const plan = await api('plan', { intent: value });

    if (!plan.recognized) {
      response.replaceChildren(
        element('small', 'ORCHESTRATOR · GATED'),
        element('p', plan.message)
      );
    } else {
      const heading = element('p', `${plan.workflow_id} · ${plan.title}`);
      const meta = element('p', `${plan.status} · ${plan.risk} · ${plan.scope}`, 'artifact-meta');
      const steps = element('ol');

      for (const step of plan.steps) {
        steps.append(element('li', `${step.capability} — ${step.action}`));
      }

      const notice = element('p', plan.message, 'artifact-meta');

      response.replaceChildren(
        element('small', 'ORCHESTRATOR · LOCAL DETERMINISTIC'),
        heading,
        meta,
        steps,
        notice
      );

      if (
        plan.status === 'PROPOSED' &&
        plan.requires_approval === true &&
        plan.workflow_id === 'ND-025'
      ) {
        const actions = element('div', '', 'service-controls');
        const approve = button('Approve ND-025', async () => {
          approve.disabled = true;
          approve.textContent = 'Executing ND-025…';
          notice.textContent = 'Approved. Running fixed local workflow…';

          try {
            const result = await api('workflow/execute', {
              workflow_id: 'ND-025',
              approved: true
            });

            const execution = element('div', '', 'route');
            execution.append(
              element('b', result.status),
              element('span', result.evidence_path),
              element('em', result.provider_calls === 0 ? 'FREE' : 'COST')
            );

            const completed = element(
              'p',
              `${result.workflow_id} ${result.status} · ${result.steps.map(step => `${step.capability}:${step.status}`).join(' · ')}`,
              'artifact-meta'
            );

            actions.replaceChildren(execution, completed);
            meta.textContent = `${result.status} · ${result.branch} · ${result.scope}`;
            notice.textContent = `Evidence recorded at ${result.evidence_path}.`;
          } catch (error) {
            approve.disabled = false;
            approve.textContent = 'Approve ND-025';
            notice.textContent = `BLOCKED · ${error.message}`;
          } finally {
            stream.scrollTop = stream.scrollHeight;
          }
        });

        actions.append(approve);
        response.append(actions);
      }
    }
  } catch (error) {
    response.replaceChildren(
      element('small', 'ORCHESTRATOR · BLOCKED'),
      element('p', error.message)
    );
  } finally {
    input.disabled = false;
    input.focus();
    stream.scrollTop = stream.scrollHeight;
  }
});
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; });

async function refreshRuntimePulse() {
  const cost = document.querySelector('#runtime-cost'), pulse = document.querySelector('#runtime-pulse');
  if (!cost || !pulse) return;
  try {
    const state = await api('state');
    const execution = state.telemetry?.execution, obs = state.telemetry?.observability;
    if (!execution || !obs) throw new Error('Runtime telemetry unavailable');
    cost.textContent = '$' + (execution.cost_microunits / 1000000).toFixed(2);
    pulse.textContent = `${execution.executions} runs · ${obs.execution_failures} terminal failures · ${obs.ci_passed} CI pass · ${obs.ci_failed} CI fail · ${obs.approvals} approvals · ${obs.artifacts} artifacts · ${obs.evidence_records} evidence`;
  } catch { pulse.textContent = 'Runtime pulse unavailable'; }
}
refreshRuntimePulse();

const recoveryExport = document.querySelector('#recovery-export'), recoveryStatus = document.querySelector('#recovery-status');
if (recoveryExport && recoveryStatus) recoveryExport.addEventListener('click', async () => {
  recoveryExport.disabled = true; recoveryStatus.textContent = 'Creating and verifying temporary recovery bundle…';
  try {
    const result = await api('recovery/export', { approved: true });
    recoveryStatus.textContent = `${result.status} · v${result.version} ${result.algorithm} · ${result.repository.branch} @ ${result.repository.commit.slice(0, 8)} · ${result.state.sessions} sessions · ${result.state.executions} executions`;
  } catch (error) { recoveryStatus.textContent = `BLOCKED · ${error.message}`; }
  finally { recoveryExport.disabled = false; refreshRuntimePulse(); }
});

const recoveryRoundtrip = document.querySelector('#recovery-roundtrip');
if (recoveryRoundtrip && recoveryStatus) recoveryRoundtrip.addEventListener('click', async () => {
  recoveryRoundtrip.disabled = true; recoveryStatus.textContent = 'Exporting and restoring into isolated temporary runtime…';
  try {
    const result = await api('recovery/roundtrip', { approved: true });
    recoveryStatus.textContent = `${result.status} · ${result.repository.branch} @ ${result.repository.commit.slice(0, 8)} · ${result.state.sessions} sessions · ${result.state.executions} executions`;
  } catch (error) { recoveryStatus.textContent = `BLOCKED · ${error.message}`; }
  finally { recoveryRoundtrip.disabled = false; refreshRuntimePulse(); }
});

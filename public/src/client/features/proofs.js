import { state } from '../core.js';

const MAX_BYTES = 4 * 1024 * 1024;

export async function submitProof(form, { reload, notify }) {
  const file = form.elements.proof.files[0];
  if (!file) throw new Error('Choose a proof file first.');
  if (file.size > MAX_BYTES) throw new Error('Proof files can be at most 4 MB.');
  const note = encodeURIComponent(form.elements.note.value);
  const response = await fetch(`/api/challenges/${encodeURIComponent(form.dataset.challenge)}/steps/${form.dataset.step}/submit?note=${note}`, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': file.type }, body: file
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The upload failed.');
  state.uploadStep = null;
  await reload();
  notify('Proof submitted for review.');
}

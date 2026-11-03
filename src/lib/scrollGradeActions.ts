/** After Check, bring grade buttons above the fixed mobile bottom nav. */
export function scrollGradeActionsIntoView(): void {
  const el = document.querySelector('.grade-actions');
  if (!(el instanceof HTMLElement)) return;
  el.scrollIntoView({ block: 'end', behavior: 'smooth', inline: 'nearest' });
}

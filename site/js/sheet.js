// The company and term card: a full-screen <dialog> (the dimmed area is the dialog itself, not
// ::backdrop, whose taps iOS Safari can lose) with the card in a .sheet inside it.
// A tap closes the card when it both starts and ends outside the card, or lands on the cross.
export function closesSheet(downTarget, upTarget) {
  if (!upTarget) return false;
  if (upTarget.closest('.sheet-close')) return true;
  if (!downTarget) return false;
  return !downTarget.closest('.sheet') && !upTarget.closest('.sheet');
}

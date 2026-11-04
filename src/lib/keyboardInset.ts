/** Keep a fixed bar above the on-screen keyboard when the browser overlays it. */
export function bindKeyboardInset(): () => void {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  const sync = () => {
    const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
  };
  sync();
  vv.addEventListener('resize', sync);
  vv.addEventListener('scroll', sync);
  return () => {
    vv.removeEventListener('resize', sync);
    vv.removeEventListener('scroll', sync);
    document.documentElement.style.removeProperty('--keyboard-inset');
  };
}

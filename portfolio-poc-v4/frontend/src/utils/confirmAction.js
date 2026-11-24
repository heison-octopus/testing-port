export function confirmAction(message) {
  return typeof window === 'undefined' || window.confirm(message);
}

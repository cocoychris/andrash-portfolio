export default function preventLongPressMenu() {
  window.oncontextmenu = (event: Event) => {
    event.preventDefault && event.preventDefault();
    event.stopPropagation && event.stopPropagation();
    return false;
  };
}

import "./scss/main.scss";

const toggle = document.querySelector<HTMLButtonElement>(".menu-toggle");
const navigation = document.querySelector<HTMLElement>("#main-navigation");

if (toggle && navigation) {
  const setMenuOpen = (open: boolean) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
    navigation.classList.toggle("is-open", open);
  };

  toggle.addEventListener("click", () => {
    setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
  });
  navigation.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) setMenuOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      toggle.focus();
    }
  });
}
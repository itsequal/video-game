import { reducedMotion } from "./motion.js";

export function createModals(root) {
  let openNow = false;

  function close() {
    root.replaceChildren();
    openNow = false;
  }

  function open({ kicker, title, paragraphs = [], lore, actions }) {
    close();
    openNow = true;
    const back = document.createElement("div");
    back.className = "modal-back is-starting";
    const card = document.createElement("div");
    card.className = "modal-card is-starting";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "modal-title");

    if (kicker) {
      const kick = document.createElement("p");
      kick.className = "kicker";
      kick.textContent = kicker;
      card.appendChild(kick);
    }
    const heading = document.createElement("h3");
    heading.id = "modal-title";
    heading.textContent = title;
    card.appendChild(heading);
    for (const paragraph of paragraphs) {
      const p = document.createElement("p");
      p.textContent = paragraph;
      card.appendChild(p);
    }
    if (lore) {
      const where = document.createElement("p");
      where.className = "lore-where";
      where.textContent = lore.where;
      const text = document.createElement("p");
      text.textContent = lore.text;
      card.append(where, text);
    }
    const row = document.createElement("div");
    row.className = "modal-actions";
    card.appendChild(row);
    back.appendChild(card);
    root.appendChild(back);
    back.getBoundingClientRect();
    back.classList.remove("is-starting");
    card.classList.remove("is-starting");

    return new Promise((resolve) => {
      const buttons = actions.map((action) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = action.primary ? "btn btn-primary" : "btn btn-ghost";
        button.textContent = action.label;
        button.addEventListener("click", () => {
          const finish = () => {
            close();
            resolve(action.id);
          };
          if (reducedMotion()) {
            finish();
            return;
          }
          card.classList.add("is-leaving");
          back.classList.add("is-leaving");
          window.setTimeout(finish, 150);
        });
        row.appendChild(button);
        return button;
      });
      buttons[0]?.focus();
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Tab") return;
        const list = [...row.querySelectorAll("button")];
        const first = list[0];
        const last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
    });
  }

  return { open, close, isOpen: () => openNow };
}

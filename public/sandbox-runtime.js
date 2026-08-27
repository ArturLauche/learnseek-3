(() => {
  const ALLOWED = ["completion", "answer", "score", "height", "restart"];

  function parentOrigin() {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("parent") ?? "";
      const origin = new URL(raw).origin;
      if (origin === "null" || origin === "file://") return "";
      if (origin.startsWith("http://") || origin.startsWith("https://")) return origin;
      return "";
    } catch {
      return "";
    }
  }

  const target = parentOrigin();

  function send(type, payload) {
    if (!ALLOWED.includes(type) || !target) return;
    parent.postMessage({ type, ...payload }, target);
  }

  function reportHeight() {
    send("height", { height: Math.max(document.body.scrollHeight, 320) });
  }

  function activate(targetEl) {
    if (!(targetEl instanceof HTMLElement)) return;
    if (targetEl.matches("[data-choice]")) {
      const correct = targetEl.getAttribute("data-correct") === "1";
      const feedback = document.querySelector("[data-feedback]");
      if (feedback instanceof HTMLElement) {
        feedback.hidden = false;
        feedback.textContent = correct
          ? "That matches the intended answer."
          : "Not the intended answer — try another choice.";
      }
      send("answer", { index: Number(targetEl.getAttribute("data-choice")), correct });
      send("score", { score: correct ? 1 : 0 });
      if (correct) send("completion", { completed: true });
    }
    if (targetEl.matches("[data-flip]")) {
      const back = document.querySelector("[data-back]");
      if (back instanceof HTMLElement) back.hidden = !back.hidden;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce && back instanceof HTMLElement) back.setAttribute("tabindex", "-1");
      if (back instanceof HTMLElement) back.focus({ preventScroll: reduce });
    }
    if (targetEl.matches("[data-complete]")) {
      send("completion", { completed: true });
    }
    if (targetEl.matches("[data-restart]")) {
      send("restart", {});
    }
  }

  document.addEventListener("click", (event) => {
    const node = event.target;
    if (node instanceof HTMLElement) activate(node);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const node = event.target;
    if (!(node instanceof HTMLElement)) return;
    if (node.matches("[data-choice], [data-flip], [data-complete], [data-restart], button")) {
      event.preventDefault();
      activate(node);
    }
  });

  window.addEventListener("load", reportHeight);
  if ("ResizeObserver" in window) {
    new ResizeObserver(reportHeight).observe(document.documentElement);
  }
})();

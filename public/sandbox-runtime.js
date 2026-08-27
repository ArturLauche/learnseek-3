(() => {
  function send(type, payload) {
    if (!["completion", "answer", "score", "height", "restart"].includes(type)) return;
    parent.postMessage({ type, ...payload }, "*");
  }

  function reportHeight() {
    send("height", { height: Math.max(document.body.scrollHeight, 320) });
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches("[data-choice]")) {
      const correct = target.getAttribute("data-correct") === "1";
      const feedback = document.querySelector("[data-feedback]");
      if (feedback instanceof HTMLElement) {
        feedback.hidden = false;
        feedback.textContent = correct ? "That matches the intended answer." : "Not the intended answer — try another choice.";
      }
      send("answer", { index: Number(target.getAttribute("data-choice")), correct });
      send("score", { score: correct ? 1 : 0 });
      if (correct) send("completion", { completed: true });
    }
    if (target.matches("[data-flip]")) {
      const back = document.querySelector("[data-back]");
      if (back instanceof HTMLElement) back.hidden = !back.hidden;
    }
    if (target.matches("[data-complete]")) {
      send("completion", { completed: true });
    }
    if (target.matches("[data-restart]")) {
      send("restart", {});
    }
  });

  window.addEventListener("load", reportHeight);
  new ResizeObserver(reportHeight).observe(document.documentElement);
})();

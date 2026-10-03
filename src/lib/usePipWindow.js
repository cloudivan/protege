// Document Picture-in-Picture: a small always-on-top window that stays visible
// over other tabs and apps (Chrome and Edge). React content is portaled into
// it, so it shares state with the page that opened it.
//
// open() needs a user gesture: call it synchronously inside a click handler.
import { useCallback, useEffect, useState } from "react";

// The PiP document starts empty: copy the page's styles, theme and font
// classes so Tailwind classes render the same inside it.
function copyStyles(win) {
  const doc = win.document;
  const base = doc.createElement("base");
  base.href = window.location.origin;
  doc.head.appendChild(base);
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    const clone = node.cloneNode(true);
    if (clone.tagName === "LINK") clone.href = node.href; // absolute URL
    doc.head.appendChild(clone);
  });
  doc.documentElement.className = document.documentElement.className;
  doc.documentElement.style.colorScheme = document.documentElement.style.colorScheme;
  doc.title = "Protégé";
}

export function usePipWindow() {
  const [pipWindow, setPipWindow] = useState(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => setSupported(typeof window !== "undefined" && "documentPictureInPicture" in window), []);

  const open = useCallback(({ width = 340, height = 320 } = {}) => {
    const dpip = typeof window !== "undefined" ? window.documentPictureInPicture : null;
    if (!dpip) return Promise.resolve(null);
    if (dpip.window) {
      setPipWindow(dpip.window);
      return Promise.resolve(dpip.window);
    }
    return dpip
      // No "back to tab" button: the window holds its own controls.
      .requestWindow({ width, height, disallowReturnToOpener: true })
      .then((win) => {
        copyStyles(win);
        win.addEventListener("pagehide", () => setPipWindow(null));
        setPipWindow(win);
        return win;
      })
      .catch(() => null); // no user gesture left, or the user dismissed it
  }, []);

  const close = useCallback(() => {
    window.documentPictureInPicture?.window?.close();
    setPipWindow(null);
  }, []);

  return { pipWindow, supported, open, close };
}

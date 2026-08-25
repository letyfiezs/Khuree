"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp() {
  const [ready, setReady] = useState(false);
  const [ios, setIos] = useState(false);
  const [help, setHelp] = useState(false);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) return;

    const isiPhone = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isiPhone);
    setReady(isiPhone);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setReady(true);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    return () => window.removeEventListener("beforeinstallprompt", capturePrompt);
  }, []);

  const install = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setReady(false);
      setPromptEvent(null);
      return;
    }
    setHelp(true);
  };

  if (!ready) return null;
  return (
    <>
      <button className="install-app-button" onClick={() => void install()} aria-label="Хүрээ app суулгах">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14"/></svg>
        App суулгах
      </button>
      {help && ios && (
        <div className="install-help-backdrop" role="presentation" onClick={() => setHelp(false)}>
          <section className="install-help" role="dialog" aria-modal="true" aria-label="App суулгах заавар" onClick={(event) => event.stopPropagation()}>
            <button className="install-help-close" onClick={() => setHelp(false)} aria-label="Хаах">×</button>
            <div className="install-logo">Х</div>
            <h2>Хүрээ app суулгах</h2>
            <p>Доорх 2 үйлдлийг хийхэд л болно.</p>
            <ol>
              <li><b>1</b><span>Safari-ийн доод талын <strong>Share</strong> <i className="share-icon">↑</i> товчийг дар.</span></li>
              <li><b>2</b><span><strong>Add to Home Screen</strong> → <strong>Add</strong> дар.</span></li>
            </ol>
            <small>Дараа нь Home Screen дээрх Хүрээ icon-оор нээнэ.</small>
          </section>
        </div>
      )}
    </>
  );
}

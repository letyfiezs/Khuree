"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window { __khureeInstallPrompt?: InstallPromptEvent | null }
}

export function InstallApp() {
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [help, setHelp] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) return;

    const isiPhone = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);
    setPlatform(isiPhone ? "ios" : isAndroid ? "android" : "other");
    setReady(isiPhone || isAndroid);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setReady(true);
    };
    const useSavedPrompt = () => {
      if (window.__khureeInstallPrompt) {
        setPromptEvent(window.__khureeInstallPrompt);
        setReady(true);
      }
    };
    useSavedPrompt();
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("khureeinstallready", useSavedPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("khureeinstallready", useSavedPrompt);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const collapse = () => setExpanded(false);
    const timer = window.setTimeout(collapse, 4500);
    window.addEventListener("scroll", collapse, { passive: true });
    window.addEventListener("touchmove", collapse, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", collapse);
      window.removeEventListener("touchmove", collapse);
    };
  }, [expanded]);

  const install = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setReady(false);
      window.__khureeInstallPrompt = null;
      setPromptEvent(null);
      return;
    }
    setHelp(true);
  };

  if (!ready) return null;
  return (
    <>
      <button className={`install-app-button ${expanded ? "expanded" : "collapsed"}`} onClick={() => expanded ? void install() : setExpanded(true)} aria-label={expanded ? "Хүрээ app суулгах" : "App суулгах товч нээх"}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14"/></svg>
        <span>App суулгах</span>
      </button>
      {help && (
        <div className="install-help-backdrop" role="presentation" onClick={() => setHelp(false)}>
          <section className="install-help" role="dialog" aria-modal="true" aria-label="App суулгах заавар" onClick={(event) => event.stopPropagation()}>
            <button className="install-help-close" onClick={() => setHelp(false)} aria-label="Хаах">×</button>
            <div className="install-logo">Х</div>
            <h2>Хүрээ app суулгах</h2>
            <p>{platform === "android" ? "Browser-ийн цэснээс доорх байдлаар суулгана." : "Доорх 2 үйлдлийг хийхэд л болно."}</p>
            {platform === "android" ? (
              <ol>
                <li><b>1</b><span>Баруун дээд талын <strong>⋮ цэс</strong> товчийг дар.</span></li>
                <li><b>2</b><span>Chrome дээр <strong>Install app</strong> эсвэл <strong>Add to Home screen</strong> сонго.</span></li>
                <li><b>3</b><span>Samsung Internet дээр <strong>Add page to</strong> → <strong>Home screen</strong> сонго.</span></li>
              </ol>
            ) : (
              <ol>
                <li><b>1</b><span>Safari-ийн доод талын <strong>Share</strong> <i className="share-icon">↑</i> товчийг дар.</span></li>
                <li><b>2</b><span><strong>Add to Home Screen</strong> → <strong>Add</strong> дар.</span></li>
              </ol>
            )}
            <small>Дараа нь Home Screen дээрх Хүрээ icon-оор нээнэ.</small>
          </section>
        </div>
      )}
    </>
  );
}

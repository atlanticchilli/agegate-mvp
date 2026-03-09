import type { WidgetPosition, WidgetTheme } from "./types";

function containerAlignment(position: WidgetPosition): string {
  switch (position) {
    case "top-left":
      return "align-items: flex-start; justify-content: flex-start;";
    case "top-right":
      return "align-items: flex-start; justify-content: flex-end;";
    case "bottom-left":
      return "align-items: flex-end; justify-content: flex-start;";
    case "bottom-right":
      return "align-items: flex-end; justify-content: flex-end;";
    case "center":
    default:
      return "align-items: center; justify-content: center;";
  }
}

export function getWidgetStyles(theme: WidgetTheme, accentColor: string, position: WidgetPosition): string {
  const isDark = theme === "dark";
  const panelBackground = isDark ? "#111827" : "#ffffff";
  const panelText = isDark ? "#f9fafb" : "#111827";
  const mutedText = isDark ? "#9ca3af" : "#4b5563";
  const borderColor = isDark ? "#374151" : "#e5e7eb";

  return `
    :host {
      all: initial;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      padding: 16px;
      background: rgba(0, 0, 0, 0.55);
      ${containerAlignment(position)}
    }

    .panel {
      width: min(100%, 420px);
      border: 1px solid ${borderColor};
      border-radius: 12px;
      background: ${panelBackground};
      color: ${panelText};
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
      padding: 20px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .logo {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid ${borderColor};
    }

    .title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: ${panelText};
    }

    .subtitle {
      margin: 0 0 14px;
      color: ${mutedText};
      font-size: 13px;
      line-height: 1.5;
    }

    .method-list {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .method-button {
      width: 100%;
      border: 1px solid ${borderColor};
      border-radius: 10px;
      background: transparent;
      color: ${panelText};
      font-size: 14px;
      font-weight: 600;
      text-align: left;
      padding: 11px 12px;
      cursor: pointer;
      transition: border-color 120ms ease, background-color 120ms ease;
    }

    .method-button:hover {
      border-color: ${accentColor};
      background: rgba(0, 0, 0, 0.03);
    }

    .method-button:focus-visible {
      outline: 2px solid ${accentColor};
      outline-offset: 2px;
    }

    .provider {
      color: ${mutedText};
      font-size: 12px;
      font-weight: 500;
      margin-top: 3px;
      display: block;
    }

    .empty-state {
      margin: 6px 0 0;
      color: ${mutedText};
      font-size: 13px;
    }

    /* Selfie capture */
    .agegate-selfie-capture {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .agegate-selfie-video-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 4/3;
      max-height: 280px;
      background: ${isDark ? "#1f2937" : "#f3f4f6"};
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid ${borderColor};
    }

    .agegate-selfie-video-wrap video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .agegate-selfie-video-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${mutedText};
      font-size: 14px;
    }

    .agegate-selfie-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .agegate-selfie-capture-btn,
    .agegate-selfie-cancel-btn {
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid ${borderColor};
    }

    .agegate-selfie-capture-btn {
      background: ${accentColor};
      color: white;
      border-color: ${accentColor};
    }

    .agegate-selfie-capture-btn:hover:not(:disabled) {
      opacity: 0.9;
    }

    .agegate-selfie-capture-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .agegate-selfie-cancel-btn {
      background: transparent;
      color: ${panelText};
    }

    .agegate-selfie-cancel-btn:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .agegate-selfie-retry-btn {
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      background: ${accentColor};
      color: white;
      border: 1px solid ${accentColor};
    }

    .agegate-selfie-retry-btn:hover {
      opacity: 0.9;
    }

    .agegate-selfie-error {
      margin: 0 0 12px;
      padding: 10px 12px;
      background: ${isDark ? "#7f1d1d" : "#fef2f2"};
      color: ${isDark ? "#fca5a5" : "#b91c1c"};
      border-radius: 8px;
      font-size: 13px;
    }
  `;
}

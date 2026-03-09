import { showSelfieCapture } from "./selfie-capture";
import { getWidgetStyles } from "./styles";
import type { AvailableMethod, WidgetPosition, WidgetTheme } from "./types";

interface ModalOptions {
  theme: WidgetTheme;
  accentColor: string;
  position: WidgetPosition;
  logoUrl?: string;
  jurisdiction: string;
  methods: AvailableMethod[];
  onMethodClick: (method: AvailableMethod) => void;
}

export class AgeGateModal {
  private readonly _host: HTMLDivElement;
  private readonly _shadowRoot: ShadowRoot;
  private readonly _options: ModalOptions;
  private _mounted = false;
  private _selfieCleanup: (() => void) | null = null;

  public constructor(options: ModalOptions) {
    this._options = options;
    this._host = document.createElement("div");
    this._host.setAttribute("data-agegate-widget-modal", "true");
    this._shadowRoot = this._host.attachShadow({ mode: "open" });
  }

  public mount(): void {
    if (this._mounted) {
      return;
    }

    this._shadowRoot.innerHTML = this.getMarkup();
    this.bindMethodClicks();
    document.body.appendChild(this._host);
    this._mounted = true;
  }

  public dismiss(): void {
    if (!this._mounted) {
      return;
    }
    this._selfieCleanup?.();
    this._selfieCleanup = null;
    this._host.remove();
    this._mounted = false;
  }

  /**
   * Swaps the panel content to show selfie capture UI.
   * On capture, calls onCapture with base64 image. On cancel, calls onCancel and restores methods view.
   */
  public showSelfieCapture(
    onCapture: (imageBase64: string) => void,
    onCancel: () => void
  ): void {
    this._selfieCleanup?.();
    this._selfieCleanup = null;

    const panel = this._shadowRoot.querySelector<HTMLElement>(".panel");
    if (!panel) return;

    const logoMarkup = this._options.logoUrl
      ? `<img class="logo" src="${escapeHtml(this._options.logoUrl)}" alt="Site logo" />`
      : "";

    panel.innerHTML = `
      <div class="header">
        ${logoMarkup}
        <h2 class="title">Verify with selfie</h2>
      </div>
      <p class="subtitle">
        Take a photo of your face to verify your age.
      </p>
      <div class="agegate-selfie-container"></div>
    `;

    const container = panel.querySelector<HTMLElement>(".agegate-selfie-container");
    if (!container) return;

    this._selfieCleanup = showSelfieCapture({
      container,
      onCapture: (result) => {
        this._selfieCleanup?.();
        this._selfieCleanup = null;
        onCapture(result.imageBase64);
      },
      onCancel: () => {
        this._selfieCleanup?.();
        this._selfieCleanup = null;
        this.showMethodsView();
        onCancel();
      },
      onError: () => {
        // Error is surfaced via onCancel; optional onError could show inline message
      }
    });
  }

  /**
   * Shows an error message in the selfie view with a Try again button.
   * onRetry is called when the user clicks Try again, typically to re-show the capture UI.
   */
  public showSelfieError(message: string, onRetry: () => void): void {
    const panel = this._shadowRoot.querySelector<HTMLElement>(".panel");
    if (!panel) return;

    const container = panel.querySelector<HTMLElement>(".agegate-selfie-container");
    if (!container) return;

    container.innerHTML = `
      <div class="agegate-selfie-error">${escapeHtml(message)}</div>
      <div class="agegate-selfie-actions">
        <button type="button" class="agegate-selfie-retry-btn">Try again</button>
        <button type="button" class="agegate-selfie-cancel-btn">Cancel</button>
      </div>
    `;

    const retryBtn = container.querySelector<HTMLButtonElement>(".agegate-selfie-retry-btn");
    const cancelBtn = container.querySelector<HTMLButtonElement>(".agegate-selfie-cancel-btn");

    retryBtn?.addEventListener("click", () => {
      onRetry();
    });
    cancelBtn?.addEventListener("click", () => {
      this.showMethodsView();
    });
  }

  /**
   * Restores the methods selection view.
   */
  public showMethodsView(): void {
    this._selfieCleanup?.();
    this._selfieCleanup = null;

    const panel = this._shadowRoot.querySelector<HTMLElement>(".panel");
    if (!panel) return;

    panel.innerHTML = this.getPanelContent();
    this.bindMethodClicks();
  }

  private getMarkup(): string {
    return `
      <style>${getWidgetStyles(this._options.theme, this._options.accentColor, this._options.position)}</style>
      <div class="overlay" role="dialog" aria-modal="true" aria-label="Age verification required">
        <div class="panel">
          ${this.getPanelContent()}
        </div>
      </div>
    `;
  }

  private getPanelContent(): string {
    const methodsMarkup = this._options.methods
      .map((method, index) => {
        const safeLabel = escapeHtml(method.displayName || method.method);
        const safeProvider = escapeHtml(method.provider);
        return `
          <li>
            <button class="method-button" data-method-index="${index}" type="button">
              ${safeLabel}
              <span class="provider">${safeProvider}</span>
            </button>
          </li>
        `;
      })
      .join("");

    const logoMarkup = this._options.logoUrl
      ? `<img class="logo" src="${escapeHtml(this._options.logoUrl)}" alt="Site logo" />`
      : "";

    return `
      <div class="header">
        ${logoMarkup}
        <h2 class="title">Age verification required</h2>
      </div>
      <p class="subtitle">
        Your region is ${escapeHtml(this._options.jurisdiction)}. Select a verification method to continue.
      </p>
      ${
        this._options.methods.length > 0
          ? `<ul class="method-list">${methodsMarkup}</ul>`
          : `<p class="empty-state">No verification methods are available right now.</p>`
      }
    `;
  }

  private bindMethodClicks(): void {
    const buttons = this._shadowRoot.querySelectorAll<HTMLButtonElement>("[data-method-index]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.methodIndex);
        const selectedMethod = this._options.methods[index];
        if (!selectedMethod) {
          return;
        }
        this._options.onMethodClick(selectedMethod);
      });
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

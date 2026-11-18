/* =====================================================================
   DOM "frouxo" para a migração gradual: o jogo usa querySelector/closest
   e manipula style/onclick direto. Quando um arquivo vira .ts com tipos
   próprios, ele passa a usar os tipos exatos (HTMLElement, HTMLCanvasElement…).
   ===================================================================== */
interface Element { style: CSSStyleDeclaration; onclick: ((ev: MouseEvent) => any) | null; dataset: DOMStringMap; offsetWidth: number; offsetHeight: number; disabled?: boolean; value?: string; checked?: boolean; focus(): void }
interface HTMLElement { getContext?: any; width?: number; height?: number }
interface EventTarget { closest?(selector: string): HTMLElement | null; dataset?: DOMStringMap; value?: string }
interface ChildNode { classList: DOMTokenList; offsetWidth: number }
interface Navigator { standalone?: boolean }
interface ScreenOrientation { lock?(o: string): Promise<void> }
interface Element { oninput: ((ev: Event) => any) | null; onkeydown: ((ev: KeyboardEvent) => any) | null; onchange: ((ev: Event) => any) | null; click(): void; src?: string; _k?: any }
interface EventTarget { checked?: boolean }
interface Event { changedTouches?: TouchList }
interface Performance { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }

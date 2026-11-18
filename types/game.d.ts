/* =====================================================================
   Tipos do jogo — mixins: vários arquivos adicionam métodos às classes com
   Object.assign(Classe.prototype, {...}); aqui declaramos que essas classes
   aceitam esses membros extras (mesclados com a declaração em JS).
   ===================================================================== */
interface Sim { [member: string]: any }
interface Renderer { [member: string]: any }
interface Sfx { [member: string]: any }
interface BotBrain { [member: string]: any }
interface MapKit { [member: string]: any }
interface World { [member: string]: any }
interface HUD { [member: string]: any }
interface FX { [member: string]: any }
interface ViewModel { [member: string]: any }
interface Predictor { [member: string]: any }
interface NetHost { [member: string]: any }
interface NetClient { [member: string]: any }
interface Document { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> }
interface HTMLElement { webkitRequestFullscreen?: (o?: any) => Promise<void> }

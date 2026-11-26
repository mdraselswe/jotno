import { InlineScript } from "@/components/ui/inline-script";

/**
 * React starts the browser's View Transitions itself (<ViewTransition>). The
 * browser aborts one when it can't run it, most often on phones when the
 * viewport changes mid-transition, and rejects `ready` with "Transition was
 * aborted because of invalid state. Viewport size changed". React ignores a
 * few known abort messages but not this wording, so it reported the abort as
 * an uncaught error (and `finished.finally()` left an unhandled rejection).
 * The page swap still happens; only the animation is skipped.
 *
 * This wraps `document.startViewTransition` once, before hydration: an
 * aborted or skipped transition (AbortError, InvalidStateError) reaches React
 * as the abort message it already ignores, and `finished` no longer rejects
 * for it. Any other error passes through unchanged.
 */
const code = `(function(){var d=document,s=d.startViewTransition;if(typeof s!=="function"||s.__guarded)return;var M="Transition was aborted because of invalid state";function ab(e){return!!e&&(e.name==="AbortError"||e.name==="InvalidStateError")}function g(){var v=s.apply(d,arguments);try{var r=v.ready,f=v.finished;Object.defineProperty(v,"ready",{configurable:true,value:r.catch(function(e){throw ab(e)?new DOMException(M,"InvalidStateError"):e})});Object.defineProperty(v,"finished",{configurable:true,value:f.catch(function(e){if(!ab(e))throw e})})}catch(e){}return v}g.__guarded=true;d.startViewTransition=g})()`;

export function ViewTransitionGuard() {
  return <InlineScript html={code} />;
}

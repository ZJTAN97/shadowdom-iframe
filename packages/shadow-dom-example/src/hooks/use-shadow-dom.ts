import { type RefObject, useEffect, useRef } from "react";

interface UseShadowDomOptions {
	html: string;
	css: string;
	js?: string;
}

interface UseShadowDomResult {
	hostRef: RefObject<HTMLDivElement | null>;
	shadowRef: RefObject<ShadowRoot | null>;
}

export function useShadowDom({
	html,
	css,
	js,
}: UseShadowDomOptions): UseShadowDomResult {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const shadowRef = useRef<ShadowRoot | null>(null);

	// TODO: Research if its better to use useLayoutEffect or useSyncExternalStore instead
	useEffect(() => {
		const host = hostRef.current;
		if (!host || shadowRef.current) return;

		const shadow = host.attachShadow({ mode: "open" });
		shadowRef.current = shadow;

		// Inject styles
		const style = document.createElement("style");
		style.textContent = css;
		shadow.appendChild(style);

		// Inject HTML
		const container = document.createElement("div");
		container.innerHTML = html;
		shadow.appendChild(container);

		// Execute external JS with a document proxy that scopes DOM queries to the shadow root
		// this is the "contract" we will need to discuss cross teams, basically what APIs are we gona define instead of us trying to catch all
		if (js) {
			const scriptFn = new Function("shadowRoot", "document", "window", js);

			const docProxy = new Proxy(document, {
				// The 'get' trap intercepts property access
				get(target, prop) {
					if (prop === "querySelector")
						return shadow.querySelector.bind(shadow);
					if (prop === "querySelectorAll")
						return shadow.querySelectorAll.bind(shadow);
					if (prop === "body") return shadow;
					const val = Reflect.get(target, prop);
					return typeof val === "function" ? val.bind(target) : val;
				},
			});

			// this "activates" the JS
			scriptFn(shadow, docProxy, window);
		}
	}, [html, css, js]);

	return { hostRef, shadowRef };
}

// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

import {
	defaultKeymap,
	history,
	historyKeymap,
	indentWithTab,
} from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching, foldGutter } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import {
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from "@codemirror/view";
import { useEffect, useRef } from "react";

interface CodeEditorProps {
	value: string;
	onChange: (val: string) => void;
	readOnly?: boolean;
	className?: string;
}

const studioTheme = EditorView.theme({
	"&": {
		height: "100%",
		fontSize: "12.5px",
		fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
		backgroundColor: "transparent",
	},
	".cm-scroller": {
		overflow: "auto",
		fontFamily: "inherit",
	},
	".cm-gutters": {
		backgroundColor: "transparent",
		color: "rgba(255, 255, 255, 0.25)",
		borderRight: "1px solid rgba(255, 255, 255, 0.08)",
	},
	".cm-activeLine": {
		backgroundColor: "rgba(255, 255, 255, 0.03)",
	},
	".cm-activeLineGutter": {
		backgroundColor: "transparent",
		color: "#38bdf8",
	},
	"&.cm-focused .cm-cursor": {
		borderLeftColor: "#38bdf8",
	},
	"&.cm-focused .cm-selectionBackground, ::selection": {
		backgroundColor: "rgba(56, 189, 248, 0.25) !important",
	},
});

export function CodeEditor({
	value,
	onChange,
	readOnly = false,
	className = "",
}: CodeEditorProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	// biome-ignore lint/correctness/useExhaustiveDependencies: initial document setup only
	useEffect(() => {
		if (!containerRef.current) return;

		const state = EditorState.create({
			doc: value,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				history(),
				foldGutter(),
				bracketMatching(),
				javascript({ typescript: true }),
				oneDark,
				studioTheme,
				keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
				EditorState.readOnly.of(readOnly),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						onChangeRef.current(update.state.doc.toString());
					}
				}),
			],
		});

		const view = new EditorView({
			state,
			parent: containerRef.current,
		});

		viewRef.current = view;

		return () => {
			view.destroy();
			viewRef.current = null;
		};
	}, [readOnly]);

	// Sync external value changes (e.g. template switch)
	useEffect(() => {
		const view = viewRef.current;
		if (!view) return;
		const currentVal = view.state.doc.toString();
		if (value !== currentVal) {
			view.dispatch({
				changes: { from: 0, to: currentVal.length, insert: value },
			});
		}
	}, [value]);

	return (
		<div
			ref={containerRef}
			className={`w-full h-full overflow-hidden text-sm ${className}`}
		/>
	);
}

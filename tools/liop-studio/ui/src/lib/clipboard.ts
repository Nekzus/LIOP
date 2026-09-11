// Copyright 2026 Nekzus Solutions and contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * Robust clipboard utility with fallback for non-secure contexts.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		if (navigator?.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
		// Fallback for non-secure contexts or legacy browsers
		const textArea = document.createElement("textarea");
		textArea.value = text;
		textArea.style.position = "fixed";
		textArea.style.left = "-999999px";
		textArea.style.top = "-999999px";
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();
		const success = document.execCommand("copy");
		document.body.removeChild(textArea);
		return success;
	} catch (err) {
		console.warn("Clipboard write failed:", err);
		return false;
	}
}

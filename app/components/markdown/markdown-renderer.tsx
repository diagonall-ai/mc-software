"use client";

import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import type { ComponentProps } from "react";
import { memo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "~/lib/utils";

export type MarkdownRendererProps = ComponentProps<typeof Streamdown>;

export const streamdownPlugins = { cjk, code, math, mermaid };

export const MarkdownRenderer = memo(
	({ className, ...props }: MarkdownRendererProps) => (
		<Streamdown
			className={cn(
				// Links in the text color: the yellow primary is unreadable as text.
				"size-full text-sm leading-6 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_[data-streamdown=link]]:text-foreground",
				className,
			)}
			plugins={streamdownPlugins}
			{...props}
		/>
	),
	(prevProps, nextProps) =>
		prevProps.children === nextProps.children &&
		nextProps.isAnimating === prevProps.isAnimating,
);

MarkdownRenderer.displayName = "MarkdownRenderer";

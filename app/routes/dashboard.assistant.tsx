import { useAgentChat } from "@cloudflare/think/react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useAgent } from "agents/react";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	PromptInputSubmit,
	PromptInputTextarea,
} from "~/components/ai-elements/prompt-input";
import { MarkdownRenderer } from "~/components/markdown/markdown-renderer";
import { RouteErrorComponent } from "~/components/route-error-state";
import { Bubble, BubbleContent } from "~/components/ui/bubble";
import { Marker, MarkerContent } from "~/components/ui/marker";
import { Message, MessageContent } from "~/components/ui/message";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "~/components/ui/message-scroller";
import { Skeleton } from "~/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/assistant")({
	staticData: {
		dashboardHeader: {
			description: "Posez vos questions à l’assistant de l’application.",
			title: "Assistant",
		},
	},
	errorComponent: RouteErrorComponent,
	component: AssistantRoute,
});

// The chat holds a WebSocket open, so it renders in the browser only.
function AssistantRoute() {
	return (
		<ClientOnly fallback={<Skeleton className="min-h-0 flex-1 rounded-xl" />}>
			<AssistantChat />
		</ClientOnly>
	);
}

function AssistantChat() {
	// app/server.ts sends /agents/assistant to the signed-in user's Assistant.
	const agent = useAgent({ agent: "Assistant", basePath: "agents/assistant" });
	const { error, messages, sendMessage, status, stop } = useAgentChat({
		agent,
	});

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<MessageScrollerProvider autoScroll>
				<MessageScroller className="min-h-0 flex-1">
					<MessageScrollerViewport>
						<MessageScrollerContent className="py-2">
							{messages.length === 0 ? (
								<MessageScrollerItem messageId="empty">
									<Marker variant="separator">
										<MarkerContent>
											Essayez « Que sais-tu de mon profil ? »
										</MarkerContent>
									</Marker>
								</MessageScrollerItem>
							) : null}
							{messages.map((message) => {
								const isUser = message.role === "user";
								const text = message.parts
									.map((part) => (part.type === "text" ? part.text : ""))
									.filter(Boolean)
									.join("\n\n");
								if (!text) return null; // a step with tool calls only

								return (
									<MessageScrollerItem
										key={message.id}
										messageId={message.id}
										scrollAnchor={isUser}
									>
										<Message align={isUser ? "end" : "start"}>
											<MessageContent>
												<Bubble
													align={isUser ? "end" : "start"}
													variant={isUser ? "default" : "ghost"}
												>
													<BubbleContent>
														{isUser ? (
															text
														) : (
															<MarkdownRenderer>{text}</MarkdownRenderer>
														)}
													</BubbleContent>
												</Bubble>
											</MessageContent>
										</Message>
									</MessageScrollerItem>
								);
							})}
							{status === "submitted" ? (
								<MessageScrollerItem messageId="thinking">
									<p className="shimmer text-sm">Réflexion…</p>
								</MessageScrollerItem>
							) : null}
							{error ? (
								<MessageScrollerItem messageId="error">
									<Marker>
										<MarkerContent>
											L’assistant n’a pas pu répondre. Il fonctionne une fois
											l’application en ligne.
										</MarkerContent>
									</Marker>
								</MessageScrollerItem>
							) : null}
						</MessageScrollerContent>
					</MessageScrollerViewport>
					<MessageScrollerButton />
				</MessageScroller>
			</MessageScrollerProvider>
			<PromptInput
				onSubmit={({ text }) => {
					if (text.trim()) void sendMessage({ text });
				}}
			>
				<PromptInputBody>
					<PromptInputTextarea placeholder="Écrivez votre message…" />
				</PromptInputBody>
				<PromptInputFooter className="justify-end">
					<PromptInputSubmit onStop={stop} status={status} />
				</PromptInputFooter>
			</PromptInput>
		</div>
	);
}

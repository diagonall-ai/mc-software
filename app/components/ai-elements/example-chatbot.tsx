"use client";

import type { ToolUIPart } from "ai";
import { CheckIcon, FileTextIcon, GlobeIcon, XIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useMemo, useState } from "react";
import {
	ModelSelector,
	ModelSelectorContent,
	ModelSelectorEmpty,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorLogo,
	ModelSelectorLogoGroup,
	ModelSelectorName,
	ModelSelectorTrigger,
} from "~/components/ai-elements/model-selector";
import type { PromptInputMessage } from "~/components/ai-elements/prompt-input";
import {
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputBody,
	PromptInputButton,
	PromptInputFooter,
	PromptInputHeader,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
	usePromptInputAttachments,
} from "~/components/ai-elements/prompt-input";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "~/components/ai-elements/reasoning";
import {
	Source,
	Sources,
	SourcesContent,
	SourcesTrigger,
} from "~/components/ai-elements/sources";
import { SpeechInput } from "~/components/ai-elements/speech-input";
import { Suggestion, Suggestions } from "~/components/ai-elements/suggestion";
import { MarkdownRenderer } from "~/components/markdown/markdown-renderer";
import {
	Attachment,
	AttachmentAction,
	AttachmentActions,
	AttachmentContent,
	AttachmentGroup,
	AttachmentMedia,
	AttachmentTitle,
} from "~/components/ui/attachment";
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
import { toast } from "~/components/ui/toast";

interface MessageType {
	key: string;
	from: "user" | "assistant";
	sources?: { href: string; title: string }[];
	versions: {
		id: string;
		content: string;
	}[];
	reasoning?: {
		content: string;
		duration: number;
	};
	tools?: {
		name: string;
		description: string;
		status: ToolUIPart["state"];
		parameters: Record<string, unknown>;
		result: string | undefined;
		error: string | undefined;
	}[];
}

const initialMessages: MessageType[] = [
	{
		from: "user",
		key: nanoid(),
		versions: [
			{
				content: "Can you explain how to use React hooks effectively?",
				id: nanoid(),
			},
		],
	},
	{
		from: "assistant",
		key: nanoid(),
		sources: [
			{
				href: "https://react.dev/reference/react",
				title: "React Documentation",
			},
			{
				href: "https://react.dev/reference/react-dom",
				title: "React DOM Documentation",
			},
		],
		tools: [
			{
				description: "Searching React documentation",
				error: undefined,
				name: "mcp",
				parameters: {
					query: "React hooks best practices",
					source: "react.dev",
				},
				result: `{
  "query": "React hooks best practices",
  "results": [
    {
      "title": "Rules of Hooks",
      "url": "https://react.dev/warnings/invalid-hook-call-warning",
      "snippet": "Hooks must be called at the top level of your React function components or custom hooks. Don't call hooks inside loops, conditions, or nested functions."
    },
    {
      "title": "useState Hook",
      "url": "https://react.dev/reference/react/useState",
      "snippet": "useState is a React Hook that lets you add state to your function components. It returns an array with two values: the current state and a function to update it."
    },
    {
      "title": "useEffect Hook",
      "url": "https://react.dev/reference/react/useEffect",
      "snippet": "useEffect lets you synchronize a component with external systems. It runs after render and can be used to perform side effects like data fetching."
    }
  ]
}`,
				status: "input-available",
			},
		],
		versions: [
			{
				content: `# React Hooks Best Practices

React hooks are a powerful feature that let you use state and other React features without writing classes. Here are some tips for using them effectively:

## Rules of Hooks

1. **Only call hooks at the top level** of your component or custom hooks
2. **Don't call hooks inside loops, conditions, or nested functions**

## Common Hooks

- **useState**: For local component state
- **useEffect**: For side effects like data fetching
- **useContext**: For consuming context
- **useReducer**: For complex state logic
- **useCallback**: For memoizing functions
- **useMemo**: For memoizing values

## Example of useState and useEffect

\`\`\`jsx
function ProfilePage({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // This runs after render and when userId changes
    fetchUser(userId).then(userData => {
      setUser(userData);
    });
  }, [userId]);

  return user ? <Profile user={user} /> : <Loading />;
}
\`\`\`

Would you like me to explain any specific hook in more detail?`,
				id: nanoid(),
			},
		],
	},
	{
		from: "user",
		key: nanoid(),
		versions: [
			{
				content:
					"Yes, could you explain useCallback and useMemo in more detail? When should I use one over the other?",
				id: nanoid(),
			},
			{
				content:
					"I'm particularly interested in understanding the performance implications of useCallback and useMemo. Could you break down when each is most appropriate?",
				id: nanoid(),
			},
			{
				content:
					"Thanks for the overview! Could you dive deeper into the specific use cases where useCallback and useMemo make the biggest difference in React applications?",
				id: nanoid(),
			},
		],
	},
	{
		from: "assistant",
		key: nanoid(),
		reasoning: {
			content: `The user is asking for a detailed explanation of useCallback and useMemo. I should provide a clear and concise explanation of each hook's purpose and how they differ.

The useCallback hook is used to memoize functions to prevent unnecessary re-renders of child components that receive functions as props.

The useMemo hook is used to memoize values to avoid expensive recalculations on every render.

Both hooks help with performance optimization, but they serve different purposes.`,
			duration: 10,
		},
		versions: [
			{
				content: `## useCallback vs useMemo

Both hooks help with performance optimization, but they serve different purposes:

### useCallback

\`useCallback\` memoizes **functions** to prevent unnecessary re-renders of child components that receive functions as props.

\`\`\`jsx
// Without useCallback - a new function is created on every render
const handleClick = () => {
  console.log(count);
};

// With useCallback - the function is only recreated when dependencies change
const handleClick = useCallback(() => {
  console.log(count);
}, [count]);
\`\`\`

### useMemo

\`useMemo\` memoizes **values** to avoid expensive recalculations on every render.

\`\`\`jsx
// Without useMemo - expensive calculation runs on every render
const sortedList = expensiveSort(items);

// With useMemo - calculation only runs when items change
const sortedList = useMemo(() => expensiveSort(items), [items]);
\`\`\`

### When to use which?

- Use **useCallback** when:
  - Passing callbacks to optimized child components that rely on reference equality
  - Working with event handlers that you pass to child components

- Use **useMemo** when:
  - You have computationally expensive calculations
  - You want to avoid recreating objects that are used as dependencies for other hooks

### Performance Note

Don't overuse these hooks! They come with their own overhead. Only use them when you have identified a genuine performance issue.`,
				id: nanoid(),
			},
		],
	},
];

const models = [
	{
		chef: "OpenAI",
		chefSlug: "openai",
		id: "gpt-4o",
		name: "GPT-4o",
		providers: ["openai", "azure"],
	},
	{
		chef: "OpenAI",
		chefSlug: "openai",
		id: "gpt-4o-mini",
		name: "GPT-4o Mini",
		providers: ["openai", "azure"],
	},
	{
		chef: "Anthropic",
		chefSlug: "anthropic",
		id: "claude-opus-4-20250514",
		name: "Claude 4 Opus",
		providers: ["anthropic", "azure", "google", "amazon-bedrock"],
	},
	{
		chef: "Anthropic",
		chefSlug: "anthropic",
		id: "claude-sonnet-4-20250514",
		name: "Claude 4 Sonnet",
		providers: ["anthropic", "azure", "google", "amazon-bedrock"],
	},
	{
		chef: "Google",
		chefSlug: "google",
		id: "gemini-2.0-flash-exp",
		name: "Gemini 2.0 Flash",
		providers: ["google"],
	},
];

const suggestions = [
	"What are the latest trends in AI?",
	"How does machine learning work?",
	"Explain quantum computing",
	"Best practices for React development",
	"Tell me about TypeScript benefits",
	"How to optimize database queries?",
	"What is the difference between SQL and NoSQL?",
	"Explain cloud computing basics",
];

const mockResponses = [
	"That's a great question! Let me help you understand this concept better. The key thing to remember is that proper implementation requires careful consideration of the underlying principles and best practices in the field.",
	"I'd be happy to explain this topic in detail. From my understanding, there are several important factors to consider when approaching this problem. Let me break it down step by step for you.",
	"This is an interesting topic that comes up frequently. The solution typically involves understanding the core concepts and applying them in the right context. Here's what I recommend...",
	"Great choice of topic! This is something that many developers encounter. The approach I'd suggest is to start with the fundamentals and then build up to more complex scenarios.",
	"That's definitely worth exploring. From what I can see, the best way to handle this is to consider both the theoretical aspects and practical implementation details.",
];

const delay = (ms: number): Promise<void> =>
	// eslint-disable-next-line promise/avoid-new -- setTimeout requires a new Promise
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

const chefs = ["OpenAI", "Anthropic", "Google"];

const PromptInputAttachmentsDisplay = () => {
	const attachments = usePromptInputAttachments();

	if (attachments.files.length === 0) {
		return null;
	}

	return (
		<AttachmentGroup>
			{attachments.files.map((file) => {
				const isImage = file.mediaType.startsWith("image/");
				const name = file.filename ?? "Attachment";

				return (
					<Attachment key={file.id} size="sm">
						<AttachmentMedia variant={isImage ? "image" : "icon"}>
							{isImage ? <img alt={name} src={file.url} /> : <FileTextIcon />}
						</AttachmentMedia>
						<AttachmentContent>
							<AttachmentTitle>{name}</AttachmentTitle>
						</AttachmentContent>
						<AttachmentActions>
							<AttachmentAction
								aria-label="Remove attachment"
								onClick={() => attachments.remove(file.id)}
							>
								<XIcon />
							</AttachmentAction>
						</AttachmentActions>
					</Attachment>
				);
			})}
		</AttachmentGroup>
	);
};

const SuggestionItem = ({
	suggestion,
	onClick,
}: {
	suggestion: string;
	onClick: (suggestion: string) => void;
}) => {
	const handleClick = useCallback(() => {
		onClick(suggestion);
	}, [onClick, suggestion]);

	return <Suggestion onClick={handleClick} suggestion={suggestion} />;
};

const ModelItem = ({
	m,
	isSelected,
	onSelect,
}: {
	m: (typeof models)[0];
	isSelected: boolean;
	onSelect: (id: string) => void;
}) => {
	const handleSelect = useCallback(() => {
		onSelect(m.id);
	}, [onSelect, m.id]);

	return (
		<ModelSelectorItem onSelect={handleSelect} value={m.id}>
			<ModelSelectorLogo provider={m.chefSlug} />
			<ModelSelectorName>{m.name}</ModelSelectorName>
			<ModelSelectorLogoGroup>
				{m.providers.map((provider) => (
					<ModelSelectorLogo key={provider} provider={provider} />
				))}
			</ModelSelectorLogoGroup>
			{isSelected ? (
				<CheckIcon className="ml-auto size-4" />
			) : (
				<div className="ml-auto size-4" />
			)}
		</ModelSelectorItem>
	);
};

const Example = () => {
	const [model, setModel] = useState<string>(models[0].id);
	const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
	const [text, setText] = useState<string>("");
	const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
	const [status, setStatus] = useState<
		"submitted" | "streaming" | "ready" | "error"
	>("ready");
	const [messages, setMessages] = useState<MessageType[]>(initialMessages);
	const [, setStreamingMessageId] = useState<string | null>(null);

	const selectedModelData = useMemo(
		() => models.find((m) => m.id === model),
		[model],
	);

	const updateMessageContent = useCallback(
		(messageId: string, newContent: string) => {
			setMessages((prev) =>
				prev.map((msg) => {
					if (msg.versions.some((v) => v.id === messageId)) {
						return {
							...msg,
							versions: msg.versions.map((v) =>
								v.id === messageId ? { ...v, content: newContent } : v,
							),
						};
					}
					return msg;
				}),
			);
		},
		[],
	);

	const streamResponse = useCallback(
		async (messageId: string, content: string) => {
			setStatus("streaming");
			setStreamingMessageId(messageId);

			const words = content.split(" ");
			let currentContent = "";

			for (const [i, word] of words.entries()) {
				currentContent += (i > 0 ? " " : "") + word;
				updateMessageContent(messageId, currentContent);
				await delay(Math.random() * 100 + 50);
			}

			setStatus("ready");
			setStreamingMessageId(null);
		},
		[updateMessageContent],
	);

	const addUserMessage = useCallback(
		(content: string) => {
			const userMessage: MessageType = {
				from: "user",
				key: `user-${Date.now()}`,
				versions: [
					{
						content,
						id: `user-${Date.now()}`,
					},
				],
			};

			setMessages((prev) => [...prev, userMessage]);

			setTimeout(() => {
				const assistantMessageId = `assistant-${Date.now()}`;
				const randomResponse =
					mockResponses[Math.floor(Math.random() * mockResponses.length)];

				const assistantMessage: MessageType = {
					from: "assistant",
					key: `assistant-${Date.now()}`,
					versions: [
						{
							content: "",
							id: assistantMessageId,
						},
					],
				};

				setMessages((prev) => [...prev, assistantMessage]);
				streamResponse(assistantMessageId, randomResponse);
			}, 500);
		},
		[streamResponse],
	);

	const handleSubmit = useCallback(
		(message: PromptInputMessage) => {
			const hasText = Boolean(message.text);
			const hasAttachments = Boolean(message.files?.length);

			if (!(hasText || hasAttachments)) {
				return;
			}

			setStatus("submitted");

			if (message.files?.length) {
				toast.add({
					title: "Files attached",
					description: `${message.files.length} file(s) attached to message`,
					type: "success",
				});
			}

			addUserMessage(message.text || "Sent with attachments");
			setText("");
		},
		[addUserMessage],
	);

	const handleSuggestionClick = useCallback(
		(suggestion: string) => {
			setStatus("submitted");
			addUserMessage(suggestion);
		},
		[addUserMessage],
	);

	const handleTranscriptionChange = useCallback((transcript: string) => {
		setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
	}, []);

	const handleTextChange = useCallback(
		(event: React.ChangeEvent<HTMLTextAreaElement>) => {
			setText(event.target.value);
		},
		[],
	);

	const toggleWebSearch = useCallback(() => {
		setUseWebSearch((prev) => !prev);
	}, []);

	const handleModelSelect = useCallback((modelId: string) => {
		setModel(modelId);
		setModelSelectorOpen(false);
	}, []);

	const isSubmitDisabled = useMemo(
		() => !(text.trim() || status) || status === "streaming",
		[text, status],
	);

	return (
		<div className="relative flex size-full flex-col divide-y overflow-hidden">
			<MessageScrollerProvider autoScroll>
				<MessageScroller className="min-h-0 flex-1">
					<MessageScrollerViewport>
						<MessageScrollerContent className="p-4">
							<MessageScrollerItem messageId="today">
								<Marker variant="separator">
									<MarkerContent>Today</MarkerContent>
								</Marker>
							</MessageScrollerItem>
							{messages.map(({ versions, ...message }) => {
								// ponytail: shows the latest version only; add a version switcher if branching matters.
								const content = versions.at(-1)?.content ?? "";
								const isUser = message.from === "user";

								return (
									<MessageScrollerItem
										key={message.key}
										messageId={message.key}
										scrollAnchor={isUser}
									>
										<Message align={isUser ? "end" : "start"}>
											<MessageContent>
												{message.sources?.length ? (
													<Sources>
														<SourcesTrigger count={message.sources.length} />
														<SourcesContent>
															{message.sources.map((source) => (
																<Source
																	href={source.href}
																	key={source.href}
																	title={source.title}
																/>
															))}
														</SourcesContent>
													</Sources>
												) : null}
												{message.reasoning ? (
													<Reasoning duration={message.reasoning.duration}>
														<ReasoningTrigger />
														<ReasoningContent>
															{message.reasoning.content}
														</ReasoningContent>
													</Reasoning>
												) : null}
												<Bubble
													align={isUser ? "end" : "start"}
													variant={isUser ? "default" : "ghost"}
												>
													<BubbleContent>
														{isUser ? (
															content
														) : (
															<MarkdownRenderer>{content}</MarkdownRenderer>
														)}
													</BubbleContent>
												</Bubble>
											</MessageContent>
										</Message>
									</MessageScrollerItem>
								);
							})}
						</MessageScrollerContent>
					</MessageScrollerViewport>
					<MessageScrollerButton />
				</MessageScroller>
			</MessageScrollerProvider>
			<div className="grid shrink-0 gap-4 pt-4">
				<Suggestions className="px-4">
					{suggestions.map((suggestion) => (
						<SuggestionItem
							key={suggestion}
							onClick={handleSuggestionClick}
							suggestion={suggestion}
						/>
					))}
				</Suggestions>
				<div className="w-full px-4 pb-4">
					<PromptInput globalDrop multiple onSubmit={handleSubmit}>
						<PromptInputHeader>
							<PromptInputAttachmentsDisplay />
						</PromptInputHeader>
						<PromptInputBody>
							<PromptInputTextarea onChange={handleTextChange} value={text} />
						</PromptInputBody>
						<PromptInputFooter>
							<PromptInputTools>
								<PromptInputActionMenu>
									<PromptInputActionMenuTrigger />
									<PromptInputActionMenuContent>
										<PromptInputActionAddAttachments />
									</PromptInputActionMenuContent>
								</PromptInputActionMenu>
								<SpeechInput
									className="shrink-0"
									onTranscriptionChange={handleTranscriptionChange}
									size="icon-sm"
									variant="ghost"
								/>
								<PromptInputButton
									onClick={toggleWebSearch}
									variant={useWebSearch ? "default" : "ghost"}
								>
									<GlobeIcon size={16} />
									<span>Search</span>
								</PromptInputButton>
								<ModelSelector
									onOpenChange={setModelSelectorOpen}
									open={modelSelectorOpen}
								>
									<ModelSelectorTrigger render={<PromptInputButton />}>
										{selectedModelData?.chefSlug && (
											<ModelSelectorLogo
												provider={selectedModelData.chefSlug}
											/>
										)}
										{selectedModelData?.name && (
											<ModelSelectorName>
												{selectedModelData.name}
											</ModelSelectorName>
										)}
									</ModelSelectorTrigger>
									<ModelSelectorContent>
										<ModelSelectorInput placeholder="Search models..." />
										<ModelSelectorList>
											<ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
											{chefs.map((chef) => (
												<ModelSelectorGroup heading={chef} key={chef}>
													{models
														.filter((m) => m.chef === chef)
														.map((m) => (
															<ModelItem
																isSelected={model === m.id}
																key={m.id}
																m={m}
																onSelect={handleModelSelect}
															/>
														))}
												</ModelSelectorGroup>
											))}
										</ModelSelectorList>
									</ModelSelectorContent>
								</ModelSelector>
							</PromptInputTools>
							<PromptInputSubmit disabled={isSubmitDisabled} status={status} />
						</PromptInputFooter>
					</PromptInput>
				</div>
			</div>
		</div>
	);
};

export default Example;

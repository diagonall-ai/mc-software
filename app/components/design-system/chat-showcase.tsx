import { CheckIcon, FileTextIcon, ImageIcon, SheetIcon } from "lucide-react";
import type * as React from "react";
import {
	Attachment,
	AttachmentContent,
	AttachmentDescription,
	AttachmentGroup,
	AttachmentMedia,
	AttachmentTitle,
} from "~/components/ui/attachment";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Bubble, BubbleContent, BubbleReactions } from "~/components/ui/bubble";
import { Marker, MarkerContent, MarkerIcon } from "~/components/ui/marker";
import {
	Message,
	MessageAvatar,
	MessageContent,
	MessageFooter,
	MessageHeader,
} from "~/components/ui/message";
import {
	Questionnaire,
	QuestionnaireActions,
	QuestionnaireChoice,
	QuestionnaireChoices,
	QuestionnaireDescription,
	QuestionnaireError,
	QuestionnaireItem,
	QuestionnaireProgress,
	QuestionnaireSubmit,
	QuestionnaireTitle,
} from "~/components/ui/questionnaire";
import { toast } from "~/components/ui/toast";
import { ShowcaseCard } from "./showcase-card";

export function ChatShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Message, bubble, attachment, and marker primitives for chat and agent interfaces. Threads scroll inside MessageScroller (see the chatbot below)."
			title="Chat"
		>
			<div className="flex flex-col gap-4">
				<Marker variant="separator">
					<MarkerContent>Today</MarkerContent>
				</Marker>
				<Message align="start">
					<MessageAvatar>
						<Avatar>
							<AvatarFallback>AI</AvatarFallback>
						</Avatar>
					</MessageAvatar>
					<MessageContent>
						<MessageHeader>Assistant</MessageHeader>
						<Bubble variant="muted">
							<BubbleContent>
								I drafted the weekly report. Should I send it?
							</BubbleContent>
						</Bubble>
						<MessageFooter>09:41</MessageFooter>
					</MessageContent>
				</Message>
				<Message align="end">
					<MessageContent>
						<Bubble align="end">
							<BubbleContent>Yes, send it to the team.</BubbleContent>
							<BubbleReactions align="end" side="bottom">
								<Badge variant="secondary">👍 2</Badge>
							</BubbleReactions>
						</Bubble>
					</MessageContent>
				</Message>
				<Marker>
					<MarkerIcon>
						<CheckIcon />
					</MarkerIcon>
					<MarkerContent>Report sent to 4 people</MarkerContent>
				</Marker>
				<AttachmentGroup>
					<Attachment state="done">
						<AttachmentMedia variant="icon">
							<FileTextIcon />
						</AttachmentMedia>
						<AttachmentContent>
							<AttachmentTitle>weekly-report.pdf</AttachmentTitle>
							<AttachmentDescription>PDF · 2.4 MB</AttachmentDescription>
						</AttachmentContent>
					</Attachment>
					<Attachment state="uploading">
						<AttachmentMedia variant="icon">
							<ImageIcon />
						</AttachmentMedia>
						<AttachmentContent>
							<AttachmentTitle>dashboard.png</AttachmentTitle>
							<AttachmentDescription>Uploading</AttachmentDescription>
						</AttachmentContent>
					</Attachment>
					<Attachment state="error">
						<AttachmentMedia variant="icon">
							<SheetIcon />
						</AttachmentMedia>
						<AttachmentContent>
							<AttachmentTitle>budget.xlsx</AttachmentTitle>
							<AttachmentDescription>Upload failed</AttachmentDescription>
						</AttachmentContent>
					</Attachment>
				</AttachmentGroup>
				<p className="shimmer text-sm">Thinking…</p>
			</div>
		</ShowcaseCard>
	);
}

const questionnaireItems = [
	{
		choices: [{ value: "clients" }, { value: "orders" }, { value: "stock" }],
		name: "focus",
		required: true,
	},
] as const;

export function QuestionnaireShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Guided multiple-choice questions with keyboard shortcuts, for onboarding flows or agent follow-up questions."
			title="Questionnaire"
		>
			<Questionnaire
				defaultItem="focus"
				items={questionnaireItems}
				onSubmit={handleQuestionnaireSubmit}
				shortcuts="letters"
			>
				<QuestionnaireProgress />
				<QuestionnaireItem name="focus" required>
					<QuestionnaireTitle>
						What should the app track first?
					</QuestionnaireTitle>
					<QuestionnaireDescription>
						Pick one. You can change it later.
					</QuestionnaireDescription>
					<QuestionnaireChoices>
						<QuestionnaireChoice value="clients">Clients</QuestionnaireChoice>
						<QuestionnaireChoice value="orders">Orders</QuestionnaireChoice>
						<QuestionnaireChoice value="stock">Stock</QuestionnaireChoice>
					</QuestionnaireChoices>
					<QuestionnaireError />
				</QuestionnaireItem>
				<QuestionnaireActions className="w-full">
					<QuestionnaireSubmit>Save answer</QuestionnaireSubmit>
				</QuestionnaireActions>
			</Questionnaire>
		</ShowcaseCard>
	);
}

function handleQuestionnaireSubmit(event: React.FormEvent<HTMLFormElement>) {
	event.preventDefault();
	const focus = new FormData(event.currentTarget).get("focus");
	toast.add({
		title: "Answer saved",
		description: `Focus: ${focus ?? "none"}`,
		type: "success",
	});
}

import type { ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

type RouteErrorStateKind = "forbidden" | "not-found" | "server-error";

type RouteErrorStateProps = {
	description: string;
	kind: RouteErrorStateKind;
	onReset?: () => void;
	title: string;
};

const STATUS_LABELS: Record<RouteErrorStateKind, string> = {
	forbidden: "403",
	"not-found": "404",
	"server-error": "500",
};

export function RouteErrorState({
	description,
	kind,
	onReset,
	title,
}: RouteErrorStateProps) {
	return (
		<div className="flex min-h-[min(32rem,100vh)] items-center justify-center px-4 py-12">
			<Card className="w-full max-w-xl border-border/70">
				<CardHeader>
					<p className="font-medium text-muted-foreground text-xs tracking-[0.2em] uppercase">
						{STATUS_LABELS[kind]}
					</p>
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						This is the starter fallback. Feature pages can replace it only when
						they need domain-specific recovery.
					</p>
				</CardContent>
				<CardFooter className="gap-2">
					<Button asChild variant="outline">
						<a href="/dashboard">Dashboard</a>
					</Button>
					{onReset ? (
						<Button onClick={onReset} type="button">
							Try again
						</Button>
					) : null}
				</CardFooter>
			</Card>
		</div>
	);
}

export function NotFoundRouteState() {
	return (
		<RouteErrorState
			description="The requested page does not exist in this starter."
			kind="not-found"
			title="Page not found"
		/>
	);
}

export function ForbiddenRouteState() {
	return (
		<RouteErrorState
			description="The current session is missing the required permission or organization membership."
			kind="forbidden"
			title="Access denied"
		/>
	);
}

export function ServerErrorRouteState({
	reset,
}: Pick<ErrorComponentProps, "reset">) {
	return (
		<RouteErrorState
			description="The page failed while loading server data. The failure is surfaced instead of hidden behind fake empty data."
			kind="server-error"
			onReset={reset}
			title="Something failed"
		/>
	);
}

export function RouteErrorComponent({ error, reset }: ErrorComponentProps) {
	if (isForbiddenError(error)) {
		return <ForbiddenRouteState />;
	}

	if (isNotFoundError(error)) {
		return <NotFoundRouteState />;
	}

	return <ServerErrorRouteState reset={reset} />;
}

function isForbiddenError(error: unknown) {
	const status = readErrorStatus(error);
	const code = readErrorCode(error);
	return (
		status === 401 ||
		status === 403 ||
		code === "UNAUTHORIZED" ||
		code === "FORBIDDEN"
	);
}

function isNotFoundError(error: unknown) {
	return readErrorStatus(error) === 404 || readErrorCode(error) === "NOT_FOUND";
}

function readErrorStatus(error: unknown) {
	if (!error || typeof error !== "object") {
		return null;
	}

	const record = error as Record<string, unknown>;
	const status = record.status ?? record.statusCode;
	return typeof status === "number" ? status : null;
}

function readErrorCode(error: unknown) {
	if (!error || typeof error !== "object") {
		return null;
	}

	const code = (error as Record<string, unknown>).code;
	return typeof code === "string" ? code : null;
}

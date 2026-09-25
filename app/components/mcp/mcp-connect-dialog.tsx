import { CheckIcon, CopyIcon, KeyRound } from "lucide-react";
import { useState } from "react";
import { ApiKeyDrawer } from "~/components/api-keys/api-key-drawer";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { toast } from "~/components/ui/toast";
import { PROJECT_NAME } from "~/lib/project";

const KEY_PLACEHOLDER = "VOTRE_CLE_API";

/**
 * How to connect an AI agent to this app's MCP server: OAuth by default, or an
 * API key sent as a bearer token for clients and scripts without OAuth.
 */
export function McpConnectDialog({
	onOpenChange,
	open,
}: {
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const [apiKeysOpen, setApiKeysOpen] = useState(false);

	return (
		<>
			<Dialog onOpenChange={onOpenChange} open={open}>
				<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
					<McpInstructions onOpenApiKeys={() => setApiKeysOpen(true)} />
				</DialogContent>
			</Dialog>
			<ApiKeyDrawer
				onOpenChange={setApiKeysOpen}
				open={apiKeysOpen}
				showTrigger={false}
			/>
		</>
	);
}

// A readable server name for this deployment: "my-app-my-account" for
// my-app.my-account.workers.dev.
function getDefaultServerName() {
	return (
		window.location.hostname
			.replace(/\.workers\.dev$/, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "mcp"
	);
}

function McpInstructions({ onOpenApiKeys }: { onOpenApiKeys: () => void }) {
	const [name, setName] = useState(getDefaultServerName);
	const server = name.trim() || "mcp";
	const url = `${window.location.origin}/api/mcp`;
	const envVar = `${server.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
	const prompt = `Installe le serveur MCP « ${server} » dans ton client : ${url}, transport HTTP streamable. L’authentification se fait en OAuth : ouvre la page d’autorisation que le client propose. À défaut, utilise une clé API ${PROJECT_NAME} (menu « Clés API ») dans l’en-tête « Authorization: Bearer <clé> » ou « x-api-key: <clé> ».`;
	const cursorConfig = JSON.stringify(
		{
			mcpServers: {
				[server]: {
					url,
					headers: { Authorization: `Bearer ${KEY_PLACEHOLDER}` },
				},
			},
		},
		null,
		2,
	);

	return (
		<>
			<DialogHeader>
				<DialogTitle>Serveur MCP</DialogTitle>
				<DialogDescription>
					{PROJECT_NAME} propose ses actions principales en MCP : une fois
					connecté, un agent IA (Claude, Codex, Cursor…) les utilise sur vos
					données, avec vos droits.
				</DialogDescription>
			</DialogHeader>
			<Field>
				<FieldLabel htmlFor="mcp-server-name">Nom du serveur</FieldLabel>
				<Input
					id="mcp-server-name"
					onChange={(event) => setName(event.target.value)}
					value={name}
				/>
			</Field>
			<Snippet label="L’URL à donner au client MCP." value={url} />
			<Snippet
				label="À coller tel quel dans Claude Code, Codex ou Cursor : l’agent installe le serveur lui-même."
				value={prompt}
			/>
			<Snippet
				label="En ligne de commande, avec Claude :"
				value={`claude mcp add --transport http ${server} ${url}`}
			/>
			<Snippet
				label="ou avec Codex :"
				value={`codex mcp add ${server} --url ${url}`}
			/>
			<Separator />
			<div className="grid gap-3">
				<div className="grid gap-1">
					<p className="font-semibold">Sans OAuth, avec une clé API</p>
					<p className="text-sm text-muted-foreground">
						Pour un client qui ne gère pas la connexion OAuth, ou pour un
						script. Créez une clé, puis remplacez {KEY_PLACEHOLDER} par cette
						clé. Elle passe dans l’en-tête Authorization: Bearer (ou x-api-key).
					</p>
				</div>
				<Button
					className="justify-self-start"
					onClick={onOpenApiKeys}
					size="sm"
					variant="outline"
				>
					<KeyRound />
					Créer une clé API
				</Button>
			</div>
			<Snippet
				label="Avec Claude :"
				value={`claude mcp add --transport http ${server} ${url} --header "Authorization: Bearer ${KEY_PLACEHOLDER}"`}
			/>
			<Snippet
				label="Avec Codex, qui lit la clé dans une variable d’environnement :"
				value={`export ${envVar}="${KEY_PLACEHOLDER}"\ncodex mcp add ${server} --url ${url} --bearer-token-env-var ${envVar}`}
			/>
			<Snippet
				label="Cursor et les autres clients, dans leur fichier de configuration MCP :"
				value={cursorConfig}
			/>
		</>
	);
}

function Snippet({ label, value }: { label: string; value: string }) {
	const [copied, setCopied] = useState(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			toast.add({ title: "Copie impossible", type: "error" });
		}
	}

	return (
		<div className="grid gap-2">
			<p className="text-sm text-muted-foreground">{label}</p>
			<div className="relative rounded-lg border bg-muted/40 py-2.5 pr-11 pl-3 text-sm whitespace-pre-wrap wrap-anywhere">
				{value}
				<Button
					aria-label="Copier"
					className="absolute top-1.5 right-1.5"
					onClick={copy}
					size="icon-sm"
					variant="ghost"
				>
					{copied ? <CheckIcon /> : <CopyIcon />}
				</Button>
			</div>
		</div>
	);
}

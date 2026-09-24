import { createFileRoute } from "@tanstack/react-router";
import {
	type ColumnDef,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
	Bell,
	Calendar as CalendarIcon,
	Check,
	CircleAlert,
	Command as CommandIcon,
	CreditCard,
	Grip,
	Images,
	LayoutTemplate,
	Package,
	Search,
	Settings2,
	Sparkles,
	User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";
import ExampleChatbot from "~/components/ai-elements/example-chatbot";
import {
	DashboardFooterLeftPortal,
	DashboardFooterRightPortal,
} from "~/components/dashboard/shell-portals";
import { DataTable } from "~/components/data-table/data-table";
import { MarkdownRenderer } from "~/components/markdown/markdown-renderer";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { AspectRatio } from "~/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
	Banner,
	BannerActions,
	BannerClose,
	BannerDescription,
	Banners,
	BannerTitle,
	useBanners,
} from "~/components/ui/banner";
import {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button, buttonVariants } from "~/components/ui/button";
import {
	ButtonGroup,
	ButtonGroupSeparator,
	ButtonGroupText,
} from "~/components/ui/button-group";
import { Calendar } from "~/components/ui/calendar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "~/components/ui/carousel";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "~/components/ui/chart";
import { Checkbox } from "~/components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "~/components/ui/combobox";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "~/components/ui/command";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "~/components/ui/context-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { DirectionProvider } from "~/components/ui/direction";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "~/components/ui/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import {
	FileUpload,
	FileUploadClear,
	FileUploadDropzone,
	FileUploadItem,
	FileUploadItemDelete,
	FileUploadItemMetadata,
	FileUploadItemPreview,
	FileUploadItemProgress,
	FileUploadList,
	FileUploadTrigger,
} from "~/components/ui/file-upload";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "~/components/ui/hover-card";
import { Input } from "~/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from "~/components/ui/input-group";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "~/components/ui/input-otp";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemFooter,
	ItemGroup,
	ItemHeader,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
} from "~/components/ui/item";
import {
	Kanban,
	KanbanBoard,
	KanbanColumn,
	KanbanColumnHandle,
	KanbanItem,
	KanbanItemHandle,
	KanbanOverlay,
} from "~/components/ui/kanban";
import { Kbd } from "~/components/ui/kbd";
import { Label } from "~/components/ui/label";
import {
	MediaPlayer,
	MediaPlayerControls,
	MediaPlayerControlsOverlay,
	MediaPlayerDownload,
	MediaPlayerError,
	MediaPlayerFullscreen,
	MediaPlayerLoading,
	MediaPlayerPlay,
	MediaPlayerSeek,
	MediaPlayerSeekBackward,
	MediaPlayerSeekForward,
	MediaPlayerSettings,
	MediaPlayerTime,
	MediaPlayerVideo,
	MediaPlayerVolume,
} from "~/components/ui/media-player";
import {
	Menubar,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarTrigger,
} from "~/components/ui/menubar";
import {
	NativeSelect,
	NativeSelectOption,
} from "~/components/ui/native-select";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "~/components/ui/navigation-menu";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "~/components/ui/pagination";
import {
	PhoneInput,
	PhoneInputCountrySelect,
	PhoneInputField,
} from "~/components/ui/phone-input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { Progress } from "~/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "~/components/ui/resizable";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "~/components/ui/sidebar";
import { Skeleton } from "~/components/ui/skeleton";
import { Slider } from "~/components/ui/slider";
import {
	Sortable,
	SortableContent,
	SortableItem,
	SortableItemHandle,
	SortableOverlay,
} from "~/components/ui/sortable";
import { Spinner } from "~/components/ui/spinner";
import {
	Stat,
	StatDescription,
	StatIndicator,
	StatLabel,
	StatSeparator,
	StatTrend,
	StatValue,
} from "~/components/ui/stat";
import { Switch } from "~/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import {
	Timeline,
	TimelineConnector,
	TimelineContent,
	TimelineDescription,
	TimelineDot,
	TimelineHeader,
	TimelineItem,
	TimelineTime,
	TimelineTitle,
} from "~/components/ui/timeline";
import { Toggle } from "~/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import {
	Tour,
	TourArrow,
	TourClose,
	TourDescription,
	TourFooter,
	TourHeader,
	TourNext,
	TourPortal,
	TourPrev,
	TourSkip,
	TourSpotlight,
	TourSpotlightRing,
	TourStep,
	TourStepCounter,
	TourTitle,
} from "~/components/ui/tour";
import { PROJECT_INITIALS, PROJECT_NAME } from "~/lib/project";

export const Route = createFileRoute("/dashboard/design-system")({
	staticData: {
		dashboardHeader: {
			description: "Installed shadcn primitives and composite docs patterns.",
			title: "Design System",
		},
	},
	ssr: false,
	component: DesignSystemPage,
});

const chartData = [
	{ month: "Jan", activations: 24 },
	{ month: "Feb", activations: 41 },
	{ month: "Mar", activations: 35 },
	{ month: "Apr", activations: 54 },
];

const chartConfig = {
	activations: {
		label: "Activations",
		color: "var(--color-chart-1)",
	},
} satisfies ChartConfig;

const comboboxOptions = ["Dashboard", "Analytics", "Billing", "Support"];

const diceTableRows = [
	{
		name: "Atelier",
		region: "eu-west-1",
		status: "Active",
		usage: 68,
	},
	{
		name: "Northwind",
		region: "us-east-1",
		status: "Review",
		usage: 42,
	},
	{
		name: "Lighthouse",
		region: "ap-south-1",
		status: "Pending",
		usage: 27,
	},
	{
		name: "Cascade",
		region: "eu-central-1",
		status: "Active",
		usage: 81,
	},
] as const;

const diceTableColumns: ColumnDef<(typeof diceTableRows)[number]>[] = [
	{
		accessorKey: "name",
		header: "Workspace",
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
	},
	{
		accessorKey: "region",
		header: "Region",
	},
	{
		accessorKey: "usage",
		header: "Usage",
		cell: ({ row }) => (
			<span className="tabular-nums">{row.original.usage}%</span>
		),
	},
];

const initialKanbanColumns = {
	backlog: [
		{ id: "brief", title: "Draft brief", note: "Frame the request." },
		{ id: "schema", title: "Model schema", note: "Define ownership." },
	],
	review: [
		{ id: "ui-kit", title: "Compose UI", note: "Wire the shared primitives." },
	],
	ship: [{ id: "deploy", title: "Ship", note: "Run checks and deploy." }],
};

const markdownShowcaseDocument = `
# Markdown renderer

Streamdown gives the app a single component for rendering rich markdown documents with first-class support for code, math, mermaid, and streaming-friendly formatting.

## Why it matters

- Reuse one renderer across application docs, AI responses, and internal knowledge surfaces.
- Keep markdown readable in both light and dark mode.
- Support richer blocks without building custom renderers for each format.

> This sample is intentionally document-like rather than chat-like so the design system shows the standalone markdown surface.

### Code block

~~~ts
export async function copyMcpUrl() {
  await navigator.clipboard.writeText("/api/mcp");
}
~~~

### Math

$$
E = mc^2
$$

### Mermaid

~~~mermaid
flowchart TD
    user[User] --> renderer[MarkdownRenderer]
    renderer --> plugins[StreamdownPlugins]
    plugins --> output[StyledDocument]
~~~
`;

function DesignSystemPage() {
	return (
		<>
			<DashboardShellFooterExample />
			<div className="space-y-6">
				<PageIntro />
				<div className="grid gap-4 xl:grid-cols-2">
					<ShellShowcase />
					<ActionsShowcase />
					<FeedbackShowcase />
					<FormShowcase />
					<SelectionShowcase />
					<OverlayShowcase />
					<MenuShowcase />
					<CommandShowcase />
					<StructureShowcase />
					<NavigationShowcase />
					<CalendarShowcase />
					<ChartShowcase />
					<DiceInputsShowcase />
					<DiceDataShowcase />
					<DiceInteractionShowcase />
					<DiceMediaShowcase />
					<BannerShowcase />
					<TimelineShowcase />
					<TourShowcase />
					<SidebarShowcase />
					<DisplayShowcase />
					<MarkdownShowcase />
					<AiElementsShowcase />
					<TypographyShowcase />
				</div>
			</div>
		</>
	);
}

function DashboardShellFooterExample() {
	return (
		<>
			<DashboardFooterLeftPortal>
				<div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
					<Badge className="shrink-0" variant="outline">
						Shell footer
					</Badge>
					<span className="truncate">
						This design-system page mounted the footer through page portals.
					</span>
				</div>
			</DashboardFooterLeftPortal>
			<DashboardFooterRightPortal>
				<Button size="sm" variant="ghost">
					Reset
				</Button>
				<Button size="sm">
					<Check className="size-4" />
					Save example
				</Button>
			</DashboardFooterRightPortal>
		</>
	);
}

function PageIntro() {
	return (
		<Card className="border-border/70">
			<CardHeader className="gap-3 border-b border-border/70 bg-card/70">
				<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<LayoutTemplate className="size-4" />
					Design System
				</div>
				<CardTitle className="text-3xl">
					Installed shadcn surface area
				</CardTitle>
				<CardDescription className="max-w-3xl text-sm leading-6">
					This page renders the current shadcn primitives and the composite docs
					patterns used by the template. Notifications use Sonner only, and the
					calendar/date-picker path is wired to the shared calendar component.
				</CardDescription>
			</CardHeader>
		</Card>
	);
}

function ShowcaseCard({
	title,
	description,
	children,
	className,
}: {
	title: string;
	description: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

function ActionsShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Button, button group, badge, kbd, toggle, and toggle group."
			title="Actions"
		>
			<div className="space-y-5">
				<div className="flex flex-wrap items-center gap-3">
					<Button>Primary</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="outline">Outline</Button>
					<Button variant="ghost">Ghost</Button>
					<Button variant="link">Link</Button>
					<Badge>Badge</Badge>
					<Kbd>⌘K</Kbd>
				</div>
				<ButtonGroup>
					<Button variant="outline">Left</Button>
					<Button variant="outline">Center</Button>
					<Button variant="outline">Right</Button>
				</ButtonGroup>
				<ButtonGroup>
					<Button variant="outline">Export</Button>
					<ButtonGroupSeparator />
					<ButtonGroupText>
						<CreditCard className="size-4" />
						Monthly
					</ButtonGroupText>
				</ButtonGroup>
				<div className="flex flex-wrap items-center gap-4">
					<Toggle aria-label="Toggle notifications" pressed>
						<Bell className="size-4" />
					</Toggle>
					<ToggleGroup defaultValue="week" type="single">
						<ToggleGroupItem value="day">Day</ToggleGroupItem>
						<ToggleGroupItem value="week">Week</ToggleGroupItem>
						<ToggleGroupItem value="month">Month</ToggleGroupItem>
					</ToggleGroup>
				</div>
			</div>
		</ShowcaseCard>
	);
}

function ShellShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70 xl:col-span-2"
			description="Header and footer slots stay outside page scroll while the route content remains the only scrollable region."
			title="Dashboard Shell"
		>
			<div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
				<div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
					<div className="flex h-10 items-center justify-between border-b border-border/70 bg-background px-3 text-xs text-muted-foreground">
						<span>Header metadata</span>
						<Badge variant="outline">actions portal</Badge>
					</div>
					<div className="flex h-28 items-center justify-center px-4 text-center text-sm text-muted-foreground">
						Only this middle pane scrolls. The shell owns the persistent chrome.
					</div>
					<div className="grid h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-border/70 bg-background px-3 text-xs text-muted-foreground">
						<span className="truncate">footer left portal</span>
						<span>footer right portal</span>
					</div>
				</div>
				<div className="space-y-3 text-sm text-muted-foreground">
					<p>
						The footer is not rendered by default. Mount
						<code className="mx-1 rounded bg-muted px-1 py-0.5">
							DashboardFooterLeftPortal
						</code>
						or
						<code className="mx-1 rounded bg-muted px-1 py-0.5">
							DashboardFooterRightPortal
						</code>
						from a dashboard page to reveal it.
					</p>
					<p>
						This page mounts both slots now, so the real shell footer at the
						bottom of the viewport is the live example.
					</p>
				</div>
			</div>
		</ShowcaseCard>
	);
}

function FeedbackShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Alert, sonner, progress, spinner, skeleton, and empty state."
			title="Feedback"
		>
			<div className="space-y-5">
				<Alert>
					<CircleAlert className="size-4" />
					<AlertTitle>Release checks enabled</AlertTitle>
					<AlertDescription>
						New features should pass lint, typecheck, build, and auth-path
						verification before they ship.
					</AlertDescription>
				</Alert>
				<div className="flex flex-wrap items-center gap-3">
					<Button
						onClick={() =>
							toast.success("Sonner is the only notification path in this app.")
						}
						variant="outline"
					>
						Trigger Sonner
					</Button>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Spinner />
						Loading state
					</div>
				</div>
				<div className="space-y-2">
					<Progress value={68} />
					<div className="grid gap-2 sm:grid-cols-3">
						<Skeleton className="h-10 w-full rounded-xl" />
						<Skeleton className="h-10 w-full rounded-xl" />
						<Skeleton className="h-10 w-full rounded-xl" />
					</div>
				</div>
				<Empty className="rounded-2xl border border-dashed border-border/70">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Package className="size-5" />
						</EmptyMedia>
						<EmptyTitle>No artifacts yet</EmptyTitle>
						<EmptyDescription>
							Use this pattern for first-run or filtered-empty states.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button variant="secondary">Create the first one</Button>
					</EmptyContent>
				</Empty>
			</div>
		</ShowcaseCard>
	);
}

function FormShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Label, input, textarea, input group, field, and item."
			title="Form Building"
		>
			<div className="space-y-5">
				<div className="space-y-2">
					<Label htmlFor="ds-project-name">Project name</Label>
					<Input id="ds-project-name" placeholder={PROJECT_NAME} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="ds-notes">Notes</Label>
					<Textarea
						id="ds-notes"
						placeholder="Textarea is available for larger freeform inputs."
					/>
				</div>
				<InputGroup>
					<InputGroupAddon align="inline-start">
						<InputGroupText>https://</InputGroupText>
					</InputGroupAddon>
					<InputGroupInput placeholder="workspace.example.com" />
					<InputGroupAddon align="inline-end">
						<InputGroupButton size="icon-sm" variant="ghost">
							<Search className="size-4" />
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
				<InputGroup>
					<InputGroupAddon align="block-start">
						<InputGroupText>Long-form announcement</InputGroupText>
					</InputGroupAddon>
					<InputGroupTextarea placeholder="Input group also supports block layouts." />
				</InputGroup>
				<FieldGroup>
					<Field>
						<FieldContent>
							<FieldLabel htmlFor="ds-field-email">Operator email</FieldLabel>
							<Input
								aria-invalid
								defaultValue="invalid-email"
								id="ds-field-email"
							/>
							<FieldDescription>
								Ownership and auth-sensitive actions should always be checked in
								server-side repositories, not just in the form.
							</FieldDescription>
							<FieldError>Enter a valid email address.</FieldError>
						</FieldContent>
					</Field>
				</FieldGroup>
				<ItemGroup className="rounded-xl border border-border/70">
					<Item size="sm" variant="muted">
						<ItemMedia variant="icon">
							<Package className="size-4" />
						</ItemMedia>
						<ItemContent>
							<ItemHeader>
								<ItemTitle>Starter inventory</ItemTitle>
								<Badge variant="outline">Item</Badge>
							</ItemHeader>
							<ItemDescription>
								This is the utility row pattern for dense lists and settings.
							</ItemDescription>
							<ItemFooter>
								<span className="text-xs text-muted-foreground">
									Updated now
								</span>
								<ItemActions>
									<Button size="sm" variant="outline">
										Inspect
									</Button>
								</ItemActions>
							</ItemFooter>
						</ItemContent>
					</Item>
					<ItemSeparator />
					<Item size="sm">
						<ItemContent>
							<ItemTitle>Second row</ItemTitle>
							<ItemDescription>
								`Item` is useful when plain cards are too heavy.
							</ItemDescription>
						</ItemContent>
					</Item>
				</ItemGroup>
			</div>
		</ShowcaseCard>
	);
}

function SelectionShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Checkbox, switch, radio group, slider, select, native select, and input OTP."
			title="Selection Controls"
		>
			<div className="space-y-5">
				<div className="flex flex-wrap items-center gap-6">
					<div className="flex items-center gap-2">
						<Checkbox checked id="ds-checkbox" />
						<Label htmlFor="ds-checkbox">Checkbox</Label>
					</div>
					<div className="flex items-center gap-3">
						<Label htmlFor="ds-switch">Dark mode</Label>
						<Switch checked id="ds-switch" />
					</div>
				</div>
				<RadioGroup className="grid gap-3 sm:grid-cols-3" defaultValue="team">
					<div className="flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2">
						<RadioGroupItem id="rg-team" value="team" />
						<Label htmlFor="rg-team">Team</Label>
					</div>
					<div className="flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2">
						<RadioGroupItem id="rg-agency" value="agency" />
						<Label htmlFor="rg-agency">Agency</Label>
					</div>
					<div className="flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2">
						<RadioGroupItem id="rg-enterprise" value="enterprise" />
						<Label htmlFor="rg-enterprise">Enterprise</Label>
					</div>
				</RadioGroup>
				<div className="space-y-3">
					<Label>Slider</Label>
					<Slider defaultValue={[48]} max={100} step={1} />
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label>Select</Label>
						<Select defaultValue="weekly">
							<SelectTrigger>
								<SelectValue placeholder="Choose cadence" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="daily">Daily</SelectItem>
								<SelectItem value="weekly">Weekly</SelectItem>
								<SelectItem value="monthly">Monthly</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Native Select</Label>
						<NativeSelect defaultValue="fr">
							<NativeSelectOption value="fr">France</NativeSelectOption>
							<NativeSelectOption value="uk">United Kingdom</NativeSelectOption>
							<NativeSelectOption value="us">United States</NativeSelectOption>
						</NativeSelect>
					</div>
				</div>
				<div className="space-y-2">
					<Label>Input OTP</Label>
					<InputOTP maxLength={6} value="482391">
						<InputOTPGroup>
							<InputOTPSlot index={0} />
							<InputOTPSlot index={1} />
							<InputOTPSlot index={2} />
						</InputOTPGroup>
						<InputOTPSeparator />
						<InputOTPGroup>
							<InputOTPSlot index={3} />
							<InputOTPSlot index={4} />
							<InputOTPSlot index={5} />
						</InputOTPGroup>
					</InputOTP>
				</div>
			</div>
		</ShowcaseCard>
	);
}

function OverlayShowcase() {
	const [date, setDate] = useState<Date | undefined>(new Date("2026-04-07"));

	return (
		<ShowcaseCard
			className="border-border/70"
			description="Dialog, alert dialog, sheet, drawer, popover, hover card, tooltip, and date picker."
			title="Overlays"
		>
			<TooltipProvider>
				<div className="flex flex-wrap items-center gap-3">
					<Dialog>
						<DialogTrigger asChild>
							<Button variant="outline">Dialog</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Standard dialog</DialogTitle>
								<DialogDescription>
									Use dialog for focused workflows that need interruption.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<Button>Confirm</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="outline">Alert Dialog</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogMedia>
									<CircleAlert className="size-6" />
								</AlertDialogMedia>
								<AlertDialogTitle>Destructive confirmation</AlertDialogTitle>
								<AlertDialogDescription>
									Reserve this for high-risk actions like deleting workspace
									data.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction variant="destructive">
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
					<Sheet>
						<SheetTrigger asChild>
							<Button variant="outline">Sheet</Button>
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>Side panel</SheetTitle>
								<SheetDescription>
									Sheet works well for secondary tasks that should not replace
									the current page.
								</SheetDescription>
							</SheetHeader>
						</SheetContent>
					</Sheet>
					<Drawer>
						<DrawerTrigger asChild>
							<Button variant="outline">Drawer</Button>
						</DrawerTrigger>
						<DrawerContent>
							<DrawerHeader>
								<DrawerTitle>Mobile-first drawer</DrawerTitle>
								<DrawerDescription>
									Use this when the interaction should feel native on smaller
									screens.
								</DrawerDescription>
							</DrawerHeader>
							<DrawerFooter>
								<Button>Save</Button>
								<DrawerClose asChild>
									<Button variant="outline">Close</Button>
								</DrawerClose>
							</DrawerFooter>
						</DrawerContent>
					</Drawer>
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline">Popover</Button>
						</PopoverTrigger>
						<PopoverContent className="w-72">
							<p className="text-sm font-medium">Inline decision</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Popovers are for light, contextual controls.
							</p>
						</PopoverContent>
					</Popover>
					<HoverCard>
						<HoverCardTrigger asChild>
							<Button variant="outline">Hover Card</Button>
						</HoverCardTrigger>
						<HoverCardContent className="w-72">
							<p className="text-sm font-medium">Operator profile</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Hover card is useful for lightweight previews.
							</p>
						</HoverCardContent>
					</HoverCard>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button size="icon" variant="outline">
								<Bell className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Tooltip</TooltipContent>
					</Tooltip>
				</div>
				<div className="mt-5 space-y-2">
					<Label>Date Picker</Label>
					<Popover>
						<PopoverTrigger asChild>
							<Button className="w-full justify-between" variant="outline">
								{date ? format(date, "PPP") : "Pick a date"}
								<CalendarIcon className="size-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-auto p-0">
							<Calendar mode="single" onSelect={setDate} selected={date} />
						</PopoverContent>
					</Popover>
				</div>
			</TooltipProvider>
		</ShowcaseCard>
	);
}

function MenuShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Dropdown menu, context menu, menubar, and navigation menu."
			title="Menus"
		>
			<div className="space-y-5">
				<div className="flex flex-wrap items-center gap-3">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline">Dropdown Menu</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							<DropdownMenuItem>Profile</DropdownMenuItem>
							<DropdownMenuItem>Settings</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem>Sign out</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<ContextMenu>
						<ContextMenuTrigger className="rounded-xl border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground">
							Right click for Context Menu
						</ContextMenuTrigger>
						<ContextMenuContent>
							<ContextMenuItem>Duplicate</ContextMenuItem>
							<ContextMenuItem>Share</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem>Archive</ContextMenuItem>
						</ContextMenuContent>
					</ContextMenu>
				</div>
				<Menubar>
					<MenubarMenu>
						<MenubarTrigger>File</MenubarTrigger>
						<MenubarContent>
							<MenubarItem>New page</MenubarItem>
							<MenubarItem>Publish</MenubarItem>
						</MenubarContent>
					</MenubarMenu>
					<MenubarMenu>
						<MenubarTrigger>View</MenubarTrigger>
						<MenubarContent>
							<MenubarItem>Sidebar</MenubarItem>
							<MenubarItem>Inspector</MenubarItem>
						</MenubarContent>
					</MenubarMenu>
				</Menubar>
				<NavigationMenu viewport={false}>
					<NavigationMenuList>
						<NavigationMenuItem>
							<NavigationMenuTrigger>Platform</NavigationMenuTrigger>
							<NavigationMenuContent>
								<div className="grid w-72 gap-2">
									<NavigationMenuLink href="#">Realtime</NavigationMenuLink>
									<NavigationMenuLink href="#">File uploads</NavigationMenuLink>
									<NavigationMenuLink href="#">
										Cloudflare deploy
									</NavigationMenuLink>
								</div>
							</NavigationMenuContent>
						</NavigationMenuItem>
						<NavigationMenuItem>
							<NavigationMenuLink
								className={buttonVariants({ variant: "ghost" })}
								href="#"
							>
								Docs
							</NavigationMenuLink>
						</NavigationMenuItem>
					</NavigationMenuList>
				</NavigationMenu>
			</div>
		</ShowcaseCard>
	);
}

function CommandShowcase() {
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState("Dashboard");

	return (
		<ShowcaseCard
			className="border-border/70"
			description="Command palette plus the first-class shadcn combobox primitive."
			title="Command and Combobox"
		>
			<div className="space-y-5">
				<Button onClick={() => setOpen(true)} variant="outline">
					<CommandIcon className="size-4" />
					Open Command Dialog
					<Kbd className="ml-auto hidden sm:inline-flex">⌘K</Kbd>
				</Button>
				<Dialog onOpenChange={setOpen} open={open}>
					<DialogContent className="overflow-hidden p-0">
						<Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5">
							<CommandInput placeholder="Search commands..." />
							<CommandList>
								<CommandEmpty>No results found.</CommandEmpty>
								<CommandGroup heading="Navigation">
									<CommandItem>Dashboard</CommandItem>
									<CommandItem>Design System</CommandItem>
									<CommandItem>Examples</CommandItem>
								</CommandGroup>
								<CommandSeparator />
								<CommandGroup heading="Actions">
									<CommandItem>
										Publish
										<CommandShortcut>⌘P</CommandShortcut>
									</CommandItem>
									<CommandItem>
										Invite
										<CommandShortcut>⌘I</CommandShortcut>
									</CommandItem>
								</CommandGroup>
							</CommandList>
						</Command>
					</DialogContent>
				</Dialog>
				<div className="space-y-2">
					<Label>Combobox</Label>
					<Combobox
						items={comboboxOptions}
						onValueChange={(nextValue) => setValue(nextValue ?? "")}
						value={value}
					>
						<ComboboxInput placeholder="Search views..." />
						<ComboboxContent>
							<ComboboxEmpty>No view found.</ComboboxEmpty>
							<ComboboxList>
								{(option) => (
									<ComboboxItem key={option} value={option}>
										{option}
									</ComboboxItem>
								)}
							</ComboboxList>
						</ComboboxContent>
					</Combobox>
				</div>
			</div>
		</ShowcaseCard>
	);
}

function StructureShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Accordion, collapsible, separator, table, and the data-table composite pattern."
			title="Structure"
		>
			<div className="space-y-5">
				<Accordion
					className="w-full rounded-xl border border-border/70 px-4"
					type="single"
					collapsible
				>
					<AccordionItem value="overview">
						<AccordionTrigger>Accordion</AccordionTrigger>
						<AccordionContent>
							Accordion works well for dense settings or contextual help.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
				<Collapsible className="rounded-xl border border-border/70 p-4">
					<CollapsibleTrigger asChild>
						<Button variant="ghost">Collapsible section</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="pt-3 text-sm text-muted-foreground">
						Collapsible is the lighter alternative when a full accordion group
						is not necessary.
					</CollapsibleContent>
				</Collapsible>
				<Separator />
				<div className="space-y-3">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="font-medium">Data Table</p>
							<p className="text-sm text-muted-foreground">
								This docs pattern is composed from `Input`, `Table`, `Badge`,
								and `Pagination`.
							</p>
						</div>
						<Input className="max-w-52" placeholder="Filter rows..." />
					</div>
					<div className="rounded-xl border border-border/70">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Workspace</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Region</TableHead>
									<TableHead className="text-right">Usage</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								<TableRow>
									<TableCell>Alpha</TableCell>
									<TableCell>
										<Badge variant="outline">Active</Badge>
									</TableCell>
									<TableCell>eu-west-1</TableCell>
									<TableCell className="text-right">68%</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>Beta</TableCell>
									<TableCell>
										<Badge variant="outline">Review</Badge>
									</TableCell>
									<TableCell>us-east-1</TableCell>
									<TableCell className="text-right">42%</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious href="#" />
							</PaginationItem>
							<PaginationItem>
								<PaginationLink href="#" isActive>
									1
								</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationLink href="#">2</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationEllipsis />
							</PaginationItem>
							<PaginationItem>
								<PaginationNext href="#" />
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			</div>
		</ShowcaseCard>
	);
}

function NavigationShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Breadcrumb, tabs, direction provider, and the app-shell navigation patterns."
			title="Navigation"
		>
			<div className="space-y-5">
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="#">Home</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink href="#">Workspace</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbEllipsis />
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>Design System</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
				<Tabs defaultValue="overview">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="activity">Activity</TabsTrigger>
						<TabsTrigger value="access">Access</TabsTrigger>
					</TabsList>
					<TabsContent
						className="rounded-xl border border-border/70 p-4"
						value="overview"
					>
						Reusable tabbed navigation for compact page sections.
					</TabsContent>
					<TabsContent
						className="rounded-xl border border-border/70 p-4"
						value="activity"
					>
						Use tabs when context switching stays inside one route.
					</TabsContent>
					<TabsContent
						className="rounded-xl border border-border/70 p-4"
						value="access"
					>
						Good fit for settings, billing, and account subareas.
					</TabsContent>
				</Tabs>
				<DirectionProvider dir="rtl">
					<div className="rounded-xl border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
						Direction provider can wrap RTL-sensitive UI when needed.
					</div>
				</DirectionProvider>
			</div>
		</ShowcaseCard>
	);
}

function DisplayShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70 xl:col-span-2"
			description="Avatar, aspect ratio, card, carousel, resizable panels, and scroll area."
			title="Display and Layout"
		>
			<div className="space-y-5">
				<div className="flex flex-wrap items-center gap-4">
					<Avatar>
						<AvatarImage alt="Avatar" src="https://i.pravatar.cc/80?img=12" />
						<AvatarFallback>{PROJECT_INITIALS}</AvatarFallback>
					</Avatar>
					<div className="w-full max-w-48 overflow-hidden rounded-2xl border border-border/70">
						<AspectRatio ratio={16 / 9}>
							<div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,var(--color-chart-1),var(--color-chart-2))] text-white">
								<Images className="size-6" />
							</div>
						</AspectRatio>
					</div>
				</div>

				<div className="rounded-xl border border-border/70 p-6">
					<Carousel className="mx-12">
						<CarouselContent>
							{["Foundations", "Patterns", "Primitives"].map((label) => (
								<CarouselItem key={label}>
									<div className="rounded-2xl border border-border/70 bg-accent/35 p-8">
										<p className="text-sm text-muted-foreground">Carousel</p>
										<p className="mt-2 text-2xl font-semibold">{label}</p>
									</div>
								</CarouselItem>
							))}
						</CarouselContent>
						<CarouselPrevious />
						<CarouselNext />
					</Carousel>
				</div>

				<ResizablePanelGroup
					className="min-h-52 overflow-hidden rounded-xl border border-border/70"
					orientation="horizontal"
				>
					<ResizablePanel defaultSize={55}>
						<div className="flex h-full items-center justify-center bg-card text-sm text-muted-foreground">
							Left panel
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize={45}>
						<div className="flex h-full items-center justify-center bg-muted/50 text-sm text-muted-foreground">
							Right panel
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
				<ScrollArea className="h-32 rounded-xl border border-border/70 p-4">
					<div className="space-y-3 pr-4">
						{Array.from({ length: 8 }, (_, index) => (
							<div
								className="rounded-lg border border-border/60 bg-background/80 p-3 text-sm"
								key={`scroll-row-${index + 1}`}
							>
								Scrollable row {index + 1}
							</div>
						))}
					</div>
					<ScrollBar orientation="vertical" />
				</ScrollArea>
			</div>
		</ShowcaseCard>
	);
}

function CalendarShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Calendar component configured directly and shared by the date-picker pattern."
			title="Calendar"
		>
			<div className="grid gap-4 lg:grid-cols-[auto_1fr]">
				<div className="rounded-xl border border-border/70">
					<Calendar
						mode="single"
						selected={new Date("2026-04-07")}
						showOutsideDays
					/>
				</div>
				<div className="space-y-3 rounded-xl border border-dashed border-border/70 p-4">
					<p className="font-medium">Why this matters</p>
					<p className="text-sm text-muted-foreground">
						The repository now has a proper shared calendar component instead of
						an inline demo-only date grid. Date picker usage composes this
						component through `Popover + Calendar + Button`.
					</p>
				</div>
			</div>
		</ShowcaseCard>
	);
}

function TypographyShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Command-derived patterns plus table-based composition and reusable typography."
			title="Composite Docs Patterns"
		>
			<div className="space-y-5">
				<div className="rounded-xl border border-border/70 p-4">
					<p className="font-medium">Typography</p>
					<div className="mt-3 space-y-3">
						<h1 className="scroll-m-20 text-3xl font-bold tracking-tight">
							The shadcn typography scale
						</h1>
						<p className="text-base text-muted-foreground">
							Typography is a docs pattern, not a registry primitive. Render it
							with semantic HTML plus the established utility scale.
						</p>
						<blockquote className="border-l-2 pl-4 italic">
							Good UI systems are consistent at the primitive level and flexible
							at the composition level.
						</blockquote>
						<ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
							<li>Headings establish rhythm</li>
							<li>Body copy stays readable</li>
							<li>Inline code uses token-aware surfaces</li>
						</ul>
					</div>
				</div>
				<div className="rounded-xl border border-border/70 p-4">
					<p className="font-medium">Code and inline emphasis</p>
					<p className="mt-2 text-sm text-muted-foreground">
						Use{" "}
						<code className="rounded bg-muted px-1.5 py-0.5">
							pnpm wrangler d1 migrations apply
						</code>{" "}
						for database sync and keep{" "}
						<code className="rounded bg-muted px-1.5 py-0.5">pnpm build</code>{" "}
						in the validation loop.
					</p>
				</div>
			</div>
		</ShowcaseCard>
	);
}

function ChartShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Chart wrapper around Recharts with token-aware colors."
			title="Chart"
		>
			<ChartContainer className="min-h-64 w-full" config={chartConfig}>
				<BarChart accessibilityLayer data={chartData}>
					<CartesianGrid vertical={false} />
					<XAxis
						axisLine={false}
						dataKey="month"
						tickLine={false}
						tickMargin={10}
					/>
					<ChartTooltip content={<ChartTooltipContent />} />
					<Bar
						dataKey="activations"
						fill="var(--color-activations)"
						radius={8}
					/>
				</BarChart>
			</ChartContainer>
		</ShowcaseCard>
	);
}

function DiceInputsShowcase() {
	const [files, setFiles] = useState<File[]>([]);

	return (
		<ShowcaseCard
			className="border-border/70"
			description="Dice UI compound inputs for phone entry and file uploads."
			title="Dice Inputs"
		>
			<div className="space-y-5">
				<div className="space-y-2">
					<Label>Phone Input</Label>
					<PhoneInput
						className="w-full"
						defaultCountry="fr"
						defaultValue="+33612345678"
					>
						<PhoneInputCountrySelect />
						<PhoneInputField />
					</PhoneInput>
				</div>
				<div className="space-y-2">
					<Label>File Upload</Label>
					<FileUpload
						accept="image/*,.pdf,.md"
						maxFiles={3}
						multiple
						onValueChange={setFiles}
						value={files}
					>
						<FileUploadDropzone className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center">
							<Package className="mx-auto size-5 text-muted-foreground" />
							<p className="mt-2 font-medium">Drop files or browse</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Use the compound pieces below to style the queue however you
								want.
							</p>
							<FileUploadTrigger asChild>
								<Button className="mt-4" size="sm" variant="secondary">
									Choose files
								</Button>
							</FileUploadTrigger>
						</FileUploadDropzone>
						<FileUploadList className="space-y-2">
							{files.map((file) => (
								<FileUploadItem key={`${file.name}-${file.size}`} value={file}>
									<FileUploadItemPreview />
									<FileUploadItemMetadata className="min-w-0 flex-1" />
									<FileUploadItemProgress className="w-24" />
									<FileUploadItemDelete asChild>
										<Button size="sm" variant="ghost">
											Remove
										</Button>
									</FileUploadItemDelete>
								</FileUploadItem>
							))}
						</FileUploadList>
						<FileUploadClear asChild>
							<Button size="sm" variant="ghost">
								Clear queue
							</Button>
						</FileUploadClear>
					</FileUpload>
				</div>
			</div>
		</ShowcaseCard>
	);
}

function DiceDataShowcase() {
	const data = useMemo(() => [...diceTableRows], []);
	const table = useReactTable({
		data,
		columns: diceTableColumns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 4,
			},
		},
	});

	return (
		<ShowcaseCard
			className="border-border/70 xl:col-span-2"
			description="Dice UI stat blocks and data-table primitives."
			title="Dice Data"
		>
			<div className="space-y-5">
				<div className="grid gap-3 lg:grid-cols-3">
					<Stat>
						<StatLabel>Weekly activations</StatLabel>
						<StatIndicator color="success" variant="badge">
							<Sparkles className="size-3" />
						</StatIndicator>
						<StatValue>1,284</StatValue>
						<StatTrend trend="up">+18% vs last week</StatTrend>
						<StatDescription>
							Healthy growth across active workspaces.
						</StatDescription>
					</Stat>
					<Stat>
						<StatLabel>Median response time</StatLabel>
						<StatIndicator color="info" variant="icon">
							<CommandIcon className="size-4" />
						</StatIndicator>
						<StatValue>182ms</StatValue>
						<StatSeparator />
						<StatDescription>
							Stable across read-heavy D1 routes.
						</StatDescription>
					</Stat>
					<Stat>
						<StatLabel>Blocked releases</StatLabel>
						<StatIndicator color="warning" variant="badge">
							2
						</StatIndicator>
						<StatValue>2</StatValue>
						<StatTrend trend="neutral">Needs review</StatTrend>
						<StatDescription>
							Use this component for dense KPI summaries.
						</StatDescription>
					</Stat>
				</div>
				<div className="rounded-2xl border border-border/70 p-3">
					<div className="mb-3">
						<p className="font-medium">Dice Data Table</p>
						<p className="text-sm text-muted-foreground">
							Here it is rendered with a plain TanStack table instance inside
							the template shell.
						</p>
					</div>
					<DataTable table={table} />
				</div>
			</div>
		</ShowcaseCard>
	);
}

function DiceInteractionShowcase() {
	const [sortableItems, setSortableItems] = useState([
		{ id: "scope", title: "Scope feature", note: "Define the slice." },
		{ id: "schema", title: "Model data", note: "Shape indexes first." },
		{ id: "ship", title: "Ship", note: "Run checks and deploy." },
	]);
	const [kanbanColumns, setKanbanColumns] =
		useState<Record<string, { id: string; title: string; note: string }[]>>(
			initialKanbanColumns,
		);

	const activeSortableItem = (id: string) =>
		sortableItems.find((item) => item.id === id);

	const findKanbanItem = (id: string) =>
		Object.values(kanbanColumns)
			.flat()
			.find((item) => item.id === id);

	return (
		<ShowcaseCard
			className="border-border/70 xl:col-span-2"
			description="Dice drag-and-drop primitives for single-list sorting and multi-column kanban flows."
			title="Dice Drag and Drop"
		>
			<div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
				<div className="space-y-3 rounded-2xl border border-border/70 p-4">
					<div>
						<p className="font-medium">Sortable</p>
						<p className="text-sm text-muted-foreground">
							Reorder a linear backlog with handles.
						</p>
					</div>
					<Sortable
						getItemValue={(item) => item.id}
						onValueChange={setSortableItems}
						value={sortableItems}
					>
						<SortableContent className="space-y-2">
							{sortableItems.map((item) => (
								<SortableItem
									className="flex items-start gap-3 rounded-xl border border-border/70 bg-background p-3 shadow-sm"
									key={item.id}
									value={item.id}
								>
									<SortableItemHandle className="mt-0.5 text-muted-foreground">
										<Grip className="size-4" />
									</SortableItemHandle>
									<div className="min-w-0 flex-1">
										<p className="font-medium">{item.title}</p>
										<p className="text-sm text-muted-foreground">{item.note}</p>
									</div>
								</SortableItem>
							))}
						</SortableContent>
						<SortableOverlay>
							{({ value }) => {
								const item = activeSortableItem(String(value));
								if (!item) return null;

								return (
									<div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background p-3 shadow-lg">
										<Grip className="mt-0.5 size-4 text-muted-foreground" />
										<div>
											<p className="font-medium">{item.title}</p>
											<p className="text-sm text-muted-foreground">
												{item.note}
											</p>
										</div>
									</div>
								);
							}}
						</SortableOverlay>
					</Sortable>
				</div>
				<div className="space-y-3 rounded-2xl border border-border/70 p-4">
					<div>
						<p className="font-medium">Kanban</p>
						<p className="text-sm text-muted-foreground">
							Columns and cards can both be dragged.
						</p>
					</div>
					<Kanban
						getItemValue={(item) => item.id}
						onValueChange={setKanbanColumns}
						value={kanbanColumns}
					>
						<KanbanBoard className="overflow-x-auto pb-1">
							{Object.entries(kanbanColumns).map(([columnId, items]) => (
								<KanbanColumn
									className="min-h-72 min-w-64"
									key={columnId}
									value={columnId}
								>
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-2">
											<KanbanColumnHandle className="text-muted-foreground">
												<Grip className="size-4" />
											</KanbanColumnHandle>
											<p className="font-medium capitalize">{columnId}</p>
										</div>
										<Badge variant="outline">{items.length}</Badge>
									</div>
									<div className="space-y-2">
										{items.map((item) => (
											<KanbanItem
												className="rounded-xl border border-border/70 bg-background p-3 shadow-sm"
												key={item.id}
												value={item.id}
											>
												<div className="flex items-start gap-2">
													<KanbanItemHandle className="mt-0.5 text-muted-foreground">
														<Grip className="size-4" />
													</KanbanItemHandle>
													<div className="min-w-0 flex-1">
														<p className="font-medium">{item.title}</p>
														<p className="text-sm text-muted-foreground">
															{item.note}
														</p>
													</div>
												</div>
											</KanbanItem>
										))}
									</div>
								</KanbanColumn>
							))}
						</KanbanBoard>
						<KanbanOverlay>
							{({ value, variant }) => {
								if (variant === "column") {
									return (
										<div className="rounded-xl border border-border/70 bg-background px-4 py-3 shadow-lg">
											<p className="font-medium capitalize">{String(value)}</p>
										</div>
									);
								}

								const item = findKanbanItem(String(value));
								if (!item) return null;

								return (
									<div className="rounded-xl border border-border/70 bg-background px-4 py-3 shadow-lg">
										<p className="font-medium">{item.title}</p>
										<p className="text-sm text-muted-foreground">{item.note}</p>
									</div>
								);
							}}
						</KanbanOverlay>
					</Kanban>
				</div>
			</div>
		</ShowcaseCard>
	);
}

function DiceMediaShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70 xl:col-span-2"
			description="Dice media player with custom controls built on media-chrome."
			title="Dice Media Player"
		>
			<div className="space-y-3">
				<MediaPlayer
					autoHide
					className="group relative overflow-hidden rounded-2xl bg-black text-white"
				>
					<MediaPlayerVideo
						className="aspect-video w-full object-cover"
						crossOrigin="anonymous"
						playsInline
						preload="metadata"
						src="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
					/>
					<MediaPlayerLoading className="absolute inset-0 flex items-center justify-center bg-black/35">
						<Spinner className="text-white" />
					</MediaPlayerLoading>
					<MediaPlayerError className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-sm text-white" />
					<MediaPlayerControlsOverlay />
					<MediaPlayerControls className="flex-col items-stretch gap-3">
						<MediaPlayerSeek withTime />
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-1">
								<MediaPlayerPlay />
								<MediaPlayerSeekBackward />
								<MediaPlayerSeekForward />
							</div>
							<div className="flex items-center gap-2">
								<MediaPlayerVolume />
								<MediaPlayerTime />
							</div>
							<div className="flex items-center gap-1">
								<MediaPlayerSettings />
								<MediaPlayerDownload />
								<MediaPlayerFullscreen />
							</div>
						</div>
					</MediaPlayerControls>
				</MediaPlayer>
			</div>
		</ShowcaseCard>
	);
}

function BannerShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Dice UI banner stack for persistent notices and transient top-of-screen alerts."
			title="Banner"
		>
			<div className="space-y-4">
				<Banners maxVisible={2}>
					<BannerShowcaseControls />
				</Banners>
				<div className="rounded-2xl border border-dashed border-border/70 p-4">
					<Banner
						className="rounded-xl border border-border/70"
						variant="success"
					>
						<Check className="size-4 shrink-0" />
						<div className="min-w-0 flex-1">
							<BannerTitle>Success variant</BannerTitle>
							<BannerDescription>
								Banner content can also be mounted inline for static previews.
							</BannerDescription>
						</div>
					</Banner>
				</div>
			</div>
		</ShowcaseCard>
	);
}

function BannerShowcaseControls() {
	const { onBannerAdd, onBannersClear } = useBanners();

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Use banners for deployment, compliance, or billing notices that should
				hold the full width of the viewport.
			</p>
			<div className="flex flex-wrap gap-3">
				<Button
					onClick={() =>
						onBannerAdd({
							variant: "info",
							duration: 4500,
							content: (
								<>
									<CircleAlert className="size-4 shrink-0" />
									<div className="min-w-0 flex-1">
										<BannerTitle>Deployment notice</BannerTitle>
										<BannerDescription>
											Wrangler secrets and D1 migrations should be updated
											together before shipping.
										</BannerDescription>
									</div>
									<BannerActions>
										<Button size="sm" variant="secondary">
											Inspect
										</Button>
										<BannerClose />
									</BannerActions>
								</>
							),
						})
					}
					variant="outline"
				>
					Info banner
				</Button>
				<Button
					onClick={() =>
						onBannerAdd({
							variant: "warning",
							content: (
								<>
									<CircleAlert className="size-4 shrink-0" />
									<div className="min-w-0 flex-1">
										<BannerTitle>Schema change pending</BannerTitle>
										<BannerDescription>
											Run the migration helper before narrowing or deleting live
											fields.
										</BannerDescription>
									</div>
									<BannerClose />
								</>
							),
						})
					}
				>
					Warning banner
				</Button>
				<Button onClick={onBannersClear} variant="ghost">
					Clear banners
				</Button>
			</div>
		</div>
	);
}

function TimelineShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70"
			description="Dice UI timeline for changelogs, onboarding history, and rollout milestones."
			title="Timeline"
		>
			<Timeline activeIndex={1}>
				<TimelineItem>
					<TimelineDot />
					<TimelineConnector />
					<TimelineContent>
						<TimelineHeader>
							<TimelineTime dateTime="2026-04-01">April 1</TimelineTime>
							<TimelineTitle>Bootstrap the workspace</TimelineTitle>
							<TimelineDescription>
								Provision D1, sync Wrangler secrets, and verify auth before
								building domain features.
							</TimelineDescription>
						</TimelineHeader>
					</TimelineContent>
				</TimelineItem>
				<TimelineItem>
					<TimelineDot />
					<TimelineConnector />
					<TimelineContent>
						<TimelineHeader>
							<TimelineTime dateTime="2026-04-04">April 4</TimelineTime>
							<TimelineTitle>Design system expansion</TimelineTitle>
							<TimelineDescription>
								Add the shared shadcn and Dice UI primitives, then render them
								in a single authenticated showcase route.
							</TimelineDescription>
						</TimelineHeader>
					</TimelineContent>
				</TimelineItem>
				<TimelineItem>
					<TimelineDot />
					<TimelineContent>
						<TimelineHeader>
							<TimelineTime dateTime="2026-04-07">April 7</TimelineTime>
							<TimelineTitle>Ship user-facing flows</TimelineTitle>
							<TimelineDescription>
								Move from primitives to actual application surfaces once the
								template boundaries are stable.
							</TimelineDescription>
						</TimelineHeader>
					</TimelineContent>
				</TimelineItem>
			</Timeline>
		</ShowcaseCard>
	);
}

function TourShowcase() {
	const [isOpen, setIsOpen] = useState(false);
	const [step, setStep] = useState(0);

	return (
		<ShowcaseCard
			className="border-border/70"
			description="Dice UI tour for guided walkthroughs with spotlight, step state, and keyboard-safe focus management."
			title="Tour"
		>
			<div className="space-y-4">
				<div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 p-4">
					<div>
						<p className="font-medium">Operator onboarding tour</p>
						<p className="text-sm text-muted-foreground">
							Start a three-step walkthrough anchored to real targets.
						</p>
					</div>
					<Button
						onClick={() => {
							setStep(0);
							setIsOpen(true);
						}}
					>
						Start tour
					</Button>
				</div>
				<div className="grid gap-3 sm:grid-cols-3">
					<Card className="border-border/70 shadow-none" id="tour-target-model">
						<CardHeader>
							<CardTitle className="text-base">Model</CardTitle>
							<CardDescription>
								Define ownership and indexes before you write queries.
							</CardDescription>
						</CardHeader>
					</Card>
					<Card
						className="border-border/70 shadow-none"
						id="tour-target-compose"
					>
						<CardHeader>
							<CardTitle className="text-base">Compose</CardTitle>
							<CardDescription>
								Build with shared primitives instead of one-off UI.
							</CardDescription>
						</CardHeader>
					</Card>
					<Card className="border-border/70 shadow-none" id="tour-target-ship">
						<CardHeader>
							<CardTitle className="text-base">Ship</CardTitle>
							<CardDescription>
								Run lint, typecheck, build, then deploy through Wrangler.
							</CardDescription>
						</CardHeader>
					</Card>
				</div>
			</div>
			<Tour
				onOpenChange={setIsOpen}
				onValueChange={setStep}
				open={isOpen}
				value={step}
			>
				<TourPortal>
					<TourSpotlight />
					<TourSpotlightRing className="rounded-3xl" />
					<TourStep target="#tour-target-model">
						<TourArrow />
						<TourClose className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground" />
						<TourHeader>
							<TourTitle>Start with the data model</TourTitle>
							<TourDescription>
								D1 code quality is downstream of table design. Decide ownership,
								relations, and indexes before touching the UI.
							</TourDescription>
						</TourHeader>
						<TourFooter className="items-center justify-between">
							<TourStepCounter />
							<div className="flex gap-2">
								<TourSkip />
								<TourPrev />
								<TourNext />
							</div>
						</TourFooter>
					</TourStep>
					<TourStep target="#tour-target-compose">
						<TourArrow />
						<TourClose className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground" />
						<TourHeader>
							<TourTitle>Compose from the system</TourTitle>
							<TourDescription>
								Reach for shared primitives first. New UI should inherit tokens,
								interaction patterns, and accessibility defaults.
							</TourDescription>
						</TourHeader>
						<TourFooter className="items-center justify-between">
							<TourStepCounter />
							<div className="flex gap-2">
								<TourSkip />
								<TourPrev />
								<TourNext />
							</div>
						</TourFooter>
					</TourStep>
					<TourStep target="#tour-target-ship">
						<TourArrow />
						<TourClose className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground" />
						<TourHeader>
							<TourTitle>Ship through the verified path</TourTitle>
							<TourDescription>
								Local checks come first. Deployment happens through the
								generated Wrangler worker config, with secrets managed by the
								CLI.
							</TourDescription>
						</TourHeader>
						<TourFooter className="items-center justify-between">
							<TourStepCounter />
							<div className="flex gap-2">
								<TourSkip />
								<TourPrev />
								<TourNext />
							</div>
						</TourFooter>
					</TourStep>
				</TourPortal>
			</Tour>
		</ShowcaseCard>
	);
}

function SidebarShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70 xl:col-span-2"
			description="Sidebar, sheet-style app shell composition, and persistent layout primitives."
			title="Sidebar"
		>
			<div className="overflow-hidden rounded-2xl border border-border/70">
				<SidebarProvider className="h-[360px] min-h-0" defaultOpen>
					<Sidebar className="top-0 h-[360px] min-h-[360px]">
						<SidebarHeader>
							<div className="rounded-2xl border border-sidebar-border bg-sidebar-accent px-3 py-3 text-sidebar-accent-foreground">
								<p className="text-sm font-semibold tracking-tight">
									{PROJECT_NAME}
								</p>
							</div>
						</SidebarHeader>
						<SidebarContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton isActive>
										<User className="size-4" />
										<span>Overview</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton>
										<Settings2 className="size-4" />
										<span>Settings</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarContent>
						<SidebarFooter>
							<div className="rounded-xl border border-border/70 bg-background/80 p-3">
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-3">
										<Avatar className="size-9">
											<AvatarFallback>{PROJECT_INITIALS}</AvatarFallback>
										</Avatar>
										<div>
											<p className="text-sm font-medium">Operator</p>
											<p className="text-xs text-muted-foreground">
												Persistent shell
											</p>
										</div>
									</div>
									<Switch checked />
								</div>
							</div>
						</SidebarFooter>
					</Sidebar>
					<SidebarInset className="min-h-0">
						<div className="flex h-[360px] flex-col bg-background">
							<div className="border-b border-border/70 px-6 py-4">
								<p className="font-medium">Nested content area</p>
								<p className="text-sm text-muted-foreground">
									Use the existing sidebar primitives instead of building a
									second shell.
								</p>
							</div>
							<div className="flex flex-1 items-center justify-center p-6">
								<div className="rounded-2xl border border-dashed border-border/70 px-6 py-8 text-center">
									<p className="font-medium">
										Sidebar is part of the design system
									</p>
									<p className="mt-1 text-sm text-muted-foreground">
										This preview uses the actual sidebar primitives.
									</p>
								</div>
							</div>
						</div>
					</SidebarInset>
				</SidebarProvider>
			</div>
		</ShowcaseCard>
	);
}

function AiElementsShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70 xl:col-span-2"
			description="AI Elements registry components installed into the app and rendered as a reusable chatbot scaffold."
			title="AI Elements"
		>
			<div className="space-y-3">
				<div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
					<Badge variant="secondary">Registry import</Badge>
					<Badge variant="outline">Composite example</Badge>
					<span>
						The chatbot lives in <code>app/components/ai-elements/</code> and
						reuses the shared `ui/` primitives underneath.
					</span>
				</div>
				<div className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
					<div className="min-h-[42rem]">
						<ExampleChatbot />
					</div>
				</div>
			</div>
		</ShowcaseCard>
	);
}

function MarkdownShowcase() {
	return (
		<ShowcaseCard
			className="border-border/70 xl:col-span-2"
			description="Streamdown rendered as a reusable markdown document component rather than only inside chat UI."
			title="Markdown"
		>
			<div className="space-y-3">
				<div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
					<Badge variant="secondary">Streamdown</Badge>
					<Badge variant="outline">Document renderer</Badge>
					<span>
						Use this surface for docs, knowledge pages, and any application area
						that needs polished markdown output.
					</span>
				</div>
				<div className="overflow-hidden rounded-2xl border border-border/70 bg-background/70 p-6">
					<MarkdownRenderer>{markdownShowcaseDocument}</MarkdownRenderer>
				</div>
			</div>
		</ShowcaseCard>
	);
}

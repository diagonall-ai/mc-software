import { Slot } from "@radix-ui/react-slot";
import { PanelLeftIcon } from "lucide-react";
import * as React from "react";

import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "~/components/ui/sheet";
import { useIsMobile } from "~/hooks/use-mobile";
import { cn } from "~/lib/utils";

type SidebarContextValue = {
	isMobile: boolean;
	isOpen: boolean;
	isCollapsed: boolean;
	openMobile: boolean;
	setOpenMobile: (open: boolean) => void;
	toggleSidebar: () => void;
};

const SIDEBAR_WIDTH = "14.25rem";
const SIDEBAR_ICON_WIDTH = "3.75rem";
const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
	const context = React.useContext(SidebarContext);
	if (!context) {
		throw new Error("useSidebar must be used within SidebarProvider.");
	}
	return context;
}

function SidebarProvider({
	defaultOpen = true,
	children,
	className,
}: React.ComponentProps<"div"> & {
	defaultOpen?: boolean;
}) {
	const isMobile = useIsMobile();
	const [isOpen, setIsOpen] = React.useState(defaultOpen);
	const [openMobile, setOpenMobile] = React.useState(false);

	const toggleSidebar = React.useCallback(() => {
		if (isMobile) {
			setOpenMobile((currentOpen) => !currentOpen);
			return;
		}
		setIsOpen((currentOpen) => !currentOpen);
	}, [isMobile]);

	const value = React.useMemo(
		() => ({
			isMobile,
			isOpen,
			isCollapsed: !isMobile && !isOpen,
			openMobile,
			setOpenMobile,
			toggleSidebar,
		}),
		[isMobile, isOpen, openMobile, toggleSidebar],
	);

	return (
		<SidebarContext.Provider value={value}>
			<div
				className={cn("flex w-full bg-muted/30", className)}
				style={
					{
						"--sidebar-width": SIDEBAR_WIDTH,
						"--sidebar-icon-width": SIDEBAR_ICON_WIDTH,
					} as React.CSSProperties
				}
			>
				{children}
			</div>
		</SidebarContext.Provider>
	);
}

function Sidebar({ children, className }: React.ComponentProps<"aside">) {
	const { isMobile, isOpen, openMobile, setOpenMobile } = useSidebar();

	if (isMobile) {
		return (
			<Sheet open={openMobile} onOpenChange={setOpenMobile}>
				<SheetContent
					className="w-[var(--sidebar-width)] border-r bg-card p-0 text-card-foreground [&>button]:hidden"
					showCloseButton={false}
					side="left"
				>
					<SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
					<div className={cn("flex h-full flex-col", className)}>
						{children}
					</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<aside
			className={cn(
				"hidden shrink-0 border-r border-border/70 bg-card/95 transition-[width] duration-200 ease-in-out md:sticky md:top-0 md:flex md:h-screen md:flex-col",
				isOpen ? "w-[var(--sidebar-width)]" : "w-[var(--sidebar-icon-width)]",
				className,
			)}
		>
			{children}
		</aside>
	);
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
	return (
		<main
			className={cn("flex min-h-screen min-w-0 flex-1 flex-col", className)}
			{...props}
		/>
	);
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-col justify-center gap-2 border-b border-border/70 p-2 transition-[padding] duration-200 ease-in-out",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-1 flex-col gap-2.5 p-2 transition-[padding] duration-200 ease-in-out",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"border-t border-border/70 p-2 transition-[padding] duration-200 ease-in-out",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarTrigger({
	className,
	onClick,
	...props
}: React.ComponentProps<typeof Button>) {
	const { toggleSidebar } = useSidebar();

	return (
		<Button
			className={cn("size-9 rounded-full border-0 shadow-none", className)}
			onClick={(event) => {
				onClick?.(event);
				toggleSidebar();
			}}
			size="icon"
			variant="ghost"
			{...props}
		>
			<PanelLeftIcon className="size-4" />
			<span className="sr-only">Toggle navigation</span>
		</Button>
	);
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"nav">) {
	return <nav className={cn("flex flex-col gap-1", className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("flex", className)} {...props} />;
}

function SidebarMenuButton({
	asChild = false,
	isActive = false,
	className,
	children,
	...props
}: React.ComponentProps<"button"> & {
	asChild?: boolean;
	isActive?: boolean;
}) {
	const { isCollapsed, isMobile } = useSidebar();
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			className={cn(
				"flex h-9 w-full items-center gap-2 overflow-hidden rounded-lg px-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground focus:outline-hidden focus:ring-2 focus:ring-ring",
				isActive && "bg-accent text-accent-foreground shadow-sm",
				isCollapsed && !isMobile && "justify-center px-0",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
}

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
};

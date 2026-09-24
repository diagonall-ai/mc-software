import {
	ChevronLeftIcon,
	ChevronRightIcon,
	MoreHorizontalIcon,
} from "lucide-react";
import type * as React from "react";

import { Button, buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			aria-label="pagination"
			data-slot="pagination"
			className={cn("mx-auto flex w-full justify-center", className)}
			{...props}
		/>
	);
}

function PaginationContent({
	className,
	...props
}: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="pagination-content"
			className={cn("flex flex-row items-center gap-1", className)}
			{...props}
		/>
	);
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
	return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
	isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
	React.ComponentProps<"a">;

function PaginationLink({
	className,
	isActive,
	size = "icon",
	...props
}: PaginationLinkProps) {
	return (
		<a
			aria-current={isActive ? "page" : undefined}
			data-slot="pagination-link"
			data-active={isActive}
			className={cn(
				buttonVariants({
					variant: isActive ? "outline" : "ghost",
					size,
				}),
				className,
			)}
			{...props}
		/>
	);
}

type PaginationButtonProps = React.ComponentProps<typeof Button>;

function PaginationButton({
	className,
	size = "sm",
	variant = "outline",
	...props
}: PaginationButtonProps) {
	return (
		<Button
			data-slot="pagination-button"
			size={size}
			variant={variant}
			className={cn("h-8", className)}
			{...props}
		/>
	);
}

type PaginationDirectionButtonProps = Omit<
	PaginationButtonProps,
	"children"
> & {
	children?: React.ReactNode;
};

function PaginationPreviousButton({
	children = "Précédent",
	className,
	...props
}: PaginationDirectionButtonProps) {
	return (
		<PaginationButton
			aria-label="Page précédente"
			className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
			{...props}
		>
			<ChevronLeftIcon />
			<span>{children}</span>
		</PaginationButton>
	);
}

function PaginationNextButton({
	children = "Suivant",
	className,
	...props
}: PaginationDirectionButtonProps) {
	return (
		<PaginationButton
			aria-label="Page suivante"
			className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
			{...props}
		>
			<span>{children}</span>
			<ChevronRightIcon />
		</PaginationButton>
	);
}

type PaginationControl =
	| {
			type: "ellipsis";
			key: string;
	  }
	| {
			type: "page";
			page: number;
	  };

type PaginationControlsProps = Omit<
	React.ComponentProps<typeof Pagination>,
	"children"
> & {
	hasNextPage?: boolean;
	hasPreviousPage?: boolean;
	nextLabel?: React.ReactNode;
	onNext?: () => void;
	onPageChange: (page: number) => void;
	onPrevious?: () => void;
	page: number;
	previousLabel?: React.ReactNode;
	totalPages: number;
};

function PaginationControls({
	className,
	hasNextPage,
	hasPreviousPage,
	nextLabel,
	onNext,
	onPageChange,
	onPrevious,
	page,
	previousLabel,
	totalPages,
	...props
}: PaginationControlsProps) {
	const safeTotalPages = Math.max(1, totalPages);
	const safePage = Math.min(Math.max(0, page), safeTotalPages - 1);
	const canPrevious = hasPreviousPage ?? safePage > 0;
	const canNext = hasNextPage ?? safePage < safeTotalPages - 1;
	const pageControls = getPaginationControls(safePage, safeTotalPages);

	function goToPreviousPage() {
		if (!canPrevious) return;
		if (onPrevious) {
			onPrevious();
			return;
		}
		onPageChange(safePage - 1);
	}

	function goToNextPage() {
		if (!canNext) return;
		if (onNext) {
			onNext();
			return;
		}
		onPageChange(safePage + 1);
	}

	return (
		<Pagination className={cn("w-auto justify-start", className)} {...props}>
			<PaginationContent>
				<PaginationItem>
					<PaginationPreviousButton
						disabled={!canPrevious}
						onClick={goToPreviousPage}
						type="button"
					>
						{previousLabel}
					</PaginationPreviousButton>
				</PaginationItem>
				{pageControls.map((control) => {
					if (control.type === "ellipsis") {
						return (
							<PaginationItem key={control.key}>
								<PaginationEllipsis className="size-8" />
							</PaginationItem>
						);
					}

					const isCurrentPage = control.page === safePage;
					const pageNumber = control.page + 1;
					return (
						<PaginationItem key={control.page}>
							<PaginationButton
								aria-current={isCurrentPage ? "page" : undefined}
								aria-label={`Page ${pageNumber}`}
								onClick={() => onPageChange(control.page)}
								size="icon-sm"
								type="button"
								variant={isCurrentPage ? "default" : "outline"}
							>
								{pageNumber}
							</PaginationButton>
						</PaginationItem>
					);
				})}
				<PaginationItem>
					<PaginationNextButton
						disabled={!canNext}
						onClick={goToNextPage}
						type="button"
					>
						{nextLabel}
					</PaginationNextButton>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}

function getPaginationControls(
	currentPage: number,
	totalPages: number,
): PaginationControl[] {
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, page) => ({
			page,
			type: "page" as const,
		}));
	}

	const pages = new Set<number>([
		0,
		currentPage - 1,
		currentPage,
		currentPage + 1,
		totalPages - 1,
	]);
	if (currentPage <= 2) {
		pages.add(1);
		pages.add(2);
		pages.add(3);
	}
	if (currentPage >= totalPages - 3) {
		pages.add(totalPages - 4);
		pages.add(totalPages - 3);
		pages.add(totalPages - 2);
	}

	const sortedPages = [...pages]
		.filter((page) => page >= 0 && page < totalPages)
		.sort((left, right) => left - right);
	const controls: PaginationControl[] = [];
	for (const page of sortedPages) {
		const previous = controls.at(-1);
		if (previous?.type === "page" && page - previous.page > 1) {
			controls.push({ key: `${previous.page}-${page}`, type: "ellipsis" });
		}
		controls.push({ page, type: "page" });
	}
	return controls;
}

function PaginationPrevious({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to previous page"
			size="default"
			className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
			{...props}
		>
			<ChevronLeftIcon />
			<span className="hidden sm:block">Previous</span>
		</PaginationLink>
	);
}

function PaginationNext({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to next page"
			size="default"
			className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
			{...props}
		>
			<span className="hidden sm:block">Next</span>
			<ChevronRightIcon />
		</PaginationLink>
	);
}

function PaginationEllipsis({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			aria-hidden
			data-slot="pagination-ellipsis"
			className={cn("flex size-9 items-center justify-center", className)}
			{...props}
		>
			<MoreHorizontalIcon className="size-4" />
			<span className="sr-only">More pages</span>
		</span>
	);
}

export {
	Pagination,
	PaginationButton,
	PaginationContent,
	PaginationControls,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationNextButton,
	PaginationPrevious,
	PaginationPreviousButton,
};

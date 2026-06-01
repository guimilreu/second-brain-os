"use client";

import {
	CheckSquare,
	ShoppingBag,
	Home,
	Landmark,
	NotebookPen,
	LogOut,
	Menu,
	Settings,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { listContainer, listItem, springDrawer, springSnap, springUI } from "@/lib/motion/spring";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils/cn";

const NAV_SECTIONS = [
	{
		label: "Hoje",
		items: [
			{ href: "/", label: "Hoje", icon: Home },
			{ href: "/notes", label: "Anotações", icon: NotebookPen },
		],
	},
	{
		label: "Operação",
		items: [
			{ href: "/finance", label: "Financeiro", icon: Landmark },
			{ href: "/tasks", label: "Tarefas", icon: CheckSquare },
		],
	},
	{
		label: "Planejamento",
		items: [{ href: "/wishlist", label: "Compras", icon: ShoppingBag }],
	},
	{
		label: "Sistema",
		items: [{ href: "/settings", label: "Configurações", icon: Settings }],
	},
] as const;

type SidebarProps = {
	userName: string;
};

function SidebarContent({ userName }: SidebarProps) {
	const pathname = usePathname();
	const router = useRouter();
	const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

	async function handleLogout() {
		await fetch("/api/auth/logout", { method: "POST" });
		toast.success("Sessão encerrada.");
		router.push("/login");
		router.refresh();
	}

	return (
		<div className="flex h-full flex-col px-5 py-6">
			<motion.div whileHover={{ x: 1 }} whileTap={{ scale: 0.995 }} transition={springUI}>
				<Link
					href="/"
					onClick={() => setSidebarOpen(false)}
					className="group flex items-center gap-3 rounded-3xl px-2 py-2 text-sidebar-foreground"
				>
					<span className="grid h-10 w-10 place-items-center rounded-2xl border border-sidebar-border bg-paper text-sm font-semibold tracking-tight shadow-paper-sm transition-colors group-hover:border-brand/50">
						GM
					</span>
					<span>
						<span className="block text-[0.72rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
							Second Brain
						</span>
						<span className="block text-sm font-semibold tracking-tight">OS pessoal</span>
					</span>
				</Link>
			</motion.div>

			<motion.nav
				variants={listContainer}
				initial="hidden"
				animate="visible"
				className="mt-10 space-y-7"
			>
				{NAV_SECTIONS.map((section) => (
					<motion.div key={section.label} variants={listItem} className="space-y-2">
						<div className="flex items-center gap-3 px-3">
							<p className="text-[0.66rem] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
								{section.label}
							</p>
							<span className="h-px flex-1 bg-sidebar-border" />
						</div>

						<div className="space-y-1.5">
							{section.items.map((item) => {
								const isActive =
									item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
								const Icon = item.icon;

								return (
									<Link
										key={item.href}
										href={item.href}
										onClick={() => setSidebarOpen(false)}
										className={cn(
											"group flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium transition-[background-color,color,transform] duration-200",
											isActive
												? "border border-brand/25 bg-brand/15 text-sidebar-foreground shadow-paper-sm"
												: "text-muted-foreground hover:bg-paper/70 hover:text-foreground",
										)}
									>
										<span className="flex items-center gap-3">
											<span
												className={cn(
													"grid h-8 w-8 place-items-center rounded-xl border border-transparent transition-colors",
													isActive ? "border-brand/35 bg-brand text-primary-foreground" : "bg-transparent",
												)}
											>
												<Icon className="h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105" />
											</span>
											{item.label}
										</span>
										<span
											className={cn(
												"h-1.5 w-1.5 rounded-full bg-brand transition-opacity",
												isActive ? "opacity-100" : "opacity-0",
											)}
										/>
									</Link>
								);
							})}
						</div>
					</motion.div>
				))}
			</motion.nav>

			<div className="mt-auto space-y-3 rounded-3xl border border-sidebar-border bg-paper/55 p-3">
				<div className="min-w-0 px-2">
					<p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
					<p className="text-xs text-muted-foreground">Sessão ativa</p>
				</div>
				<div className="flex items-center gap-3">
					<ThemeToggle />
					<motion.button
						type="button"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						transition={springSnap}
						onClick={handleLogout}
						className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-sidebar-border bg-background/40 px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-danger/40 hover:bg-danger/5 hover:text-danger"
					>
						<LogOut className="h-4 w-4" />
						Sair
					</motion.button>
				</div>
			</div>
		</div>
	);
}

export function Sidebar({ userName }: SidebarProps) {
	const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);
	const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

	return (
		<>
			<aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-sidebar-border bg-sidebar/88 backdrop-blur-xl lg:block">
				<SidebarContent userName={userName} />
			</aside>

			<motion.button
				type="button"
				whileHover={{ scale: 1.04 }}
				whileTap={{ scale: 0.96 }}
				transition={springSnap}
				onClick={() => setSidebarOpen(true)}
				className="fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card shadow-paper-sm lg:hidden"
				aria-label="Abrir menu"
			>
				<Menu className="h-5 w-5" />
			</motion.button>

			<AnimatePresence>
				{isSidebarOpen ? (
					<div className="fixed inset-0 z-50 lg:hidden">
						<motion.button
							type="button"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={springSnap}
							className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
							onClick={() => setSidebarOpen(false)}
							aria-label="Fechar menu"
						/>
						<motion.aside
							initial={{ x: "-104%" }}
							animate={{ x: 0 }}
							exit={{ x: "-104%" }}
							transition={springDrawer}
							className="absolute inset-y-0 left-0 flex w-[86vw] max-w-72 flex-col border-r border-border bg-sidebar shadow-paper"
						>
							<motion.button
								type="button"
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ ...springSnap, delay: 0.08 }}
								onClick={() => setSidebarOpen(false)}
								className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-paper-sm"
								aria-label="Fechar menu"
							>
								<X className="h-5 w-5" />
							</motion.button>
							<SidebarContent userName={userName} />
						</motion.aside>
					</div>
				) : null}
			</AnimatePresence>
		</>
	);
}

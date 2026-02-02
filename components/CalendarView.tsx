import {
	addDays,
	addMonths,
	addWeeks,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	isToday,
	isWithinInterval,
	parseISO,
	startOfMonth,
	startOfWeek,
	subMonths,
	subWeeks,
} from "date-fns";
import { es } from "date-fns/locale";
import {
	Calendar as CalendarIcon,
	ChevronLeft,
	ChevronRight,
	Clock,
	Plus,
	Trash2,
	X,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
	id: string;
	title: string;
	startDate: string; // ISO DateTime
	endDate: string; // ISO DateTime
	color: string; // hex
	description?: string;
};

type CalendarViewProps = {
	data: {
		entries: Record<string, any>;
		events?: CalendarEvent[];
	};
	onDateSelect?: (date: Date) => void;
	onEventsUpdate?: (events: CalendarEvent[]) => void;
};

const EVENT_COLORS = [
	{ name: "Blue", value: "#3b82f6" },
	{ name: "Green", value: "#22c55e" },
	{ name: "Red", value: "#ef4444" },
	{ name: "Purple", value: "#a855f7" },
	{ name: "Orange", value: "#f97316" },
	{ name: "Pink", value: "#ec4899" },
];

export function CalendarView({
	data,
	onDateSelect,
	onEventsUpdate,
}: CalendarViewProps) {
	const [currentDate, setCurrentDate] = React.useState(new Date());
	const [viewType, setViewType] = React.useState<"month" | "week">("month");

	const [isEventModalOpen, setIsEventModalOpen] = React.useState(false);

	// Event Form State
	const [eventTitle, setEventTitle] = React.useState("");
	const [eventStartDate, setEventStartDate] = React.useState("");
	const [eventEndDate, setEventEndDate] = React.useState("");
	const [eventColor, setEventColor] = React.useState(EVENT_COLORS[0].value);

	// --- NAVIGATION HELPERS ---
	const handlePrev = () => {
		if (viewType === "month") setCurrentDate(subMonths(currentDate, 1));
		else setCurrentDate(subWeeks(currentDate, 1));
	};

	const handleNext = () => {
		if (viewType === "month") setCurrentDate(addMonths(currentDate, 1));
		else setCurrentDate(addWeeks(currentDate, 1));
	};

	// --- DATA HELPERS ---
	const getDayTasks = (date: Date) => {
		const key = format(date, "yyyy-MM-dd");
		const entry = data.entries?.[key];
		if (!entry || !entry.tasks) return [];
		return Object.entries(entry.tasks).map(([name, isDone]) => ({
			name,
			isDone,
		}));
	};

	const getDayEvents = (date: Date) => {
		const events = data.events || [];
		return events.filter((event) => {
			const start = parseISO(event.startDate);
			const end = parseISO(event.endDate);
			const checkDate = new Date(date);
			checkDate.setHours(0, 0, 0, 0);
			const normStart = new Date(start);
			normStart.setHours(0, 0, 0, 0);
			const normEnd = new Date(end);
			normEnd.setHours(23, 59, 59, 999);
			return isWithinInterval(checkDate, { start: normStart, end: normEnd });
		});
	};

	// --- EVENT CRUD ---
	const handleCreateEvent = (e: React.FormEvent) => {
		e.preventDefault();
		if (!eventTitle || !eventStartDate || !eventEndDate) {
			toast.error("Rellena todos los campos");
			return;
		}

		const newEvent: CalendarEvent = {
			id: crypto.randomUUID(),
			title: eventTitle,
			startDate: eventStartDate,
			endDate: eventEndDate,
			color: eventColor,
		};

		const currentEvents = data.events || [];
		onEventsUpdate?.([...currentEvents, newEvent]);
		toast.success("Evento creado");
		setIsEventModalOpen(false);
		resetForm();
	};

	const handleDeleteEvent = (eventId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		if (confirm("¿Borrar este evento?")) {
			const currentEvents = data.events || [];
			onEventsUpdate?.(currentEvents.filter((ev) => ev.id !== eventId));
			toast.success("Evento eliminado");
		}
	};

	const resetForm = () => {
		setEventTitle("");
		// Default to now + 1h
		const now = new Date();
		setEventStartDate(format(now, "yyyy-MM-dd'T'HH:mm"));
		setEventEndDate(
			format(new Date(now.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
		);
		setEventColor(EVENT_COLORS[0].value);
	};

	const openEventModal = (date?: Date, hour?: number) => {
		const targetDate = date || new Date();
		if (hour !== undefined) targetDate.setHours(hour, 0, 0, 0);

		const startStr = format(targetDate, "yyyy-MM-dd'T'HH:mm");
		const endStr = format(
			new Date(targetDate.getTime() + 60 * 60 * 1000),
			"yyyy-MM-dd'T'HH:mm",
		);

		setEventStartDate(startStr);
		setEventEndDate(endStr);
		setIsEventModalOpen(true);
	};

	// --- RENDERERS ---
	const renderMonthView = () => {
		const monthStart = startOfMonth(currentDate);
		const monthEnd = endOfMonth(monthStart);
		const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
		const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
		const days = eachDayOfInterval({ start: startDate, end: endDate });

		return (
			<div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
				{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
					<div
						key={day}
						className="bg-muted/50 p-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
					>
						{day}
					</div>
				))}
				{days.map((day) => {
					const isCurrentMonth = isSameMonth(day, monthStart);
					return (
						<div
							key={day.toISOString()}
							className={cn(
								"min-h-[120px] bg-card p-1.5 flex flex-col gap-1 transition-colors hover:bg-muted/30 cursor-pointer relative group",
								!isCurrentMonth && "bg-muted/10 text-muted-foreground/50",
								isToday(day) && "bg-primary/5",
							)}
							onClick={() => onDateSelect?.(day)}
						>
							<div className="flex justify-between items-start mb-1">
								<span
									className={cn(
										"text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors",
										isToday(day)
											? "bg-primary text-primary-foreground"
											: "text-muted-foreground",
									)}
								>
									{format(day, "d")}
								</span>
								<div className="opacity-0 group-hover:opacity-100 transition-opacity">
									<Button
										variant="ghost"
										size="icon"
										className="h-5 w-5"
										onClick={(e) => {
											e.stopPropagation();
											openEventModal(day);
										}}
									>
										<Plus className="h-3 w-3" />
									</Button>
								</div>
							</div>
							<div className="flex flex-col gap-0.5">
								{getDayEvents(day).map((event) => (
									<div
										key={event.id}
										className="text-[10px] px-1.5 py-0.5 rounded-sm text-white truncate font-medium flex justify-between items-center group/event"
										style={{ backgroundColor: event.color }}
									>
										<span className="truncate">{event.title}</span>
										<button
											onClick={(e) => handleDeleteEvent(event.id, e)}
											className="opacity-0 group-hover/event:opacity-100 hover:text-red-200"
										>
											<X size={10} />
										</button>
									</div>
								))}
							</div>
							{/* Tasks Preview */}
							<div className="flex flex-col gap-0.5 mt-auto">
								{getDayTasks(day)
									.slice(0, 3)
									.map((task: any, i) => (
										<div
											key={i}
											className={cn(
												"text-[9px] truncate px-1 flex items-center gap-1 opacity-80",
												task.isDone
													? "text-muted-foreground line-through"
													: "text-foreground",
											)}
										>
											<div
												className={cn(
													"w-1 h-1 rounded-full flex-shrink-0",
													task.isDone ? "bg-muted-foreground" : "bg-primary",
												)}
											/>
											<span className="truncate">{task.name}</span>
										</div>
									))}
							</div>
						</div>
					);
				})}
			</div>
		);
	};

	const renderWeekView = () => {
		const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
		const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
		const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
		const hours = Array.from({ length: 24 }, (_, i) => i);

		return (
			<div className="border rounded-lg bg-card overflow-hidden flex flex-col h-[600px]">
				{/* Week Header */}
				<div className="grid grid-cols-[50px_repeat(7,1fr)] border-b bg-muted/30">
					<div className="p-2 border-r" />
					{days.map((day) => (
						<div
							key={day.toISOString()}
							className={cn(
								"p-2 text-center border-r last:border-r-0",
								isToday(day) && "bg-primary/10",
							)}
						>
							<div className="text-xs text-muted-foreground font-medium uppercase">
								{format(day, "EEE", { locale: es })}
							</div>
							<div
								className={cn(
									"text-sm font-bold w-7 h-7 mx-auto flex items-center justify-center rounded-full mt-1",
									isToday(day) && "bg-primary text-primary-foreground",
								)}
							>
								{format(day, "d")}
							</div>
						</div>
					))}
				</div>

				{/* Time Grid */}
				<div className="overflow-y-auto flex-1 relative">
					<div className="grid grid-cols-[50px_repeat(7,1fr)] relative min-h-[1440px]">
						{/* Hour Labels */}
						<div className="border-r bg-muted/10">
							{hours.map((hour) => (
								<div
									key={hour}
									className="h-[60px] text-[10px] text-muted-foreground text-right pr-2 pt-1 border-b border-dashed"
								>
									{hour}:00
								</div>
							))}
						</div>

						{/* Day Columns */}
						{days.map((day) => (
							<div
								key={day.toISOString()}
								className={cn(
									"border-r last:border-r-0 relative group",
									isToday(day) && "bg-primary/5",
								)}
							>
								{/* Grid Lines */}
								{hours.map((hour) => (
									<div
										key={hour}
										className="h-[60px] border-b border-dashed border-muted/50 hover:bg-muted/20 cursor-pointer"
										onClick={() => openEventModal(day, hour)}
									/>
								))}

								{/* Render Events */}
								{getDayEvents(day).map((event) => {
									const start = parseISO(event.startDate);
									const end = parseISO(event.endDate);

									// Calculate position
									// If event spans multiple days, we need complex logic.
									// For MVP, we clamp to current day 0-24h
									const dayStart = new Date(day);
									dayStart.setHours(0, 0, 0, 0);
									const dayEnd = new Date(day);
									dayEnd.setHours(23, 59, 59, 999);

									// Skip if event doesn't overlap this day
									if (
										!isWithinInterval(dayStart, { start, end }) &&
										!isWithinInterval(dayEnd, { start, end }) &&
										!isWithinInterval(start, { start: dayStart, end: dayEnd })
									)
										return null;

									// Calculate top and height
									const effectiveStart = start < dayStart ? dayStart : start;
									const effectiveEnd = end > dayEnd ? dayEnd : end;

									const startMinutes =
										effectiveStart.getHours() * 60 +
										effectiveStart.getMinutes();
									const endMinutes =
										effectiveEnd.getHours() * 60 + effectiveEnd.getMinutes();
									const duration = endMinutes - startMinutes;

									return (
										<div
											key={event.id}
											className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[10px] text-white overflow-hidden shadow-sm hover:z-10 group/event transition-all hover:scale-[1.02]"
											style={{
												top: `${(startMinutes / 1440) * 100}%`,
												height: `${(duration / 1440) * 100}%`,
												backgroundColor: event.color,
												minHeight: "20px",
											}}
											title={`${event.title} (${format(start, "HH:mm")} - ${format(end, "HH:mm")})`}
										>
											<div className="font-semibold truncate">
												{event.title}
											</div>
											<div className="text-[9px] opacity-90 truncate">
												{format(start, "HH:mm")} - {format(end, "HH:mm")}
											</div>
											<button
												onClick={(e) => handleDeleteEvent(event.id, e)}
												className="absolute top-0.5 right-0.5 opacity-0 group-hover/event:opacity-100 hover:text-red-200"
											>
												<X size={10} />
											</button>
										</div>
									);
								})}
							</div>
						))}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-4 animate-in fade-in duration-300">
			{/* HEADER */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<h2 className="text-xl font-bold capitalize flex items-center gap-2 w-48">
						{viewType === "month"
							? format(currentDate, "MMMM yyyy", { locale: es })
							: `Semana ${format(currentDate, "w")}, ${format(currentDate, "yyyy")}`}
					</h2>
					<div className="flex bg-muted rounded-lg p-1">
						<button
							onClick={() => setViewType("month")}
							className={cn(
								"px-3 py-1 text-xs font-medium rounded-md transition-all",
								viewType === "month"
									? "bg-background shadow-sm text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							Mes
						</button>
						<button
							onClick={() => setViewType("week")}
							className={cn(
								"px-3 py-1 text-xs font-medium rounded-md transition-all",
								viewType === "week"
									? "bg-background shadow-sm text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							Semana
						</button>
					</div>
				</div>

				<div className="flex gap-2 items-center">
					<Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
						<DialogTrigger asChild>
							<Button size="sm" variant="outline" onClick={() => resetForm()}>
								<Plus className="h-4 w-4 mr-2" /> Evento
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Nuevo Evento</DialogTitle>
							</DialogHeader>
							<form onSubmit={handleCreateEvent} className="space-y-4 pt-4">
								<div className="space-y-1">
									<label className="text-xs font-medium text-muted-foreground">
										Título
									</label>
									<input
										autoFocus
										className="w-full p-2 border rounded-md bg-background text-sm"
										placeholder="Ej: Viaje a Madrid"
										value={eventTitle}
										onChange={(e) => setEventTitle(e.target.value)}
									/>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-1">
										<label className="text-xs font-medium text-muted-foreground">
											Inicio
										</label>
										<input
											type="datetime-local"
											className="w-full p-2 border rounded-md bg-background text-sm"
											value={eventStartDate}
											onChange={(e) => setEventStartDate(e.target.value)}
										/>
									</div>
									<div className="space-y-1">
										<label className="text-xs font-medium text-muted-foreground">
											Fin
										</label>
										<input
											type="datetime-local"
											className="w-full p-2 border rounded-md bg-background text-sm"
											value={eventEndDate}
											onChange={(e) => setEventEndDate(e.target.value)}
										/>
									</div>
								</div>
								<div className="space-y-2">
									<label className="text-xs font-medium text-muted-foreground">
										Color
									</label>
									<div className="flex gap-2">
										{EVENT_COLORS.map((c) => (
											<button
												key={c.value}
												type="button"
												className={cn(
													"w-6 h-6 rounded-full transition-transform hover:scale-110",
													eventColor === c.value
														? "ring-2 ring-offset-2 ring-foreground"
														: "",
												)}
												style={{ backgroundColor: c.value }}
												onClick={() => setEventColor(c.value)}
												title={c.name}
											/>
										))}
									</div>
								</div>
								<div className="flex justify-end gap-2 pt-2">
									<Button type="submit">Guardar</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>

					<div className="flex gap-1 bg-muted rounded-md p-0.5">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={handlePrev}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={handleNext}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			{viewType === "month" ? renderMonthView() : renderWeekView()}
		</div>
	);
}

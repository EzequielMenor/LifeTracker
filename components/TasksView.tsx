import { addDays, format, isBefore, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, Calendar as CalendarIcon, Check, Circle, Clock, List, Plus, Scroll, Trash2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { BossWidget } from '@/components/BossWidget';
import { type CalendarEvent, CalendarView } from '@/components/CalendarView';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Boss, DB, Task } from '@/lib/types';
import { cn } from '@/lib/utils';

type TasksViewProps = {
	data: DB;
	onUpdate: (newData: DB) => void;
	onEventsUpdate?: (events: CalendarEvent[]) => void;
	onNavigateDate?: (date: Date) => void;
	onGainXP?: (amount: number, reason: string, dataOverride?: DB, attribute?: any) => void;
};

export function TasksView({ data, onUpdate, onNavigateDate, onEventsUpdate, onGainXP }: TasksViewProps) {
	// --- STATE ---
	const [newTask, setNewTask] = React.useState('');
	const [newTaskDate, setNewTaskDate] = React.useState<Date | null>(new Date());
	const [selectedQuestId, setSelectedQuestId] = React.useState<string>('');
	const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
	const [viewMode, setViewMode] = React.useState<'list' | 'calendar'>('list');

	// --- DATA PROCESSING ---
	const taskGroups = React.useMemo(() => {
		const groups = {
			inbox: [] as any[],
			overdue: [] as any[],
			today: [] as any[],
			upcoming: [] as any[],
			completed: [] as any[],
		};

		const todayDate = new Date();
		todayDate.setHours(0, 0, 0, 0);

		if (!data.entries) return groups;

		Object.entries(data.entries).forEach(([dateStr, entry]: [string, any]) => {
			if (!entry.tasks) return;

			let isEntryToday = false;
			let isEntryPast = false;
			const isInbox = dateStr === 'inbox';

			if (!isInbox) {
				const entryDate = parseISO(dateStr);
				// Check for invalid date to prevent crash
				if (isNaN(entryDate.getTime())) return;
				isEntryToday = isSameDay(entryDate, todayDate);
				isEntryPast = isBefore(entryDate, todayDate) && !isEntryToday;
			}

			// Handle both boolean (old) and Task object (new)
			Object.entries(entry.tasks).forEach(([key, value]: [string, any]) => {
				const isTaskObject = typeof value === 'object' && value !== null;
				const taskName = isTaskObject ? value.name : key;
				const isDone = isTaskObject ? value.completed : value;
				const questId = isTaskObject ? value.questId : undefined;
				const taskId = key;

				const taskItem = {
					date: dateStr,
					id: taskId,
					name: taskName,
					isDone,
					questId,
				};

				if (isDone) {
					if (isEntryToday) groups.today.push(taskItem);
					else groups.completed.push(taskItem);
				} else {
					if (isInbox) groups.inbox.push(taskItem);
					else if (isEntryPast) groups.overdue.push(taskItem);
					else if (isEntryToday) groups.today.push(taskItem);
					else groups.upcoming.push(taskItem);
				}
			});
		});

		// Sort groups
		groups.overdue.sort((a, b) => a.date.localeCompare(b.date));
		groups.upcoming.sort((a, b) => a.date.localeCompare(b.date));

		return groups;
	}, [data]);

	// --- BOSS LOGIC ---
	const handleBossUpdate = (updatedBosses: Boss[]) => {
		const newData = { ...data, bosses: updatedBosses };
		onUpdate(newData);
	};

	const handleBossGainXP = (amount: number, reason: string) => {
		onGainXP?.(amount, reason);
	};

	// --- ACTIONS ---
	const handleCreateTask = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTask.trim()) return;

		const targetDateKey = newTaskDate ? format(newTaskDate, 'yyyy-MM-dd') : 'inbox';
		const targetEntry = data.entries?.[targetDateKey] || {
			habits: {},
			metrics: {},
			tasks: {},
			review: {},
		};

		const taskId = crypto.randomUUID();
		const taskObject: Task = {
			name: newTask.trim(),
			completed: false,
			questId: selectedQuestId || undefined,
			createdAt: new Date().toISOString(),
		};

		const newTargetTasks = {
			...targetEntry.tasks,
			[taskId]: taskObject,
		};

		const newData = {
			...data,
			entries: {
				...data.entries,
				[targetDateKey]: { ...targetEntry, tasks: newTargetTasks },
			},
		};

		onUpdate(newData);
		setNewTask('');
		setSelectedQuestId('');
		toast.success(newTaskDate ? `Tarea añadida para ${format(newTaskDate, "d 'de' MMMM", { locale: es })}` : 'Tarea añadida al Inbox');
	};

	const handleToggleTask = (date: string, taskId: string) => {
		const entry = data.entries?.[date];
		if (!entry) return;

		const taskValue = entry.tasks[taskId];
		const isTaskObject = typeof taskValue === 'object';

		// If old format (boolean), first migrate it implicitly by creating object
		let newTaskObj: Task;
		if (isTaskObject) {
			newTaskObj = { ...taskValue, completed: !taskValue.completed };
		} else {
			newTaskObj = { name: taskId, completed: !taskValue };
		}

		const newEntry = {
			...entry,
			tasks: { ...entry.tasks, [taskId]: newTaskObj },
		};

		const newData = {
			...data,
			entries: { ...data.entries, [date]: newEntry },
		};

		onUpdate(newData);

		if (newTaskObj.completed) {
			onGainXP?.(15, `Tarea Planificada: ${newTaskObj.name}`, newData);
			toast.success('+15 XP');
		} else {
			onGainXP?.(-15, `Tarea Planificada cancelada: ${newTaskObj.name}`, newData);
			toast.info('Corrección: -15 XP');
		}
	};

	const handleDeleteTask = (date: string, taskId: string) => {
		if (!confirm('¿Borrar tarea definitivamente?')) return;
		const entry = data.entries?.[date];
		const newTasks = { ...entry.tasks };
		delete newTasks[taskId];

		onUpdate({
			...data,
			entries: { ...data.entries, [date]: { ...entry, tasks: newTasks } },
		});
		toast.success('Tarea eliminada');
	};

	const handleMoveToToday = (date: string, taskId: string) => {
		const todayKey = format(new Date(), 'yyyy-MM-dd');

		// 1. Remove from old date
		const oldEntry = data.entries?.[date];
		const taskValue = oldEntry.tasks[taskId];
		const newOldTasks = { ...oldEntry.tasks };
		delete newOldTasks[taskId];

		// 2. Add to today
		const todayEntry = data.entries?.[todayKey] || {
			habits: {},
			metrics: {},
			tasks: {},
			review: {},
		};

		// Ensure it's an object when moving
		const taskObject = typeof taskValue === 'object' ? taskValue : { name: taskId, completed: false };
		const newTodayTasks = { ...todayEntry.tasks, [taskId]: { ...taskObject, completed: false } };

		const newData = {
			...data,
			entries: {
				...data.entries,
				[date]: { ...oldEntry, tasks: newOldTasks },
				[todayKey]: { ...todayEntry, tasks: newTodayTasks },
			},
		};

		onUpdate(newData);
		toast.success('Tarea movida a Hoy');
	};

	// --- RENDER HELPERS ---
	const TaskItem = ({ task, isOverdue = false }: { task: any; isOverdue?: boolean }) => {
		const quest = data.quests?.find((q) => q.id === task.questId);

		return (
			<div
				className={cn(
					'group flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm bg-card',
					task.isDone ? 'opacity-50' : 'opacity-100',
					isOverdue ? 'border-red-500/20 bg-red-500/5' : 'border-border',
				)}>
				<button
					onClick={() => handleToggleTask(task.date, task.id)}
					className={cn(
						'flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center transition-colors',
						task.isDone ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground hover:border-primary',
					)}>
					{task.isDone && <Check size={12} strokeWidth={3} />}
				</button>

				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<p className={cn('text-sm font-medium truncate', task.isDone && 'line-through text-muted-foreground')}>{task.name}</p>
						{quest && (
							<div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-medium">
								<Scroll size={8} />
								<span className="truncate max-w-[80px]">{quest.title}</span>
							</div>
						)}
					</div>
					<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
						{task.date === 'inbox' ? (
							<>
								<span className="bg-secondary px-1.5 rounded text-secondary-foreground">Inbox</span>
							</>
						) : (
							<>
								<CalendarIcon size={10} />
								<span>{format(parseISO(task.date), 'd MMM', { locale: es })}</span>
							</>
						)}
						{isOverdue && <span className="text-red-500 font-bold">• Retrasada</span>}
					</div>
				</div>

				<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					{isOverdue && !task.isDone && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
							onClick={() => handleMoveToToday(task.date, task.id)}
							title="Mover a Hoy">
							<ArrowRight size={14} />
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
						onClick={() => handleDeleteTask(task.date, task.id)}>
						<Trash2 size={14} />
					</Button>
				</div>
			</div>
		);
	};

	const activeQuests = data.quests?.filter((q) => q.status === 'active') || [];

	return (
		<div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-20">
			{/* HEADER & CREATE */}
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold tracking-tight">Planificador</h2>
						<p className="text-muted-foreground text-sm">Gestión global de tus tareas pendientes</p>
					</div>
					<div className="flex items-center gap-4">
						<div className="flex bg-muted rounded-lg p-1">
							<button
								onClick={() => setViewMode('list')}
								className={cn(
									'p-1.5 rounded-md transition-all',
									viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
								)}
								title="Vista Lista">
								<List size={16} />
							</button>
							<button
								onClick={() => setViewMode('calendar')}
								className={cn(
									'p-1.5 rounded-md transition-all',
									viewMode === 'calendar' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
								)}
								title="Vista Calendario">
								<CalendarIcon size={16} />
							</button>
						</div>

						<div className="flex gap-2">
							<div className="bg-muted px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-red-500" />
								{taskGroups.overdue.length} Pendientes
							</div>
							<div className="bg-muted px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-green-500" />
								{taskGroups.today.filter((t) => t.isDone).length}/{taskGroups.today.length} Hoy
							</div>
						</div>
					</div>
				</div>

				{/* CREATE BAR (Visible in both views) */}
				<form onSubmit={handleCreateTask} className="flex gap-2">
					<div className="flex-1 relative flex gap-2">
						<div className="relative flex-1">
							<input
								className="w-full bg-card border rounded-lg pl-4 pr-32 py-3 text-sm focus:ring-2 ring-primary/20 outline-none shadow-sm"
								placeholder="¿Qué tienes que hacer?"
								value={newTask}
								onChange={(e) => setNewTask(e.target.value)}
							/>
							<div className="absolute right-1 top-1 bottom-1 flex items-center">
								<Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
									<PopoverTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											className={cn(
												'h-full px-3 text-xs font-medium gap-2',
												newTaskDate === null && 'text-muted-foreground',
												newTaskDate && !isSameDay(newTaskDate, new Date()) && 'text-blue-500',
											)}>
											<CalendarIcon size={14} />
											{newTaskDate === null
												? 'Inbox'
												: isSameDay(newTaskDate, new Date())
													? 'Hoy'
													: isSameDay(newTaskDate, addDays(new Date(), 1))
														? 'Mañana'
														: format(newTaskDate, 'd MMM', { locale: es })}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="end">
										<div className="p-3 bg-card border rounded-lg shadow-lg">
											<p className="text-xs font-medium text-muted-foreground mb-2">Seleccionar fecha</p>

											{/* Inbox Option */}
											<Button
												size="sm"
												variant={!newTaskDate ? 'default' : 'outline'}
												className="w-full mb-2 justify-start"
												onClick={() => {
													setNewTaskDate(null);
													setIsDatePickerOpen(false);
												}}>
												📥 Inbox (Sin fecha)
											</Button>

											<input
												type="date"
												className="w-full p-2 border rounded text-sm bg-background"
												value={newTaskDate ? format(newTaskDate, 'yyyy-MM-dd') : ''}
												onChange={(e) => {
													if (e.target.valueAsDate) {
														setNewTaskDate(e.target.valueAsDate);
														setIsDatePickerOpen(false);
													}
												}}
											/>
											<div className="flex gap-2 mt-2">
												<Button
													size="sm"
													variant="outline"
													className="flex-1 text-xs"
													onClick={() => {
														setNewTaskDate(new Date());
														setIsDatePickerOpen(false);
													}}>
													Hoy
												</Button>
												<Button
													size="sm"
													variant="outline"
													className="flex-1 text-xs"
													onClick={() => {
														setNewTaskDate(addDays(new Date(), 1));
														setIsDatePickerOpen(false);
													}}>
													Mañana
												</Button>
											</div>
										</div>
									</PopoverContent>
								</Popover>
							</div>
						</div>

						{/* QUEST SELECTOR */}
						{activeQuests.length > 0 && (
							<select
								value={selectedQuestId}
								onChange={(e) => setSelectedQuestId(e.target.value)}
								className="w-40 bg-card border rounded-lg px-2 text-xs focus:ring-2 ring-primary/20 outline-none shadow-sm truncate">
								<option value="">Sin misión</option>
								{activeQuests.map((q) => (
									<option key={q.id} value={q.id}>
										{q.title}
									</option>
								))}
							</select>
						)}
					</div>
					<Button type="submit" className="shadow-sm">
						<Plus className="h-4 w-4 mr-2" /> Añadir
					</Button>
				</form>
			</div>

			{viewMode === 'calendar' ? (
				<CalendarView
					data={data}
					onDateSelect={(date) => {
						onNavigateDate?.(date);
					}}
					onEventsUpdate={onEventsUpdate}
				/>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{/* LEFT COL: PRIORITY (Overdue + Today) */}
					<div className="space-y-6">
						{/* INBOX SECTION */}
						{taskGroups.inbox.length > 0 && (
							<section className="space-y-3">
								<div className="flex items-center gap-2 text-indigo-500 font-semibold text-sm uppercase tracking-wider">
									<span>📥 Inbox</span>
									<div className="h-px bg-indigo-500/20 flex-1" />
									<span className="text-xs text-muted-foreground">{taskGroups.inbox.length}</span>
								</div>
								<div className="space-y-2">
									{taskGroups.inbox.map((task) => (
										<TaskItem key={`${task.date}-${task.id}`} task={task} />
									))}
								</div>
							</section>
						)}

						{/* OVERDUE SECTION */}
						{taskGroups.overdue.length > 0 && (
							<section className="space-y-3">
								<div className="flex items-center gap-2 text-red-500 font-semibold text-sm uppercase tracking-wider">
									<Clock size={14} />
									<span>Atrasadas</span>
									<div className="h-px bg-red-500/20 flex-1" />
								</div>
								<div className="space-y-2">
									{taskGroups.overdue.map((task) => (
										<TaskItem key={`${task.date}-${task.id}`} task={task} isOverdue />
									))}
								</div>
							</section>
						)}

						{/* TODAY SECTION */}
						<section className="space-y-3">
							<div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
								<Circle size={14} />
								<span>Para Hoy</span>
								<div className="h-px bg-primary/20 flex-1" />
							</div>
							<div className="space-y-2">
								{taskGroups.today.length === 0 ? (
									<div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground text-sm">No hay tareas para hoy.</div>
								) : (
									taskGroups.today.map((task) => <TaskItem key={`${task.date}-${task.id}`} task={task} />)
								)}
							</div>
						</section>
					</div>

					{/* RIGHT COL: FUTURE & COMPLETED */}
					<div className="space-y-6">
						{/* UPCOMING SECTION */}
						<section className="space-y-3">
							<div className="flex items-center gap-2 text-muted-foreground font-semibold text-sm uppercase tracking-wider">
								<CalendarIcon size={14} />
								<span>Próximamente</span>
								<div className="h-px bg-border flex-1" />
							</div>
							<div className="space-y-2">
								{taskGroups.upcoming.length === 0 ? (
									<p className="text-sm text-muted-foreground/50 italic">No hay tareas futuras agendadas.</p>
								) : (
									taskGroups.upcoming.map((task) => <TaskItem key={`${task.date}-${task.id}`} task={task} />)
								)}
							</div>
						</section>
					</div>
				</div>
			)}
		</div>
	);
}

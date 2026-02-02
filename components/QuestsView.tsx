'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
	BookOpen,
	Calendar,
	Check,
	ChevronDown,
	ChevronUp,
	Edit3,
	Plus,
	Scroll,
	Skull,
	Sparkles,
	Star,
	Swords,
	Target,
	Trash2,
	Trophy,
	X,
	Zap,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AttributeKey, DB, Quest, QuestDifficulty, QuestStatus, Task } from '@/lib/types';
import { cn } from '@/lib/utils';

type QuestsViewProps = {
	data: DB;
	onUpdate: (newData: DB) => void;
	onGainXP?: (amount: number, reason: string, dataOverride?: DB, attribute?: AttributeKey) => void;
	onAddGold?: (amount: number, reason: string) => void;
};

// Difficulty configuration
const DIFFICULTY_CONFIG: Record<QuestDifficulty, { label: string; icon: React.ReactNode; color: string; xp: number; gold: number }> = {
	common: {
		label: 'Común',
		icon: <Star size={14} />,
		color: 'text-slate-400',
		xp: 50,
		gold: 10,
	},
	rare: {
		label: 'Raro',
		icon: <Sparkles size={14} />,
		color: 'text-blue-400',
		xp: 100,
		gold: 25,
	},
	epic: {
		label: 'Épico',
		icon: <Zap size={14} />,
		color: 'text-purple-400',
		xp: 200,
		gold: 50,
	},
	legendary: {
		label: 'Legendario',
		icon: <Skull size={14} />,
		color: 'text-amber-400',
		xp: 500,
		gold: 100,
	},
};

const ATTRIBUTE_LABELS: Record<AttributeKey, { label: string; color: string }> = {
	STR: { label: 'Fuerza', color: 'text-red-400' },
	INT: { label: 'Intelecto', color: 'text-blue-400' },
	WIL: { label: 'Voluntad', color: 'text-green-400' },
	CRE: { label: 'Creatividad', color: 'text-purple-400' },
};

export function QuestsView({ data, onUpdate, onGainXP, onAddGold }: QuestsViewProps) {
	const [isCreateOpen, setIsCreateOpen] = React.useState(false);
	const [selectedQuest, setSelectedQuest] = React.useState<Quest | null>(null);
	const [filter, setFilter] = React.useState<QuestStatus | 'all'>('active');

	// Form state for new quest
	const [newQuest, setNewQuest] = React.useState({
		title: '',
		description: '',
		difficulty: 'common' as QuestDifficulty,
		attribute: undefined as AttributeKey | undefined,
		deadline: '',
	});

	const quests = data.quests || [];

	const filteredQuests = React.useMemo(() => {
		if (filter === 'all') return quests;
		return quests.filter((q) => q.status === filter);
	}, [quests, filter]);

	// HELPER: Get all tasks related to a quest
	const getQuestTasks = React.useCallback(
		(questId: string) => {
			const tasks: Array<{ dateKey: string; taskId: string; task: Task }> = [];
			if (!data.entries) return tasks;

			Object.entries(data.entries).forEach(([dateKey, entry]) => {
				if (!entry.tasks) return;
				Object.entries(entry.tasks).forEach(([key, value]) => {
					// Handle both formats safely
					const task: Task = typeof value === 'object' ? value : { name: key, completed: value };

					if (task.questId === questId) {
						tasks.push({ dateKey, taskId: key, task });
					}
				});
			});
			return tasks;
		},
		[data.entries],
	);

	// Calculate progress for a quest based on system tasks
	const getProgress = React.useCallback(
		(quest: Quest) => {
			const tasks = getQuestTasks(quest.id);
			if (tasks.length === 0) return 0;
			const completed = tasks.filter((t) => t.task.completed).length;
			return Math.round((completed / tasks.length) * 100);
		},
		[getQuestTasks],
	);

	// Create new quest
	const handleCreateQuest = () => {
		if (!newQuest.title.trim()) {
			toast.error('Necesitas un nombre para la misión');
			return;
		}

		const difficulty = newQuest.difficulty || 'common';
		const config = DIFFICULTY_CONFIG[difficulty];

		const quest: Quest = {
			id: crypto.randomUUID(),
			title: newQuest.title.trim(),
			description: newQuest.description.trim(),
			difficulty,
			attribute: newQuest.attribute,
			documentation: '',
			xpReward: config.xp,
			goldReward: config.gold,
			deadline: newQuest.deadline || undefined,
			status: 'active',
			createdAt: new Date().toISOString(),
		};

		onUpdate({
			...data,
			quests: [...quests, quest],
		});

		setNewQuest({
			title: '',
			description: '',
			difficulty: 'common',
			attribute: undefined,
			deadline: '',
		});
		setIsCreateOpen(false);
		toast.success('¡Nueva misión creada!');
	};

	// Update documentation
	const handleUpdateDocs = (questId: string, docs: string) => {
		const updatedQuests = quests.map((q) => (q.id === questId ? { ...q, documentation: docs } : q));
		onUpdate({ ...data, quests: updatedQuests });
		// We don't need to manually update selectedQuest reference since it logic relies on 'quests' derived from data if we simply close/reopen or let React rerender,
		// but since selectedQuest is local state copy, we do need to update it.
		if (selectedQuest?.id === questId) {
			setSelectedQuest(updatedQuests.find((q) => q.id === questId) || null);
		}
	};

	// Complete quest
	const handleCompleteQuest = (quest: Quest) => {
		const progress = getProgress(quest);
		// Allow manual completion even if 0 tasks (maybe it was a narrative quest),
		// but usually we want safeguards. Let's strictly require 100% ONLY IF there are tasks.
		const tasks = getQuestTasks(quest.id);

		if (tasks.length > 0 && progress < 100) {
			toast.error('Completa todas las tareas vinculadas primero');
			return;
		}

		const updatedQuests = quests.map((q) =>
			q.id === quest.id ? { ...q, status: 'completed' as QuestStatus, completedAt: new Date().toISOString() } : q,
		);

		const newData = { ...data, quests: updatedQuests };
		onUpdate(newData);

		// Award XP and Gold
		onGainXP?.(quest.xpReward, `Misión completada: ${quest.title}`, newData, quest.attribute);
		onAddGold?.(quest.goldReward, `Misión completada: ${quest.title}`);

		setSelectedQuest(null);
		toast.success(`🏆 ¡Misión completada! +${quest.xpReward} XP +${quest.goldReward} Oro`);
	};

	// Delete quest
	const handleDeleteQuest = (questId: string) => {
		if (!confirm('¿Eliminar esta misión?')) return;
		onUpdate({
			...data,
			quests: quests.filter((q) => q.id !== questId),
		});
		setSelectedQuest(null);
		toast.success('Misión eliminada');
	};

	// Toggle task linked to quest
	const handleToggleTask = (dateKey: string, taskId: string) => {
		const entry = data.entries?.[dateKey];
		if (!entry || !entry.tasks) return;

		const taskValue = entry.tasks[taskId];

		// Ensure object format
		let taskObj: Task;
		if (typeof taskValue === 'object') {
			taskObj = { ...taskValue, completed: !taskValue.completed };
		} else {
			// If it's a string (old format), assume it's the task name and create a new object
			taskObj = { name: taskId, completed: !taskValue }; // taskId was used as name in old format
		}

		const newEntry = {
			...entry,
			tasks: { ...entry.tasks, [taskId]: taskObj },
		};

		const newData = {
			...data,
			entries: { ...data.entries, [dateKey]: newEntry },
		};

		onUpdate(newData);

		if (taskObj.completed) {
			onGainXP?.(10, `Tarea de Misión: ${taskObj.name}`, newData);
			// toast.success("+10 XP"); // Optional noise reduction
		}
	};

	// Delete linked task
	const handleDeleteLinkedTask = (dateKey: string, taskId: string) => {
		if (!confirm('¿Borrar esta tarea?')) return;
		const entry = data.entries?.[dateKey];
		if (!entry || !entry.tasks) return;

		const newTasks = { ...entry.tasks };
		delete newTasks[taskId];

		onUpdate({
			...data,
			entries: { ...data.entries, [dateKey]: { ...entry, tasks: newTasks } },
		});
	};

	// Add a new task linked to this quest (to INBOX by default)
	const handleCreateLinkedTask = (questId: string, taskName: string) => {
		// Use 'inbox' as generic bucket for tasks without specific date
		const targetKey = 'inbox';
		const targetEntry = data.entries?.[targetKey] || { habits: {}, metrics: {}, tasks: {}, review: {} };

		const taskId = crypto.randomUUID();
		const newTask: Task = {
			name: taskName,
			completed: false,
			questId,
			createdAt: new Date().toISOString(),
		};

		const newData = {
			...data,
			entries: {
				...data.entries,
				[targetKey]: {
					...targetEntry,
					tasks: {
						...(targetEntry.tasks || {}),
						[taskId]: newTask,
					},
				},
			},
		};

		onUpdate(newData);
		toast.success('Tarea añadida al Inbox');
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
			{/* HEADER */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
						<Scroll className="text-amber-500" size={28} />
						Tablón de Misiones
					</h2>
					<p className="text-muted-foreground text-sm">Gestiona tus proyectos como aventuras épicas</p>
				</div>
				<Button onClick={() => setIsCreateOpen(true)} className="gap-2">
					<Plus size={16} />
					Nueva Misión
				</Button>
			</div>

			{/* FILTER TABS */}
			<div className="flex gap-2 bg-muted p-1 rounded-lg w-fit">
				{(['active', 'completed', 'all'] as const).map((f) => (
					<button
						key={f}
						onClick={() => setFilter(f)}
						className={cn(
							'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
							filter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
						)}>
						{f === 'active' ? 'Activas' : f === 'completed' ? 'Completadas' : 'Todas'}
					</button>
				))}
			</div>

			{/* QUESTS GRID */}
			{filteredQuests.length === 0 ? (
				<div className="text-center py-16 border-2 border-dashed rounded-xl">
					<Swords className="mx-auto text-muted-foreground/50 mb-4" size={48} />
					<p className="text-muted-foreground">No hay misiones {filter !== 'all' && filter === 'active' ? 'activas' : ''}</p>
					<Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
						Crear primera misión
					</Button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredQuests.map((quest) => {
						const progress = getProgress(quest);
						const diffConfig = DIFFICULTY_CONFIG[quest.difficulty];
						const attrConfig = quest.attribute ? ATTRIBUTE_LABELS[quest.attribute] : null;
						const questTasks = getQuestTasks(quest.id);

						return (
							<Card
								key={quest.id}
								className={cn(
									'cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden',
									quest.status === 'completed' && 'opacity-70',
								)}
								onClick={() => setSelectedQuest(quest)}>
								{/* Difficulty badge */}
								<div
									className={cn(
										'absolute top-3 right-3 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm border',
										diffConfig.color,
									)}>
									{diffConfig.icon}
									{diffConfig.label}
								</div>

								<CardHeader className="pb-2">
									<CardTitle className="text-lg pr-20 line-clamp-2">{quest.title}</CardTitle>
									{quest.description && <p className="text-sm text-muted-foreground line-clamp-2">{quest.description}</p>}
								</CardHeader>

								<CardContent className="space-y-3">
									{/* Progress bar (HP style) */}
									<div className="space-y-1">
										<div className="flex justify-between text-xs">
											<span className="text-muted-foreground">Progreso</span>
											<span className="font-medium">{progress}%</span>
										</div>
										<div className="h-2 bg-muted rounded-full overflow-hidden">
											<div
												className={cn(
													'h-full transition-all duration-500',
													progress === 100 ? 'bg-green-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500',
												)}
												style={{ width: `${progress}%` }}
											/>
										</div>
									</div>

									{/* Objectives preview */}
									<div className="text-xs text-muted-foreground">
										<Target size={12} className="inline mr-1" />
										{questTasks.filter((t) => t.task.completed).length}/{questTasks.length} tareas
									</div>

									{/* Footer info */}
									<div className="flex items-center justify-between text-xs pt-2 border-t">
										{attrConfig && <span className={cn('font-medium', attrConfig.color)}>{attrConfig.label}</span>}
										{quest.deadline && (
											<span className="text-muted-foreground flex items-center gap-1">
												<Calendar size={10} />
												{format(new Date(quest.deadline), 'd MMM', { locale: es })}
											</span>
										)}
										{quest.status === 'completed' && (
											<span className="text-green-500 font-medium flex items-center gap-1">
												<Trophy size={12} />
												Completada
											</span>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* CREATE QUEST DIALOG */}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Scroll className="text-amber-500" />
							Nueva Misión
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 pt-4">
						<div>
							<label className="text-sm font-medium">Nombre de la misión</label>
							<input
								className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm"
								placeholder="Ej: Implementar sistema de login"
								value={newQuest.title}
								onChange={(e) => setNewQuest({ ...newQuest, title: e.target.value })}
							/>
						</div>

						<div>
							<label className="text-sm font-medium">Descripción</label>
							<textarea
								className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm resize-none"
								rows={2}
								placeholder="Breve descripción del proyecto..."
								value={newQuest.description}
								onChange={(e) => setNewQuest({ ...newQuest, description: e.target.value })}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-sm font-medium">Dificultad</label>
								<select
									className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm"
									value={newQuest.difficulty}
									onChange={(e) =>
										setNewQuest({
											...newQuest,
											difficulty: e.target.value as QuestDifficulty,
										})
									}>
									{Object.entries(DIFFICULTY_CONFIG).map(([key, val]) => (
										<option key={key} value={key}>
											{val.label} (+{val.xp} XP)
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="text-sm font-medium">Atributo</label>
								<select
									className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm"
									value={newQuest.attribute || ''}
									onChange={(e) =>
										setNewQuest({
											...newQuest,
											attribute: (e.target.value as AttributeKey) || undefined,
										})
									}>
									<option value="">Sin atributo</option>
									{Object.entries(ATTRIBUTE_LABELS).map(([key, val]) => (
										<option key={key} value={key}>
											{val.label}
										</option>
									))}
								</select>
							</div>
						</div>

						<div>
							<label className="text-sm font-medium">Fecha límite (opcional)</label>
							<input
								type="date"
								className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm"
								value={newQuest.deadline}
								onChange={(e) => setNewQuest({ ...newQuest, deadline: e.target.value })}
							/>
						</div>

						<div className="flex gap-2 pt-2">
							<Button variant="outline" className="flex-1" onClick={() => setIsCreateOpen(false)}>
								Cancelar
							</Button>
							<Button className="flex-1" onClick={handleCreateQuest}>
								Crear Misión
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* QUEST DETAIL DIALOG */}
			<Dialog open={!!selectedQuest} onOpenChange={(open) => !open && setSelectedQuest(null)}>
				{selectedQuest && (
					<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
						<DialogHeader>
							<div className="flex items-start justify-between">
								<div>
									<DialogTitle className="text-xl">{selectedQuest.title}</DialogTitle>
									{selectedQuest.description && <p className="text-sm text-muted-foreground mt-1">{selectedQuest.description}</p>}
								</div>
								<div
									className={cn(
										'flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full border',
										DIFFICULTY_CONFIG[selectedQuest.difficulty].color,
									)}>
									{DIFFICULTY_CONFIG[selectedQuest.difficulty].icon}
									{DIFFICULTY_CONFIG[selectedQuest.difficulty].label}
								</div>
							</div>
						</DialogHeader>

						<div className="space-y-6 pt-4">
							{/* PROGRESS */}
							<div className="space-y-2">
								<div className="flex justify-between items-center">
									<span className="font-medium">Progreso de la Misión</span>
									<span className="text-lg font-bold">{getProgress(selectedQuest)}%</span>
								</div>
								<div className="h-3 bg-muted rounded-full overflow-hidden">
									<div
										className={cn(
											'h-full transition-all duration-500',
											getProgress(selectedQuest) === 100 ? 'bg-green-500' : getProgress(selectedQuest) >= 50 ? 'bg-amber-500' : 'bg-red-500',
										)}
										style={{ width: `${getProgress(selectedQuest)}%` }}
									/>
								</div>
							</div>

							{/* LINKED TASKS LIST */}
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<h4 className="font-medium flex items-center gap-2">
										<Target size={16} />
										Tareas Vinculadas
									</h4>
								</div>

								<div className="space-y-2 bg-muted/20 p-4 rounded-xl">
									{getQuestTasks(selectedQuest.id).length === 0 ? (
										<p className="text-sm text-muted-foreground italic text-center">
											No hay tareas vinculadas. Añade una abajo o desde en el Planificador.
										</p>
									) : (
										getQuestTasks(selectedQuest.id).map(({ dateKey, task, taskId }) => (
											<div
												key={`${dateKey}-${taskId}`}
												className={cn('flex items-center justify-between p-2 rounded-lg border bg-card/50 group', task.completed && 'opacity-60')}>
												<div className="flex items-center gap-3 flex-1 min-w-0">
													<button
														onClick={() => handleToggleTask(dateKey, taskId)}
														className={cn(
															'h-4 w-4 rounded border flex items-center justify-center transition-colors',
															task.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground hover:border-primary',
														)}>
														{task.completed && <Check size={10} strokeWidth={3} />}
													</button>
													<div className="flex flex-col min-w-0">
														<span className={cn('text-sm font-medium truncate', task.completed && 'line-through text-muted-foreground')}>
															{task.name}
														</span>
														<span className="text-[10px] text-muted-foreground flex items-center gap-1">
															{dateKey === 'inbox' ? '📥 Inbox' : format(new Date(dateKey), 'd MMM', { locale: es })}
														</span>
													</div>
												</div>
												<Button
													variant="ghost"
													size="icon"
													className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive"
													onClick={() => handleDeleteLinkedTask(dateKey, taskId)}>
													<Trash2 size={12} />
												</Button>
											</div>
										))
									)}
								</div>

								{/* Add quick task */}
								<div className="pt-2">
									<LinkedTaskInput onAdd={(text) => handleCreateLinkedTask(selectedQuest.id, text)} />
									<p className="text-[10px] text-muted-foreground mt-1 ml-1">* Se añadirá a tus tareas de Hoy</p>
								</div>
							</div>

							{/* DOCUMENTATION */}
							<div className="space-y-3">
								<h4 className="font-medium flex items-center gap-2">
									<BookOpen size={16} />
									Documentación
								</h4>
								<textarea
									className="w-full p-3 border rounded-lg bg-background text-sm resize-none min-h-[120px] font-mono"
									placeholder="Notas, enlaces, referencias... (markdown)"
									value={selectedQuest.documentation}
									onChange={(e) => handleUpdateDocs(selectedQuest.id, e.target.value)}
								/>
							</div>

							{/* REWARDS */}
							<div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
								<span className="text-sm text-muted-foreground">Recompensas:</span>
								<span className="font-medium text-amber-500">+{selectedQuest.xpReward} XP</span>
								<span className="font-medium text-yellow-500">+{selectedQuest.goldReward} 🪙</span>
								{selectedQuest.attribute && (
									<span className={cn('font-medium', ATTRIBUTE_LABELS[selectedQuest.attribute].color)}>
										+{ATTRIBUTE_LABELS[selectedQuest.attribute].label}
									</span>
								)}
							</div>

							{/* ACTIONS */}
							<div className="flex gap-2 pt-2 border-t">
								<Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteQuest(selectedQuest.id)}>
									<Trash2 size={14} className="mr-2" />
									Eliminar
								</Button>
								<div className="flex-1" />
								{selectedQuest.status === 'active' && (
									<Button
										onClick={() => handleCompleteQuest(selectedQuest)}
										disabled={getQuestTasks(selectedQuest.id).length > 0 && getProgress(selectedQuest) < 100}
										className="gap-2">
										<Trophy size={16} />
										Completar Misión
									</Button>
								)}
							</div>
						</div>
					</DialogContent>
				)}
			</Dialog>
		</div>
	);
}

// Helper component for adding tasks
function LinkedTaskInput({ onAdd }: { onAdd: (text: string) => void }) {
	const [text, setText] = React.useState('');

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!text.trim()) return;
		onAdd(text.trim());
		setText('');
	};

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<input
				className="flex-1 px-3 py-2 border rounded-lg bg-background text-sm"
				placeholder="Añadir tarea vinculada..."
				value={text}
				onChange={(e) => setText(e.target.value)}
			/>
			<Button type="submit" size="sm" variant="secondary">
				<Plus size={14} className="mr-2" /> Añadir
			</Button>
		</form>
	);
}

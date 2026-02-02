'use client';

import confetti from 'canvas-confetti';
import { format, subDays } from 'date-fns';
import { motion } from 'framer-motion';
import { Check, CheckCircle, History as HistoryIcon, Lock, Moon, Plus, Smartphone, Trash2, Unlock } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AttributeKey, DB } from '@/lib/types';
import { cn } from '@/lib/utils';

type DailyInputProps = {
	data: DB;
	dateKey: string;
	onUpdate: (newData: DB) => void;
	onGainXP?: (amount: number, reason: string, dataOverride?: DB, attribute?: AttributeKey) => void;
};

export function DailyInput({ data, dateKey, onUpdate, onGainXP }: DailyInputProps) {
	if (!data) return null;

	const habits =
		(data.config?.habits as unknown as {
			id: string;
			name: string;
			attribute: AttributeKey;
		}[]) || [];

	// Defensive merge
	const rawEntry = data.entries?.[dateKey] || {};
	const entry = {
		habits: rawEntry.habits || {},
		metrics: rawEntry.metrics || {},
		tasks: rawEntry.tasks || {},
		review: rawEntry.review || { win: '', fail: '', fix: '' },
		completed: rawEntry.completed || false,
	};

	// Local state for new task input
	const [newTask, setNewTask] = React.useState('');

	// --- ROLLOVER LOGIC ---
	const yesterdayKey = format(subDays(new Date(), 1), 'yyyy-MM-dd');
	const yesterdayEntry = data.entries?.[yesterdayKey];
	const pendingYesterday = React.useMemo(() => {
		if (!yesterdayEntry?.tasks) return [];
		return Object.entries(yesterdayEntry.tasks)
			.filter(([_, task]) => !task.completed)
			.map(([taskId]) => taskId);
	}, [yesterdayEntry]);

	const handleRollover = () => {
		const newTasks = { ...(entry.tasks || {}) };
		pendingYesterday.forEach((taskId) => {
			if (!newTasks[taskId]) {
				newTasks[taskId] = {
					name: taskId,
					completed: false,
				};
			}
		});

		const newEntry = { ...entry, tasks: newTasks };
		updateData(newEntry);
		toast.success('Tareas de ayer importadas');
	};

	// --- DYNAMIC GOALS CONFIG ---
	const GOAL_SLEEP = data.config?.goals?.sleep || 7.5;
	const LIMIT_PHONE = data.config?.goals?.phone || 2.0;

	const handleHabitToggle = (habit: { id: string; name: string; attribute: AttributeKey }) => {
		const newVal = !entry.habits[habit.name];
		const newEntry = {
			...entry,
			habits: { ...(entry.habits || {}), [habit.name]: newVal },
		};

		const newData = {
			...data,
			entries: { ...(data.entries || {}), [dateKey]: newEntry },
		};

		if (onGainXP) {
			console.log('🎮 Llamando onGainXP para', habit.name, newVal);
			if (newVal) {
				onGainXP(20, `Hábito: ${habit.name}`, newData, habit.attribute);
				confetti({
					particleCount: 50,
					spread: 60,
					origin: { y: 0.7 },
				});
			} else {
				onGainXP(-20, `Hábito cancelado: ${habit.name}`, newData, habit.attribute);
			}
		} else {
			console.log('⚠️ No hay onGainXP, usando onUpdate');
			onUpdate(newData);
		}
	};

	const handleMetricChange = (metric: string, value: number) => {
		const newEntry = {
			...entry,
			metrics: { ...(entry.metrics || {}), [metric]: value },
		};
		updateData(newEntry);
	};

	const handleReviewChange = (field: string, value: string) => {
		const newEntry = {
			...entry,
			review: { ...(entry.review || {}), [field]: value },
		};
		updateData(newEntry);
	};

	const handleAddTask = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTask.trim()) return;

		const taskId = crypto.randomUUID();
		const newEntry = {
			...entry,
			tasks: {
				...(entry.tasks || {}),
				[taskId]: {
					name: newTask.trim(),
					completed: false,
					createdAt: new Date().toISOString(),
				},
			},
		};

		updateData(newEntry);
		setNewTask('');
		toast.success('Tarea añadida');
	};

	const handleToggleTask = (taskId: string) => {
		const task = entry.tasks[taskId];
		if (!task) return;

		const newVal = !task.completed;
		const newEntry = {
			...entry,
			tasks: {
				...(entry.tasks || {}),
				[taskId]: { ...task, completed: newVal },
			},
		};

		const newData = {
			...data,
			entries: { ...(data.entries || {}), [dateKey]: newEntry },
		};

		if (onGainXP) {
			if (newVal) {
				onGainXP(10, `Tarea: ${task.name}`, newData);
			} else {
				onGainXP(-10, `Tarea cancelada: ${task.name}`, newData);
			}
		} else {
			onUpdate(newData);
		}
	};

	const handleDeleteTask = (taskId: string) => {
		const task = entry.tasks[taskId];
		if (!task) return;

		if (confirm(`¿Borrar la tarea "${task.name}"?`)) {
			const newTasks = { ...(entry.tasks || {}) };
			delete newTasks[taskId];
			const newEntry = { ...entry, tasks: newTasks };
			updateData(newEntry);
		}
	};

	const updateData = (newEntry: typeof entry) => {
		const newData = {
			...data,
			entries: { ...(data.entries || {}), [dateKey]: newEntry },
		};
		onUpdate(newData);
		return newData;
	};

	const getSleepColor = (val: number) => {
		if (!val) return 'text-foreground';
		if (val >= GOAL_SLEEP) return 'text-green-500';
		if (val >= GOAL_SLEEP - 1) return 'text-yellow-500';
		return 'text-red-500';
	};

	const getPhoneColor = (val: number) => {
		if (!val && val !== 0) return 'text-foreground';
		if (val <= LIMIT_PHONE) return 'text-green-500';
		if (val <= LIMIT_PHONE + 1) return 'text-yellow-500';
		return 'text-red-500';
	};

	const handleCompleteDay = () => {
		const newEntry = { ...entry, completed: !entry.completed };
		const newData = {
			...data,
			entries: { ...(data.entries || {}), [dateKey]: newEntry },
		};

		if (onGainXP) {
			if (newEntry.completed) {
				onGainXP(100, 'Día Completado', newData);
				confetti({
					particleCount: 150,
					spread: 100,
					origin: { y: 0.6 },
					colors: ['#22c55e', '#eab308', '#ffffff'],
				});
			} else {
				onGainXP(-100, 'Día reabierto', newData);
			}
		} else {
			onUpdate(newData);
		}
	};

	const isToday = dateKey === format(new Date(), 'yyyy-MM-dd');

	return (
		<div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-12">
			{isToday && pendingYesterday.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="bg-blue-500/20 p-2 rounded-full text-blue-500">
							<HistoryIcon size={18} />
						</div>
						<div>
							<p className="text-sm font-medium text-blue-500">Tareas pendientes de ayer</p>
							<p className="text-xs text-blue-500/70">Tienes {pendingYesterday.length} cosas sin terminar. ¿Las traemos a hoy?</p>
						</div>
					</div>
					<Button onClick={handleRollover} size="sm" variant="outline" className="border-blue-500/30 hover:bg-blue-500/20 text-blue-500">
						Importar
					</Button>
				</motion.div>
			)}

			<section>
				<div className="flex items-center gap-2 mb-3 opacity-80">
					<div className="h-px bg-border flex-1" />
					<span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Balance del Día</span>
					<div className="h-px bg-border flex-1" />
				</div>

				<div className="grid grid-cols-2 gap-4">
					<Card className="bg-muted/20 border-border/50">
						<CardContent className="p-4 flex flex-col items-center justify-center space-y-2">
							<Moon className="text-indigo-400 opacity-80" size={20} />
							<span className="text-xs font-medium text-muted-foreground">Sueño ({GOAL_SLEEP}h+)</span>
							<div className="flex items-baseline gap-1">
								<input
									type="number"
									step="0.5"
									className={cn(
										'text-3xl font-bold bg-transparent text-center w-24 outline-none transition-colors',
										getSleepColor(entry.metrics['Horas de Sueño']),
									)}
									value={entry.metrics['Horas de Sueño'] || ''}
									placeholder="0.0"
									onChange={(e) => {
										const val = e.target.value;
										const num = val === '' ? 0 : parseFloat(val);
										handleMetricChange('Horas de Sueño', num);
									}}
								/>
								<span className="text-xs text-muted-foreground">h</span>
							</div>
						</CardContent>
					</Card>

					<Card className="bg-muted/20 border-border/50">
						<CardContent className="p-4 flex flex-col items-center justify-center space-y-2">
							<Smartphone className="text-pink-400 opacity-80" size={20} />
							<span className="text-xs font-medium text-muted-foreground">Móvil (&lt;{LIMIT_PHONE}h)</span>
							<div className="flex items-baseline gap-1">
								<input
									type="number"
									step="0.1"
									className={cn(
										'text-3xl font-bold bg-transparent text-center w-24 outline-none transition-colors',
										getPhoneColor(entry.metrics['Horas de Móvil']),
									)}
									value={entry.metrics['Horas de Móvil'] || ''}
									placeholder="0.0"
									onChange={(e) => {
										const val = e.target.value;
										const num = val === '' ? 0 : parseFloat(val);
										handleMetricChange('Horas de Móvil', num);
									}}
								/>
								<span className="text-xs text-muted-foreground">h</span>
							</div>
						</CardContent>
					</Card>
				</div>
			</section>

			<section>
				<div className="flex items-center gap-2 mb-3 opacity-80">
					<div className="h-px bg-border flex-1" />
					<span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">Protocolo Diario</span>
					<div className="h-px bg-border flex-1" />
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{habits.map((habit) => (
						<motion.button
							key={habit.id || habit.name}
							whileTap={{ scale: 0.98 }}
							onClick={() => handleHabitToggle(habit)}
							className={cn(
								'flex items-center justify-between p-4 rounded-xl border-2 transition-all relative overflow-hidden group',
								entry.habits[habit.name]
									? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20'
									: 'bg-card border-border hover:border-primary/50',
							)}>
							<div className="flex items-center gap-3 z-10 relative">
								<div
									className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
										entry.habits[habit.name] ? 'bg-white/20 border-white/20 text-white' : 'bg-muted border-border text-muted-foreground'
									}`}>
									{habit.attribute || 'XP'}
								</div>
								<span className="font-medium">{habit.name}</span>
							</div>

							{entry.habits[habit.name] && <Check size={18} strokeWidth={3} className="z-10 relative" />}

							{entry.habits[habit.name] && (
								<motion.div
									layoutId={`glow-${habit.id}`}
									className="absolute inset-0 bg-white/10 z-0"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
								/>
							)}
						</motion.button>
					))}

					{habits.length === 0 && (
						<div className="col-span-2 text-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
							No hay hábitos configurados. Ve a Ajustes ⚙️ para empezar.
						</div>
					)}
				</div>
			</section>

			<section>
				<div className="flex items-center gap-2 mb-3 opacity-80">
					<div className="h-px bg-border flex-1" />
					<span className="text-xs font-mono uppercase tracking-widest text-blue-500 font-bold">Tareas del Día</span>
					<div className="h-px bg-border flex-1" />
				</div>

				<div className="space-y-3">
					<form onSubmit={handleAddTask} className="flex gap-2">
						<input
							className="flex-1 bg-card border rounded-lg px-4 py-2 text-sm focus:ring-2 ring-primary/20 outline-none"
							placeholder="Añadir tarea nueva..."
							value={newTask}
							onChange={(e) => setNewTask(e.target.value)}
						/>
						<Button type="submit" size="icon" variant="outline">
							<Plus className="h-4 w-4" />
						</Button>
					</form>

					<div className="space-y-2">
						{Object.entries(entry.tasks).length === 0 ? (
							<div className="text-center py-4 text-sm text-muted-foreground/50 italic">Sin tareas pendientes</div>
						) : (
							Object.entries(entry.tasks).map(([taskId, task]) => (
								<div
									key={taskId}
									className={cn(
										'flex items-center gap-3 p-3 rounded-lg border transition-all group',
										task.completed ? 'bg-muted/50 border-transparent opacity-60' : 'bg-card border-border',
									)}>
									<button
										type="button"
										onClick={() => handleToggleTask(taskId)}
										className={cn(
											'flex-shrink-0 h-5 w-5 rounded border flex items-center justify-center transition-colors',
											task.completed ? 'bg-blue-500 border-blue-500 text-white' : 'border-muted-foreground hover:border-blue-500',
										)}>
										{task.completed && <Check size={12} strokeWidth={3} />}
									</button>

									<span className={cn('flex-1 text-sm text-left', task.completed && 'line-through text-muted-foreground')}>{task.name}</span>

									<button
										type="button"
										onClick={() => handleDeleteTask(taskId)}
										className="text-muted-foreground hover:text-destructive transition-colors p-1">
										<Trash2 size={14} />
									</button>
								</div>
							))
						)}
					</div>
				</div>
			</section>

			<section className="pt-4">
				<div className="flex items-center gap-2 mb-4 opacity-80">
					<span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Diario Táctico</span>
					<div className="h-px bg-border flex-1" />
				</div>

				<div className="space-y-4">
					<input
						className="w-full p-3 bg-muted/30 hover:bg-muted/50 transition-colors rounded-lg border-none focus:ring-2 ring-primary/20 outline-none placeholder:text-muted-foreground/50"
						placeholder="🏆 Mayor victoria..."
						value={entry.review?.win || ''}
						onChange={(e) => handleReviewChange('win', e.target.value)}
						disabled={entry.completed}
					/>
					<input
						className="w-full p-3 bg-muted/30 hover:bg-muted/50 transition-colors rounded-lg border-none focus:ring-2 ring-destructive/20 outline-none placeholder:text-muted-foreground/50"
						placeholder="💀 Principal fallo..."
						value={entry.review?.fail || ''}
						onChange={(e) => handleReviewChange('fail', e.target.value)}
						disabled={entry.completed}
					/>
				</div>
			</section>

			<section className="pt-4 flex justify-center">
				<Button
					onClick={handleCompleteDay}
					size="lg"
					className={cn(
						'w-full md:w-auto min-w-[200px] transition-all duration-500 gap-2 font-bold tracking-wide',
						entry.completed ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-primary hover:bg-primary/90 shadow-lg',
					)}>
					{entry.completed ? (
						<>
							<CheckCircle size={18} />
							DÍA COMPLETADO
						</>
					) : (
						<>
							<Lock size={18} />
							CERRAR EL DÍA
						</>
					)}
				</Button>
			</section>

			{entry.completed && (
				<div className="text-center text-xs text-muted-foreground pt-2">
					<button
						type="button"
						onClick={handleCompleteDay}
						className="hover:text-primary flex items-center justify-center gap-1 mx-auto transition-colors">
						<Unlock size={10} />
						Reabrir día para editar
					</button>
				</div>
			)}
		</div>
	);
}

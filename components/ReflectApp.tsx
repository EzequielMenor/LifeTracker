'use client';

import confetti from 'canvas-confetti';
import { addDays, format, isSameDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Award, BarChart, Brain, Calendar, CheckSquare, ChevronLeft, ChevronRight, Coins, Scroll, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import * as React from 'react';
import { toast } from 'sonner';
import { AchievementsView } from '@/components/AchievementsView';
import { AnalyticsView } from '@/components/AnalyticsView';
import { BrainView, type Note } from '@/components/BrainView';
import type { CalendarEvent } from '@/components/CalendarView';
import { DailyInput } from '@/components/DailyInput';
import { LockedFeature } from '@/components/LockedFeature';
import { ModeToggle } from '@/components/mode-toggle';
import { SettingsView } from '@/components/SettingsView';
import { ShopView } from '@/components/ShopView';
import { QuestsView } from '@/components/QuestsView';
import { TasksView } from '@/components/TasksView';
import { Button } from '@/components/ui/button';
import { useGameSystem } from '@/hooks/useGameSystem';
import { ACHIEVEMENTS } from '@/lib/achievements';
import type { DB } from '@/lib/types';

export function ReflectApp() {
	const { theme } = useTheme();
	const [data, setData] = React.useState<DB | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [activeTab, setActiveTab] = React.useState<'input' | 'analytics' | 'brain' | 'tasks' | 'quests' | 'finance'>('input');
	const [showSettings, setShowSettings] = React.useState(false);
	const [showAchievements, setShowAchievements] = React.useState(false);
	const [showShop, setShowShop] = React.useState(false);

	// Date Navigation State
	const [currentDate, setCurrentDate] = React.useState(new Date());
	const dateKey = format(currentDate, 'yyyy-MM-dd');

	// --- ACHIEVEMENT CHECKER ---
	const checkAchievements = React.useCallback(
		(currentData: DB, notify = false) => {
			const unlocked = { ...currentData.achievements };
			let newUnlock = false;

			ACHIEVEMENTS.forEach((achievement) => {
				if (!unlocked[achievement.id]) {
					// Check logic
					// Cast to any because ACHIEVEMENTS might expect old Data type
					// We should eventually fix ACHIEVEMENTS types too
					if (achievement.condition(currentData as any, dateKey)) {
						unlocked[achievement.id] = new Date().toISOString();
						newUnlock = true;
						if (notify) {
							toast.success(`¡Logro Desbloqueado: ${achievement.title}!`, {
								icon: '🏆',
							});
							confetti({
								particleCount: 100,
								spread: 70,
								origin: { y: 0.6 },
							});
						}
					}
				}
			});

			if (newUnlock) {
				return { ...currentData, achievements: unlocked };
			}
			return currentData;
		},
		[dateKey],
	);

	// Save function
	const handleUpdate = React.useCallback(
		async (newData: DB) => {
			// Check for achievements BEFORE saving
			const finalData = checkAchievements(newData, true);

			setData({ ...finalData });
			try {
				const res = await fetch('/api/data', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(finalData),
				});

				if (!res.ok) {
					const errorData = await res.json();
					throw new Error(errorData.error || 'Fallo al guardar');
				}

				console.log('✅ Guardado con éxito');
			} catch (e: any) {
				console.error('Error saving:', e);
				toast.error('❌ ERROR CRÍTICO: No se pudo guardar en la nube. Revisa tu conexión o el SQL.');
			}
		},
		[checkAchievements],
	);

	// --- GAME SYSTEM ---
	const { levelProgress, currentLevel, gainXP, gold } = useGameSystem(data, handleUpdate);

	// Load Data
	React.useEffect(() => {
		fetch('/api/data')
			.then((res) => res.json())
			.then((d) => {
				// Run automatic migration on load
				const { migrateTasks } = require('@/lib/migrateTasksFormat');
				const migratedData = migrateTasks(d);
				setData(migratedData);
				setLoading(false);
			});
	}, []);

	const handleNotesUpdate = (newNotes: Note[]) => {
		if (!data) return;
		const newData = { ...data, notes: newNotes };
		handleUpdate(newData);
	};

	const handleEventsUpdate = (newEvents: CalendarEvent[]) => {
		if (!data) return;
		const newData = { ...data, events: newEvents };
		handleUpdate(newData);
	};

	// --- SCORE LOGIC ---
	const calculateScore = (dateK: string) => {
		if (!data) return 0;
		const entry = data.entries?.[dateK]; // Safe access
		if (!entry) return 0;

		let score = 0;
		const habits = data.config?.habits || []; // Safe access
		const doneCount = habits.filter((h) => {
			const habitName = typeof h === 'string' ? h : h.name;
			return entry.habits?.[habitName];
		}).length;

		// Habits = 80% of score
		if (habits.length > 0) {
			score += (doneCount / habits.length) * 80;
		}

		// Dynamic Goals
		const sleepGoal = data.config?.goals?.sleep || 7.5; // Safe access
		const phoneLimit = data.config?.goals?.phone || 2.0; // Safe access

		// Sleep Bonus (10 pts)
		const sleep = entry.metrics?.['Horas de Sueño'] || 0;
		if (sleep >= sleepGoal) score += 10;
		else if (sleep >= sleepGoal - 1.5) score += 5;

		// Phone Bonus (10 pts)
		if (entry.completed) {
			const phone = entry.metrics?.['Horas de Móvil'];
			if (phone !== undefined && phone <= phoneLimit) score += 10;
			else if (phone !== undefined && phone <= phoneLimit + 1.0) score += 5;
		}

		return Math.min(Math.round(score), 100);
	};

	// --- STREAK LOGIC ---
	const currentStreak = React.useMemo(() => {
		if (!data) return 0;
		let streak = 0;
		const today = new Date();

		for (let i = 0; i < 365; i++) {
			const d = subDays(today, i);
			const k = format(d, 'yyyy-MM-dd');
			const entry = data.entries?.[k]; // Safe access

			const habits = data.config?.habits || []; // Safe access
			const doneCount = entry
				? habits.filter((h) => {
						const habitName = typeof h === 'string' ? h : h.name;
						return entry.habits?.[habitName];
					}).length
				: 0;

			if (habits.length > 0 && doneCount >= habits.length / 2) {
				streak++;
			} else if (i === 0 && (!entry || doneCount < habits.length / 2)) {
				// Allow today to be incomplete
			} else {
				break;
			}
		}
		return streak;
	}, [data]);

	const dailyScore = calculateScore(dateKey);
	const isToday = isSameDay(currentDate, new Date());

	if (loading || !data) return <div className="flex h-screen items-center justify-center animate-pulse">Cargando sistema...</div>;

	// RENDER SETTINGS MODAL
	if (showSettings) {
		return (
			<div className="min-h-screen bg-background p-4 flex items-center justify-center">
				<div className="w-full max-w-2xl">
					<SettingsView data={data} onUpdate={handleUpdate} onClose={() => setShowSettings(false)} />
				</div>
			</div>
		);
	}

	// RENDER SHOP MODAL
	if (showShop) {
		return (
			<div className="min-h-screen bg-background p-4 flex items-center justify-center">
				<div className="w-full max-w-2xl">
					<ShopView data={data} onUpdate={handleUpdate} onClose={() => setShowShop(false)} />
				</div>
			</div>
		);
	}

	// RENDER ACHIEVEMENTS MODAL
	if (showAchievements) {
		return (
			<div className="min-h-screen bg-background p-4 flex items-center justify-center">
				<div className="w-full max-w-4xl">
					<AchievementsView
						data={data as any} // Temporary cast until View is updated
						onClose={() => setShowAchievements(false)}
					/>
				</div>
			</div>
		);
	}

	// --- THEME LOGIC --- (Simplified)
	const isPremiumUser = false; // Disabled for now

	return (
		<div className="min-h-screen bg-background text-foreground transition-colors duration-500">
			{/* --- HEADER --- */}
			<header className="sticky top-0 z-50 backdrop-blur-md border-b bg-background/80">
				<div className="max-w-3xl mx-auto p-4 flex items-center justify-between">
					<div className="flex items-center gap-4">
						<span className="font-bold tracking-tight text-xl hidden md:inline">Life Tracker</span>

						{/* RPG HUD */}
						<span
							onClick={() => setShowShop(true)}
							className="text-yellow-500 flex items-center gap-2 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20 font-bold text-sm shadow-[0_0_10px_rgba(234,179,8,0.2)] cursor-pointer hover:bg-yellow-500/20 transition-all">
							<Coins size={16} /> {gold}
						</span>
						<div className="flex flex-col min-w-[140px] gap-1 mr-4 cursor-help group relative">
							<div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
								<div className="flex items-center gap-2">
									<span className="text-foreground">Lvl {currentLevel}</span>
								</div>
								<span>{Math.round(levelProgress)}%</span>
							</div>
							<div className="h-2 w-full bg-secondary rounded-full overflow-hidden border border-secondary">
								<div
									className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
									style={{ width: `${levelProgress}%` }}
								/>
							</div>
							{/* Tooltip simple */}
							<div className="absolute top-full mt-2 left-0 bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48">
								¡Sigue completando tareas para subir de nivel!
							</div>
						</div>

						{/* STREAK BADGE */}
						<div className="flex items-center gap-1 text-sm font-medium text-orange-500">
							<span className="text-xs">🔥</span> {currentStreak} días
						</div>
					</div>

					<div className="flex items-center gap-2">
						<Button variant="ghost" size="icon" onClick={() => setShowAchievements(true)}>
							<Award className="h-5 w-5 text-yellow-500" />
						</Button>
						<Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
							<Settings className="h-5 w-5" />
						</Button>

						<ModeToggle />
					</div>
				</div>
			</header>

			<main className="max-w-3xl mx-auto p-6 space-y-8 pb-32">
				{/* --- TABS --- */}
				<div className="grid grid-cols-6 p-1 bg-muted rounded-xl">
					<button
						onClick={() => setActiveTab('input')}
						className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
							activeTab === 'input' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
						}`}>
						<Calendar size={16} />
						<span className="hidden sm:inline">Diario</span>
					</button>
					<button
						onClick={() => setActiveTab('tasks')}
						className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
							activeTab === 'tasks' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
						}`}>
						<CheckSquare size={16} />
						<span className="hidden sm:inline">Tareas</span>
					</button>
					<button
						onClick={() => setActiveTab('analytics')}
						className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
							activeTab === 'analytics' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
						}`}>
						<BarChart size={16} />
						<span className="hidden sm:inline">Analítica</span>
					</button>
					<button
						onClick={() => setActiveTab('brain')}
						className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
							activeTab === 'brain' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
						}`}>
						<Brain size={16} />
						<span className="hidden sm:inline">Cerebro</span>
					</button>
					<button
						onClick={() => setActiveTab('quests')}
						className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
							activeTab === 'quests' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
						}`}>
						<Scroll size={16} />
						<span className="hidden sm:inline">Misiones</span>
					</button>
					<button
						onClick={() => setActiveTab('finance')}
						className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
							activeTab === 'finance' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
						}`}>
						<Coins size={16} />
						<span className="hidden sm:inline">Finanzas</span>
					</button>
				</div>

				{/* --- CONTENT --- */}
				{activeTab === 'input' ? (
					<div className="space-y-6">
						{/* DATE NAVIGATION */}
						<div className="flex items-center justify-between bg-card border rounded-lg p-2">
							<Button variant="ghost" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
								<ChevronLeft className="h-4 w-4" />
							</Button>

							<div className="text-center">
								<h2 className="text-lg font-bold capitalize leading-none">{isToday ? 'Hoy' : format(currentDate, 'EEEE', { locale: es })}</h2>
								<p className="text-xs text-muted-foreground pt-1 capitalize">{format(currentDate, "d 'de' MMMM", { locale: es })}</p>
							</div>

							<Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 1))} disabled={isToday}>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>

						<DailyInput data={data} dateKey={dateKey} onUpdate={handleUpdate} onGainXP={gainXP} />
					</div>
				) : activeTab === 'analytics' ? (
					<AnalyticsView data={data} />
				) : activeTab === 'tasks' ? (
					<TasksView
						data={data}
						onUpdate={handleUpdate}
						onEventsUpdate={handleEventsUpdate}
						onNavigateDate={(date) => {
							setCurrentDate(date);
							setActiveTab('input');
						}}
						onGainXP={gainXP}
					/>
				) : activeTab === 'quests' ? (
					<QuestsView
						data={data}
						onUpdate={handleUpdate}
						onGainXP={gainXP}
						onAddGold={(amount, reason) => {
							if (!data) return;
							const newGold = (data.user.gold || 0) + amount;
							handleUpdate({
								...data,
								user: { ...data.user, gold: newGold },
							});
						}}
					/>
				) : activeTab === 'finance' ? (
					<LockedFeature level={currentLevel} requiredLevel={2} fallbackText="Módulo de Finanzas" className="h-64">
						<div className="p-8 text-center border-2 border-dashed rounded-xl">
							<h2 className="text-2xl font-bold mb-2">💰 Bóveda Financiera</h2>
							<p className="text-muted-foreground">Aquí podrás gestionar tus gastos e ingresos.</p>
							{/* Placeholder for future finance component */}
						</div>
					</LockedFeature>
				) : (
					<BrainView notes={data.notes || []} onUpdate={handleNotesUpdate} />
				)}
			</main>
		</div>
	);
}

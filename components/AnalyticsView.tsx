'use client';

import { eachDayOfInterval, format, subDays } from 'date-fns';
import * as React from 'react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis, // Added
	Radar,
	RadarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AttributeKey, DB } from '@/lib/types';
import { cn } from '@/lib/utils';

type AnalyticsProps = {
	data: DB;
};

export function AnalyticsView({ data }: AnalyticsProps) {
	if (!data) return null;

	// --- 0. RPG RADAR CHART (Attributes) ---
	const today = new Date();
	const attributeData = [
		{
			subject: 'Fuerza (STR)',
			A: data.user?.attributes?.STR || 0,
			fullMark: 100,
		},
		{
			subject: 'Inteligencia (INT)',
			A: data.user?.attributes?.INT || 0,
			fullMark: 100,
		},
		{
			subject: 'Voluntad (WIL)',
			A: data.user?.attributes?.WIL || 0,
			fullMark: 100,
		},
		{
			subject: 'Creatividad (CRE)',
			A: data.user?.attributes?.CRE || 0,
			fullMark: 100,
		},
	];

	const habits = (data.config?.habits as unknown as { name: string }[]) || [];

	// --- 1. RADAR CHART DATA (Balance) ---
	const radarData = habits.map((habit) => {
		const daysCheck = 30;
		let count = 0;
		const habitName = typeof habit === 'string' ? habit : habit.name;

		for (let i = 0; i < daysCheck; i++) {
			const dateKey = format(subDays(today, i), 'yyyy-MM-dd');
			if (data.entries?.[dateKey]?.habits?.[habitName]) count++;
		}
		return {
			subject: habitName,
			A: (count / daysCheck) * 100,
			fullMark: 100,
		};
	});

	// --- 2. HEATMAP DATA (Intensity) ---
	const yearStart = subDays(today, 365);
	const daysMap = eachDayOfInterval({ start: yearStart, end: today });

	const getIntensity = (date: Date) => {
		const key = format(date, 'yyyy-MM-dd');
		const entry = data.entries?.[key];
		if (!entry) return 0;

		const totalHabits = habits.length;
		const doneHabits = Object.values(entry.habits || {}).filter(Boolean).length;
		const habitScore = totalHabits > 0 ? (doneHabits / totalHabits) * 8 : 0;

		const totalTasks = Object.keys(entry.tasks || {}).length;
		const doneTasks = Object.values(entry.tasks || {}).filter(Boolean).length;
		const taskScore = totalTasks > 0 ? (doneTasks / totalTasks) * 2 : 0;

		return Math.min(habitScore + taskScore, 10);
	};

	// --- 3. TREND DATA (Sleep vs Screen) ---
	const trendData = [];
	for (let i = 14; i >= 0; i--) {
		const d = subDays(today, i);
		const k = format(d, 'yyyy-MM-dd');
		// Defensive access: entries[k] might be undefined
		const entry = data.entries?.[k] || {};
		trendData.push({
			name: format(d, 'dd/MM'),
			sueño: entry.metrics?.['Horas de Sueño'] || 0,
			movil: entry.metrics?.['Horas de Móvil'] || 0,
		});
	}

	// --- 4. PRODUCTIVITY DATA (Tasks vs Habits) ---
	const productivityData = [];
	for (let i = 6; i >= 0; i--) {
		const d = subDays(today, i);
		const k = format(d, 'yyyy-MM-dd');
		const entry = data.entries?.[k] || {}; // Defensive access

		const doneHabits = Object.values(entry.habits || {}).filter(Boolean).length;
		const doneTasks = Object.values(entry.tasks || {}).filter(Boolean).length;

		productivityData.push({
			name: format(d, 'EEE', { locale: require('date-fns/locale').es }),
			habitos: doneHabits,
			tareas: doneTasks,
		});
	}

	const avgConsistency = radarData.length > 0 ? Math.round(radarData.reduce((acc, curr) => acc + curr.A, 0) / habits.length) : 0;

	return (
		<div className="space-y-8 animate-in fade-in duration-500 pb-20">
			{/* KPI CARDS */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Consistencia (30d)</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{avgConsistency}%</div>
						<p className="text-xs text-muted-foreground">Disciplina en hábitos fijos</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Tareas Hoy</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{Object.values(data.entries?.[format(today, 'yyyy-MM-dd')]?.tasks || {}).filter(Boolean).length}</div>
						<p className="text-xs text-muted-foreground">Objetivos diarios cumplidos</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">Estado Mental</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">Enfoque</div>
						<p className="text-xs text-muted-foreground">Basado en volumen de actividad</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				{/* PRODUCTIVITY CHART (NEW) */}
				<Card className="md:col-span-2">
					<CardHeader>
						<CardTitle>Volumen de Producción</CardTitle>
						<CardDescription>Comparativa de Hábitos vs Tareas (últimos 7 días)</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="bph-[300px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={productivityData}>
									<CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
									<XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" />
									<YAxis fontSize={12} stroke="var(--muted-foreground)" />
									<Tooltip
										cursor={{ fill: 'var(--muted)/0.2' }}
										contentStyle={{
											backgroundColor: 'var(--card)',
											borderRadius: '8px',
											border: '1px solid var(--border)',
										}}
									/>
									<Bar dataKey="habitos" fill="var(--primary)" name="Hábitos" radius={[4, 4, 0, 0]} barSize={30} />
									<Bar dataKey="tareas" fill="#3b82f6" name="Tareas" radius={[4, 4, 0, 0]} barSize={30} />
								</BarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* ATTRIBUTE RADAR CHART (NEW) */}
				<Card>
					<CardHeader>
						<CardTitle>Perfil de Habilidades</CardTitle>
						<CardDescription>Nivel de Atributos Actual</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-[300px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<RadarChart cx="50%" cy="50%" outerRadius="70%" data={attributeData}>
									<PolarGrid stroke="var(--muted-foreground)" opacity={0.2} />
									<PolarAngleAxis
										dataKey="subject"
										tick={{
											fill: 'var(--primary)',
											fontSize: 10,
											fontWeight: 'bold',
										}}
									/>
									<PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
									<Radar name="Stats" dataKey="A" stroke="var(--primary)" strokeWidth={3} fill="var(--primary)" fillOpacity={0.5} />
									<Tooltip
										contentStyle={{
											backgroundColor: 'var(--card)',
											borderRadius: '8px',
											color: 'var(--foreground)',
										}}
									/>
								</RadarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* RADAR CHART (Habits) */}
				<Card>
					<CardHeader>
						<CardTitle>Rueda de la Vida</CardTitle>
						<CardDescription>Equilibrio entre hábitos (30 días)</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-[300px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
									<PolarGrid stroke="var(--muted-foreground)" opacity={0.2} />
									<PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--foreground)', fontSize: 10 }} />
									<Radar name="Disciplina" dataKey="A" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} />
									<Tooltip
										contentStyle={{
											backgroundColor: 'var(--card)',
											borderRadius: '8px',
										}}
									/>
								</RadarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* TRENDS CHART */}
				<Card>
					<CardHeader>
						<CardTitle>Foco y Energía</CardTitle>
						<CardDescription>Correlación Sueño/Móvil (14 días)</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-[300px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={trendData}>
									<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
									<XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" />
									<YAxis fontSize={12} stroke="var(--muted-foreground)" />
									<Tooltip
										contentStyle={{
											backgroundColor: 'var(--card)',
											borderRadius: '8px',
										}}
									/>
									<Line type="monotone" dataKey="sueño" stroke="#10b981" strokeWidth={2} name="Sueño (h)" dot={false} />
									<Line type="monotone" dataKey="movil" stroke="#ef4444" strokeWidth={2} name="Móvil (h)" dot={false} />
								</LineChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* HEATMAP */}
			<Card>
				<CardHeader>
					<CardTitle>Mapa de Consistencia</CardTitle>
					<CardDescription>Intensidad diaria (Hábitos + Tareas)</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-1">
						{daysMap.map((day) => {
							const intensity = getIntensity(day);
							return (
								<div
									key={day.toISOString()}
									className={cn(
										'w-3 h-3 rounded-[2px] transition-colors hover:ring-2 ring-primary',
										intensity === 0 && 'bg-muted',
										intensity > 0 && intensity < 3 && 'bg-primary/20',
										intensity >= 3 && intensity < 6 && 'bg-primary/50',
										intensity >= 6 && 'bg-primary',
									)}
									title={`${format(day, 'yyyy-MM-dd')}: Intensidad ${Math.round(intensity)}`}
								/>
							);
						})}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

import { format, isWeekend, subDays } from "date-fns";

export type Achievement = {
	id: string;
	title: string;
	description: string;
	icon: string;
	condition: (data: any, dateKey: string) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
	// --- RACHAS ---
	{
		id: "streak_3",
		title: "Calentando Motores",
		description: "Mantén una racha de 3 días seguidos.",
		icon: "🔥",
		condition: (data) => calculateStreak(data) >= 3,
	},
	{
		id: "streak_7",
		title: "Imparable",
		description: "Mantén una racha de 7 días seguidos.",
		icon: "🚀",
		condition: (data) => calculateStreak(data) >= 7,
	},
	{
		id: "streak_14",
		title: "Hábito Formado",
		description: "Mantén una racha de 14 días seguidos.",
		icon: "🏗️",
		condition: (data) => calculateStreak(data) >= 14,
	},
	{
		id: "streak_21",
		title: "Estilo de Vida",
		description: "Mantén una racha de 21 días seguidos.",
		icon: "🧠",
		condition: (data) => calculateStreak(data) >= 21,
	},
	{
		id: "streak_30",
		title: "Guerrero Espartano",
		description: "Mantén una racha de 30 días seguidos.",
		icon: "⚔️",
		condition: (data) => calculateStreak(data) >= 30,
	},

	// --- HÁBITOS ESPECÍFICOS ---
	{
		id: "first_step",
		title: "Primer Paso",
		description: "Completa tu primer registro diario.",
		icon: "👣",
		condition: (data) => Object.keys(data.entries || {}).length >= 1,
	},
	{
		id: "early_bird_streak",
		title: "Club de las 5 AM",
		description: "Completa 'Madrugar' durante 5 días seguidos.",
		icon: "🌅",
		condition: (data) => checkConsecutiveHabit(data, "Madrugar", 5),
	},
	{
		id: "weekend_warrior",
		title: "Guerrero de Finde",
		description: "Completa todos los hábitos un Sábado y Domingo consecutivos.",
		icon: "🎉",
		condition: (data) => checkWeekendWarrior(data),
	},
	{
		id: "no_fail",
		title: "Sin Excusas",
		description: "Registra un día sin ningún 'Fallo' escrito.",
		icon: "✅",
		condition: (data, dateKey) => {
			const entry = data.entries?.[dateKey];
			return (
				entry?.completed &&
				entry?.review?.fail !== undefined &&
				(entry.review.fail.trim() === "" ||
					entry.review.fail.toLowerCase().includes("ninguno"))
			);
		},
	},

	// --- MÉTRICAS ---
	{
		id: "perfect_day",
		title: "Día Perfecto",
		description: "Consigue un Score de 100 puntos en un día.",
		icon: "💯",
		condition: (data, dateKey) => {
			const entry = data.entries?.[dateKey];
			if (!entry || !entry.completed) return false;
			const habits = data.config.habits;
			const doneCount = habits.filter((h: string) => entry.habits?.[h]).length;
			const sleep = entry.metrics?.["Horas de Sueño"] || 0;
			const phone = entry.metrics?.["Horas de Móvil"] || 99;
			const sleepGoal = data.config.goals?.sleep || 7.5;
			const phoneLimit = data.config.goals?.phone || 2.0;

			return (
				doneCount === habits.length && sleep >= sleepGoal && phone <= phoneLimit
			);
		},
	},
	{
		id: "monk_mode",
		title: "Modo Monje",
		description: "Disciplina digital extrema: menos de 1h de móvil hoy.",
		icon: "🧘",
		condition: (data, dateKey) => {
			const entry = data.entries?.[dateKey];
			return (
				entry?.completed &&
				entry?.metrics?.["Horas de Móvil"] !== undefined &&
				entry.metrics["Horas de Móvil"] < 1.0
			);
		},
	},
	{
		id: "digital_detox",
		title: "Detox Digital",
		description: "Usa el móvil menos de 2h durante 3 días seguidos.",
		icon: "📵",
		condition: (data) =>
			checkConsecutiveMetric(data, "Horas de Móvil", (val) => val < 2.0, 3),
	},
	{
		id: "sleep_master",
		title: "Maestro del Sueño",
		description: "Duerme bien (+7.5h) durante 3 días seguidos.",
		icon: "😴",
		condition: (data) =>
			checkConsecutiveMetric(
				data,
				"Horas de Sueño",
				(val) => val >= (data.config.goals?.sleep || 7.5),
				3,
			),
	},
	{
		id: "iron_discipline",
		title: "Disciplina de Hierro",
		description: "Completa TODOS los hábitos durante 5 días seguidos.",
		icon: "🛡️",
		condition: (data) => {
			const today = new Date();
			let consecutive = 0;
			for (let i = 0; i < 30; i++) {
				const d = subDays(today, i);
				const k = format(d, "yyyy-MM-dd");
				const entry = data.entries?.[k];
				if (!entry) break;

				const habits = data.config.habits;
				const allDone =
					habits.length > 0 && habits.every((h: string) => entry.habits?.[h]);

				if (allDone) consecutive++;
				else break;
			}
			return consecutive >= 5;
		},
	},
	{
		id: "journaling_streak",
		title: "Escritor Constante",
		description: "Escribe tu review (victoria/fallo) durante 7 días seguidos.",
		icon: "✍️",
		condition: (data) => checkConsecutiveJournaling(data, 7),
	},
];

// --- HELPERS ---

function calculateStreak(data: any): number {
	let streak = 0;
	const today = new Date();
	for (let i = 0; i < 365; i++) {
		const d = subDays(today, i);
		const k = format(d, "yyyy-MM-dd");
		const entry = data.entries?.[k];
		const habits = data.config.habits;
		const doneCount = entry
			? habits.filter((h: string) => entry.habits?.[h]).length
			: 0;

		// Streak criteria: 50% habits done
		if (habits.length > 0 && doneCount >= habits.length / 2) streak++;
		else if (i === 0) continue;
		else break;
	}
	return streak;
}

function checkConsecutiveMetric(
	data: any,
	metricName: string,
	predicate: (val: number) => boolean,
	days: number,
): boolean {
	const today = new Date();
	let consecutive = 0;
	for (let i = 0; i < 30; i++) {
		const d = subDays(today, i);
		const k = format(d, "yyyy-MM-dd");
		const entry = data.entries?.[k];
		if (!entry || !entry.completed || entry.metrics?.[metricName] === undefined)
			break;

		if (predicate(entry.metrics[metricName])) consecutive++;
		else break;
	}
	return consecutive >= days;
}

function checkConsecutiveHabit(
	data: any,
	habitName: string,
	days: number,
): boolean {
	const today = new Date();
	let consecutive = 0;
	for (let i = 0; i < 30; i++) {
		const d = subDays(today, i);
		const k = format(d, "yyyy-MM-dd");
		const entry = data.entries?.[k];
		if (!entry) break;

		if (entry.habits?.[habitName]) consecutive++;
		else if (i === 0)
			continue; // Allow missing today if checked later
		else break;
	}
	return consecutive >= days;
}

function checkConsecutiveJournaling(data: any, days: number): boolean {
	const today = new Date();
	let consecutive = 0;
	for (let i = 0; i < 30; i++) {
		const d = subDays(today, i);
		const k = format(d, "yyyy-MM-dd");
		const entry = data.entries?.[k];
		if (!entry) break;

		const hasWin = entry.review?.win && entry.review.win.length > 2;
		const hasFail = entry.review?.fail && entry.review.fail.length > 2;

		if (hasWin || hasFail) consecutive++;
		else if (i === 0) continue;
		else break;
	}
	return consecutive >= days;
}

function checkWeekendWarrior(data: any): boolean {
	const today = new Date();
	// Look back up to 7 days to find the last full weekend
	for (let i = 0; i < 7; i++) {
		const d = subDays(today, i);
		if (isWeekend(d)) {
			// Check if it is Sunday, then check Saturday too
			if (d.getDay() === 0) {
				// Sunday
				const sundayKey = format(d, "yyyy-MM-dd");
				const saturdayKey = format(subDays(d, 1), "yyyy-MM-dd");

				const sundayEntry = data.entries?.[sundayKey];
				const saturdayEntry = data.entries?.[saturdayKey];

				if (!sundayEntry || !saturdayEntry) continue;

				const habits = data.config.habits;
				const sunDone = habits.every((h: string) => sundayEntry.habits?.[h]);
				const satDone = habits.every((h: string) => saturdayEntry.habits?.[h]);

				if (sunDone && satDone) return true;
			}
		}
	}
	return false;
}

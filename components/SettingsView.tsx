"use client";

import {
	AlertTriangle,
	Brain,
	Dumbbell,
	Flame,
	Lightbulb,
	Plus,
	Save,
	Trash2,
	X,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useGameSystem } from "@/hooks/useGameSystem";
import type { AttributeKey, DB } from "@/lib/types";

type SettingsProps = {
	data: DB;
	onUpdate: (newData: DB) => void;
	onClose: () => void;
};

export function SettingsView({ data, onUpdate, onClose }: SettingsProps) {
	// RPG Reset Logic
	const { resetProgress } = useGameSystem(data, onUpdate);

	const handleReset = () => {
		if (
			confirm(
				"¿Estás seguro de reiniciar todo tu progreso (Nivel 1, 0 XP)? Esta acción no se puede deshacer.",
			)
		) {
			resetProgress();
		}
	};

	// Local state for form editing before saving
	const [habits, setHabits] = React.useState<
		{ id: string; name: string; attribute: AttributeKey }[]
	>(
		Array.isArray(data.config?.habits) &&
			typeof data.config.habits[0] === "string"
			? [] // Fallback for migration
			: (data.config?.habits as any) || [],
	);
	const [goals, setGoals] = React.useState({
		sleep: data.config?.goals?.sleep || 7.5,
		phone: data.config?.goals?.phone || 2.0,
	});

	const [newHabit, setNewHabit] = React.useState("");
	const [newHabitAttr, setNewHabitAttr] = React.useState<AttributeKey>("STR");

	const handleAddHabit = () => {
		if (!newHabit.trim()) return;
		if (habits.some((h) => h.name === newHabit.trim())) {
			toast.error("Ese hábito ya existe");
			return;
		}
		setHabits([
			...habits,
			{
				id: crypto.randomUUID(),
				name: newHabit.trim(),
				attribute: newHabitAttr,
			},
		]);
		setNewHabit("");
	};

	const handleDeleteHabit = (id: string) => {
		setHabits(habits.filter((h) => h.id !== id));
	};

	const handleSave = () => {
		const newData = {
			...data,
			config: {
				...data.config,
				habits: habits,
				goals: goals,
			},
		};
		onUpdate(newData);
		toast.success("Configuración actualizada");
		onClose();
	};

	return (
		<div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Configuración</h2>
				<Button variant="ghost" size="icon" onClick={onClose}>
					<X className="h-5 w-5" />
				</Button>
			</div>

			{/* --- OBJECTIVES --- */}
			<Card>
				<CardHeader>
					<CardTitle>Objetivos y Límites</CardTitle>
					<CardDescription>Define tus estándares de éxito.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">
								Meta de Sueño (horas)
							</label>
							<input
								type="number"
								step="0.5"
								className="w-full p-2 bg-muted rounded-md border border-transparent focus:border-primary outline-none"
								value={goals.sleep || ""}
								placeholder="0"
								onChange={(e) => {
									const val = e.target.value;
									const num = val === "" ? 0 : parseFloat(val);
									setGoals({ ...goals, sleep: num });
								}}
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">
								Límite de Móvil (horas)
							</label>
							<input
								type="number"
								step="0.5"
								className="w-full p-2 bg-muted rounded-md border border-transparent focus:border-primary outline-none"
								value={goals.phone || ""}
								placeholder="0"
								onChange={(e) => {
									const val = e.target.value;
									const num = val === "" ? 0 : parseFloat(val);
									setGoals({ ...goals, phone: num });
								}}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* --- HABITS MANAGEMENT --- */}
			<Card>
				<CardHeader>
					<CardTitle>Editor de Hábitos</CardTitle>
					<CardDescription>Diseña tu protocolo diario ideal.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-2">
						<input
							className="flex-1 p-2 bg-muted rounded-md border border-transparent focus:border-primary outline-none"
							placeholder="Nuevo hábito (ej: Leer 10 min)"
							value={newHabit}
							onChange={(e) => setNewHabit(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAddHabit()}
						/>
						<select
							className="p-2 bg-muted rounded-md border border-transparent focus:border-primary outline-none text-sm font-medium"
							value={newHabitAttr}
							onChange={(e) => setNewHabitAttr(e.target.value as AttributeKey)}
						>
							<option value="STR">STR (Fuerza)</option>
							<option value="INT">INT (Inteligencia)</option>
							<option value="WIL">WIL (Voluntad)</option>
							<option value="CRE">CRE (Creatividad)</option>
						</select>
						<Button onClick={handleAddHabit} size="icon">
							<Plus className="h-4 w-4" />
						</Button>
					</div>

					<div className="space-y-2">
						{habits.map((habit) => (
							<div
								key={habit.id}
								className="flex items-center justify-between p-3 rounded-lg border bg-card"
							>
								<div className="flex items-center gap-3">
									<div
										className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
											habit.attribute === "STR"
												? "bg-red-100 text-red-600"
												: habit.attribute === "INT"
													? "bg-blue-100 text-blue-600"
													: habit.attribute === "WIL"
														? "bg-purple-100 text-purple-600"
														: "bg-yellow-100 text-yellow-600"
										}`}
									>
										{habit.attribute}
									</div>
									<span className="font-medium">{habit.name}</span>
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="text-muted-foreground hover:text-destructive"
									onClick={() => handleDeleteHabit(habit.id)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						))}
						{habits.length === 0 && (
							<p className="text-center text-muted-foreground py-4 text-sm italic">
								No tienes hábitos definidos. ¡Añade uno arriba!
							</p>
						)}
					</div>
				</CardContent>
			</Card>

			{/* --- DANGER ZONE --- */}
			<Card className="border-red-500/20 bg-red-500/5">
				<CardHeader>
					<CardTitle className="text-red-500 flex items-center gap-2">
						<AlertTriangle size={18} /> Zona de Peligro
					</CardTitle>
					<CardDescription>Acciones irreversibles.</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="destructive"
						onClick={handleReset}
						className="w-full sm:w-auto"
					>
						Reiniciar Personaje (Nivel 1)
					</Button>
				</CardContent>
			</Card>

			<div className="pt-4 flex justify-end gap-2">
				<Button variant="outline" onClick={onClose}>
					Cancelar
				</Button>
				<Button onClick={handleSave} className="gap-2">
					<Save className="h-4 w-4" /> Guardar Cambios
				</Button>
			</div>
		</div>
	);
}

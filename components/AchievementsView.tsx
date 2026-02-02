"use client";

import { Lock, Trophy, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { cn } from "@/lib/utils";

type AchievementsProps = {
	data: any;
	onClose: () => void;
};

export function AchievementsView({ data, onClose }: AchievementsProps) {
	// Get unlocked achievements from data (stored as ID -> Date)
	const unlocked = data.achievements || {};
	const unlockedCount = Object.keys(unlocked).length;
	const totalCount = ACHIEVEMENTS.length;
	const progress = (unlockedCount / totalCount) * 100;

	return (
		<div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="bg-yellow-500/20 p-2 rounded-full text-yellow-500">
						<Trophy className="h-6 w-6" />
					</div>
					<div>
						<h2 className="text-2xl font-bold">Sala de Trofeos</h2>
						<p className="text-muted-foreground text-sm">
							{unlockedCount} de {totalCount} desbloqueados
						</p>
					</div>
				</div>
				<Button variant="ghost" size="icon" onClick={onClose}>
					<X className="h-5 w-5" />
				</Button>
			</div>

			{/* Progress Bar */}
			<div className="h-3 w-full bg-muted rounded-full overflow-hidden">
				<div
					className="h-full bg-yellow-500 transition-all duration-500"
					style={{ width: `${progress}%` }}
				/>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{ACHIEVEMENTS.map((achievement) => {
					const isUnlocked = !!unlocked[achievement.id];
					const unlockDate = isUnlocked
						? new Date(unlocked[achievement.id]).toLocaleDateString()
						: null;

					return (
						<Card
							key={achievement.id}
							className={cn(
								"relative overflow-hidden transition-all duration-300 border-2",
								isUnlocked
									? "border-yellow-500/50 bg-yellow-500/5 shadow-lg"
									: "border-border/50 bg-muted/20 opacity-70 grayscale",
							)}
						>
							<CardContent className="p-4 flex items-center gap-4">
								<div
									className={cn(
										"text-4xl p-3 rounded-xl flex items-center justify-center h-16 w-16",
										isUnlocked ? "bg-background shadow-sm" : "bg-muted",
									)}
								>
									{achievement.icon}
								</div>

								<div className="flex-1 space-y-1">
									<div className="flex items-center justify-between">
										<h3
											className={cn(
												"font-bold",
												isUnlocked && "text-foreground",
											)}
										>
											{achievement.title}
										</h3>
										{!isUnlocked && (
											<Lock className="h-4 w-4 text-muted-foreground" />
										)}
									</div>
									<p className="text-sm text-muted-foreground leading-snug">
										{achievement.description}
									</p>
									{isUnlocked && (
										<p className="text-xs text-yellow-600/80 font-mono mt-1">
											Desbloqueado el {unlockDate}
										</p>
									)}
								</div>

								{isUnlocked && (
									<div className="absolute top-0 right-0 p-2 opacity-10 rotate-12">
										<Trophy className="h-24 w-24" />
									</div>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
}

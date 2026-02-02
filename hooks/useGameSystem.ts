import confetti from "canvas-confetti";
import { toast } from "sonner";
import type { AttributeKey, DB, UserProfile } from "@/lib/types";

export const LEVEL_SCALING_FACTOR = 100; // XP = Level^2 * 100

export function useGameSystem(
	data: DB | null,
	onUpdate: (newData: DB) => void,
) {
	const user = data?.user;

	const calculateLevel = (xp: number) => {
		return Math.floor(Math.sqrt(xp / LEVEL_SCALING_FACTOR)) + 1;
	};

	const getXPForNextLevel = (level: number) => {
		return level ** 2 * LEVEL_SCALING_FACTOR;
	};

	const gainXP = (
		amount: number,
		reason: string,
		dataOverride?: DB,
		attribute?: AttributeKey,
	) => {
		const currentData = dataOverride || data;
		if (!currentData) return;

		// Default user if missing
		const user = currentData.user || {
			xp: 0,
			level: 1,
			gold: 0,
			attributes: { STR: 0, INT: 0, WIL: 0, CRE: 0 },
			history: [],
		};

		const newXP = Math.max(0, (user.xp || 0) + amount);

		// 💰 GOLD LOGIC
		let goldChange = 0;
		if (amount > 0) {
			goldChange = Math.floor(amount * 0.5);
			if (goldChange < 1) goldChange = 1;
		} else {
			goldChange = Math.ceil(amount * 0.5);
		}

		const newGold = Math.max(0, (user.gold || 0) + goldChange);

		const oldLevel = user.level || 1;
		const newLevel = calculateLevel(newXP);
		const isLevelDown = newLevel < oldLevel;

		// Update Attributes - DEFENSIVE
		const newAttributes = {
			...(user.attributes || { STR: 0, INT: 0, WIL: 0, CRE: 0 }),
		};
		if (attribute) {
			newAttributes[attribute] = Math.max(
				0,
				(newAttributes[attribute] || 0) + (amount > 0 ? 1 : -1),
			);
		}

		const newHistory = [
			{
				id: crypto.randomUUID(),
				date: new Date().toISOString(),
				action: reason,
				xpGained: amount,
				attribute,
			},
			...(user.history || []),
		].slice(0, 50);

		const updatedUser: UserProfile = {
			...user,
			xp: newXP,
			gold: newGold,
			level: newLevel,
			attributes: newAttributes,
			history: newHistory,
		};

		// IMPORTANTE: Preservar TODO de currentData (incluye entries actualizados)
		const updatedData = { ...currentData, user: updatedUser };

		// Level Up/Down Events
		if (newLevel > oldLevel) {
			confetti({
				particleCount: 150,
				spread: 70,
				origin: { y: 0.6 },
				colors: ["#FFD700", "#FFA500", "#FF4500"],
			});
			toast.success(`¡Nivel ${newLevel} Alcanzado! ⚔️`, {
				description: "Has subido de nivel. ¡Sigue así!",
				duration: 5000,
			});
		} else if (isLevelDown) {
			toast.error(`¡Has bajado al Nivel ${newLevel}! 📉`, {
				description: "Cuidado, estás perdiendo progreso.",
				duration: 5000,
			});
		} else {
			// Toast de XP/Gold normal
			if (amount > 0) {
				const attrText = attribute ? ` | +1 ${attribute}` : "";
				toast.success(`+${amount} XP | +${goldChange} 🪙${attrText}`, {
					description: reason,
				});
			} else {
				const attrText = attribute ? ` | -1 ${attribute}` : "";
				toast.error(`${amount} XP | ${goldChange} 🪙${attrText}`, {
					description: reason,
				});
			}
		}

		// CLAVE: Solo guardamos UNA VEZ
		onUpdate(updatedData);
	};

	const spendGold = (amount: number) => {
		if (!data || !user) return false;
		if ((user.gold || 0) < amount) {
			toast.error("No tienes suficiente oro");
			return false;
		}

		const updatedUser = { ...user, gold: (user.gold || 0) - amount };
		const updatedData = { ...data, user: updatedUser };
		onUpdate(updatedData);
		return true;
	};

	const addGold = (amount: number) => {
		if (!data || !user) return;
		const updatedUser = { ...user, gold: (user.gold || 0) + amount };
		const updatedData = { ...data, user: updatedUser };
		onUpdate(updatedData);
	};

	const resetProgress = () => {
		if (!data || !user) return;

		const updatedUser: UserProfile = {
			...user,
			xp: 0,
			gold: 0,
			level: 1,
			attributes: { STR: 0, INT: 0, WIL: 0, CRE: 0 },
			history: [],
		};

		const updatedData = { ...data, user: updatedUser };
		onUpdate(updatedData);
		toast.info("Perfil reiniciado a Nivel 1");
	};

	const progress = user
		? {
				currentLevel: user.level,
				currentXP: user.xp,
				nextLevelXP: getXPForNextLevel(user.level),
				prevLevelXP: getXPForNextLevel(user.level - 1),
			}
		: null;

	const levelProgress = progress
		? ((progress.currentXP - progress.prevLevelXP) /
				(progress.nextLevelXP - progress.prevLevelXP)) *
			100
		: 0;

	return {
		gainXP,
		addGold,
		spendGold,
		resetProgress,
		levelProgress,
		currentLevel: user?.level || 1,
		xp: user?.xp || 0,
		gold: user?.gold || 0,
		attributes: user?.attributes || { STR: 0, INT: 0, WIL: 0, CRE: 0 },
	};
}

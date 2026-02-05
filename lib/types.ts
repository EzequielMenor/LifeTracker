export interface AttributeStats {
	STR: number; // Strength (Fuerza)
	INT: number; // Intellect (Inteligencia)
	WIL: number; // Willpower (Voluntad)
	CRE: number; // Creativity (Creatividad/Carisma)
}

export interface UserProfile {
	xp: number;
	level: number;
	gold?: number;
	attributes: AttributeStats;
	history: Array<{
		id: string;
		date: string;
		action: string;
		xpGained: number;
		attribute?: keyof AttributeStats;
	}>;
	inventory: string[];
}

export type AttributeKey = 'STR' | 'INT' | 'WIL' | 'CRE';

export interface Reward {
	id: string;
	name: string;
	cost: number;
	icon?: string;
}

export interface Config {
	habits: { id: string; name: string; attribute: AttributeKey }[];
	rewards?: Reward[];
	metrics: string[];
	goals: {
		sleep?: number;
		phone?: number;
		[key: string]: number | undefined;
	};
	activeTheme?: string;
}

export interface Task {
	name: string;
	completed: boolean;
	questId?: string;
	createdAt?: string;
}

export interface Entry {
	habits: Record<string, boolean>;
	metrics: Record<string, number>;
	tasks: Record<string, Task>;
	review: {
		win?: string;
		fail?: string;
		fix?: string;
	};
	completed?: boolean;
}

export interface Boss {
	id: string;
	name: string;
	description?: string;
	totalHp: number;
	currentHp: number;
	xpReward: number;
	goldReward?: number; // For Phase 4
	damageType?: AttributeKey;
	status: 'active' | 'defeated';
	deadline?: string;
}

// Quest System Types
export type QuestDifficulty = 'common' | 'rare' | 'epic' | 'legendary';
export type QuestStatus = 'active' | 'completed' | 'archived';

export interface Quest {
	id: string;
	title: string;
	description: string;
	difficulty: QuestDifficulty;
	attribute?: AttributeKey;
	documentation: string;
	xpReward: number;
	goldReward: number;
	deadline?: string;
	status: QuestStatus;
	createdAt: string;
	completedAt?: string;
}

export interface DB {
	user: UserProfile;
	config: Config;
	entries: Record<string, Entry>;
	bosses?: Boss[]; // Optional for now to not break init
	achievements?: Record<string, string>;
	events?: any[];
	notes?: any[];
	quests?: Quest[];
}

export interface Note {
	id: string;
	title: string;
	content: string;
	tags: string[];
	updatedAt: string;
	createdAt: string;
}

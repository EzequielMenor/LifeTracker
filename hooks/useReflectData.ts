import { createClient } from '@/utils/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DB, AttributeKey, UserProfile, Entry, Quest, Note } from '@/lib/types';

// Convert SQL format to App format (DB Interface) using implicit 'any' processing for mapping
function transformToLegacyFormat(profile: any, habits: any[], logs: any[], notes: any[], quests: any[]): DB {
	// Reconstruct the entries map
	const entries: Record<string, Entry> = {};
	logs.forEach((log) => {
		entries[log.date] = {
			habits: log.completed_habits || {},
			metrics: log.metrics || {},
			tasks: {}, // We don't have tasks table yet in SQL logs
			review: {
				win: log.review_win,
				fail: log.review_fail,
				fix: log.review_fix,
			},
			completed: log.completed, // Assuming we might add this later
		};
	});

	// Reconstruct Config
	const configHabits = habits.map((h) => ({
		id: h.id,
		name: h.name,
		attribute: h.attribute as AttributeKey,
	}));

	return {
		user: {
			xp: profile.xp,
			level: profile.level,
			gold: profile.gold,
			attributes: profile.attributes,
			inventory: profile.inventory,
			history: [], // We fetch history separately if needed
		},
		config: {
			habits: configHabits,
			metrics: ['Horas de Sueño', 'Horas de Móvil'], // Hardcode or fetch from another table
			goals: { sleep: 7, phone: 3 },
		},
		entries,
		notes: notes.map((n) => ({
			id: n.id,
			title: n.title,
			content: n.content,
			tags: n.tags,
			createdAt: n.created_at,
			updatedAt: n.updated_at,
		})),
		quests: quests.map((q) => ({
			id: q.id,
			title: q.title,
			description: q.description,
			difficulty: q.difficulty,
			status: q.status,
			xpReward: q.xp_reward,
			goldReward: q.gold_reward,
			documentation: '',
			createdAt: q.created_at,
		})),
	};
}

export function useReflectData() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	const { data, isLoading, error } = useQuery({
		queryKey: ['reflect-data'],
		queryFn: async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error('No Auth');

			// Parallel Fetching
			const [profileRes, habitsRes, logsRes, notesRes, questsRes] = await Promise.all([
				supabase.from('profiles').select('*').eq('id', user.id).single(),
				supabase.from('habits').select('*').eq('user_id', user.id).eq('active', true),
				supabase.from('daily_logs').select('*').eq('user_id', user.id),
				supabase.from('notes').select('*').eq('user_id', user.id),
				supabase.from('quests').select('*').eq('user_id', user.id),
			]);

			if (profileRes.error) throw profileRes.error;

			return transformToLegacyFormat(profileRes.data, habitsRes.data || [], logsRes.data || [], notesRes.data || [], questsRes.data || []);
		},
	});

	// GENERIC UPDATE FUNCTION (Simulates the old monolithic update for compatibility)
	// In the future, we should split this into specific mutations
	const updateData = useMutation({
		mutationFn: async (newData: DB) => {
			// This is a "compatibility layer" mutation.
			// Ideally we don't send the WHOLE local state back to SQL.
			// Currently, `useGameSystem` modifies the local object locally and then calls this.
			// We need to detect WHAT changed and only update that table.

			// FOR PHASE 1: WE ONLY IMPLEMENT PROFILE SYNC (XP/GOLD) and LOGS
			// Habits and Notes have their own logic usually, but here everything passes through.

			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;

			// 1. Update Profile
			if (newData.user) {
				await supabase
					.from('profiles')
					.update({
						xp: newData.user.xp,
						level: newData.user.level,
						gold: newData.user.gold,
						attributes: newData.user.attributes,
						inventory: newData.user.inventory,
					})
					.eq('id', user.id);
			}

			// 2. We can't easily diff entries without complexity.
			// For now, let's just say this hook is mostly for reading.
			// Specialized mutations should be created for actions.
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['reflect-data'] });
		},
	});

	return { data, isLoading, updateData };
}

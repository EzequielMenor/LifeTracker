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
	// GENERIC UPDATE FUNCTION
	const updateData = useMutation({
		mutationFn: async (newData: DB) => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;

			// 1. Update Profile (Always update for now, or diff if needed)
			if (newData.user) {
				const { error: profileError } = await supabase
					.from('profiles')
					.update({
						xp: newData.user.xp,
						level: newData.user.level,
						gold: newData.user.gold,
						attributes: newData.user.attributes,
						inventory: newData.user.inventory,
					})
					.eq('id', user.id);

				if (profileError) console.error('Profile update failed:', profileError);
			}

			// 2. Update Daily Logs (Entries) - Smart Diffing
			// We access the previous data from the cache to see what changed
			const previousData = queryClient.getQueryData<DB>(['reflect-data']);
			const entriesToUpsert = [];

			if (newData.entries) {
				for (const [date, entry] of Object.entries(newData.entries)) {
					const oldEntry = previousData?.entries?.[date];
					// Simple JSON stringify comparison to detect changes
					if (!oldEntry || JSON.stringify(oldEntry) !== JSON.stringify(entry)) {
						entriesToUpsert.push({
							user_id: user.id,
							date: date,
							metrics: entry.metrics || {},
							completed_habits: entry.habits || {},
							review_win: entry.review?.win || null,
							review_fail: entry.review?.fail || null,
							review_fix: entry.review?.fix || null,
							completed: entry.completed || false,
							updated_at: new Date().toISOString(),
						});
					}
				}
			}

			if (entriesToUpsert.length > 0) {
				const { error: logsError } = await supabase.from('daily_logs').upsert(entriesToUpsert, { onConflict: 'user_id, date' });

				if (logsError) console.error('Logs update failed:', logsError);
			}
		},
		onMutate: async (newData) => {
			// Optimistic Update
			await queryClient.cancelQueries({ queryKey: ['reflect-data'] });
			const previousData = queryClient.getQueryData(['reflect-data']);
			queryClient.setQueryData(['reflect-data'], newData);
			return { previousData };
		},
		onError: (err, newData, context) => {
			// Rollback on error
			if (context?.previousData) {
				queryClient.setQueryData(['reflect-data'], context.previousData);
			}
			toast.error('Error al guardar cambios');
			console.error('Mutation failed:', err);
		},
		onSuccess: () => {
			// Instead of invalidating immediately (which might cause flickering),
			// we can rely on our optimistic update or invalidate silently.
			// invalidating ensures consistency but can be jarring if the fetch is slow.
			// Let's invalidate to be safe, but maybe with a debounce or just trust optimistic for now?
			// For "static" feeling, invalidating is good to confirm server state.
			queryClient.invalidateQueries({ queryKey: ['reflect-data'] });
		},
	});

	return { data, isLoading, updateData };
}

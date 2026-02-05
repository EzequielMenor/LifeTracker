import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing Supabase credentials in .env.local');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// HARDCODED ID from your logs (The main user)
const TARGET_USER_ID = '85972b85-9044-4949-b232-98118cf7d417';

async function migrateFromLocalJSON() {
	console.log('🚀 Starting Relational Migration from local db.json...');

	const filePath = path.join(process.cwd(), 'data', 'db.json');
	if (!fs.existsSync(filePath)) {
		console.error('❌ data/db.json not found!');
		return;
	}

	const fileContent = fs.readFileSync(filePath, 'utf-8');
	const jsonData = JSON.parse(fileContent);

	console.log(`👤 Migrating data for User ID: ${TARGET_USER_ID}`);

	try {
		// A. MIGRATE PROFILE
		console.log('   -> Migrating Profile...');
		const profileData = {
			id: TARGET_USER_ID,
			level: jsonData.user.level || 1,
			xp: jsonData.user.xp || 0,
			gold: jsonData.user.gold || 0,
			attributes: jsonData.user.attributes || { STR: 0, INT: 0, WIL: 0, CRE: 0 },
			inventory: jsonData.user.inventory || [],
			updated_at: new Date().toISOString(),
		};

		// We use upsert but we might need to create the auth user first if it doesn't exist?
		// No, the user ID comes from Auth logs, so it MUST exist in auth.users.
		// However, it might NOT exist in public.profiles yet if the trigger didn't run or is new.
		// If using Service Key, we can insert into profiles.
		const { error: profileError } = await supabase.from('profiles').upsert(profileData);
		if (profileError) {
			console.warn(`⚠️ Profile upsert warning (user might not exist in public.profiles yet?): ${profileError.message}`);
			// Fallback: If profile doesn't exist, we might need to insert it manually IF the trigger failed.
			// But upsert above should handle it IF the ID is in auth.users.
		}

		// B. MIGRATE HABITS
		console.log('   -> Migrating Habits...');
		const habits = jsonData.config?.habits || [];
		for (const habit of habits) {
			const habitData = {
				user_id: TARGET_USER_ID,
				name: typeof habit === 'string' ? habit : habit.name,
				attribute: typeof habit === 'string' ? 'WIL' : habit.attribute, // Default to WIL if string
				active: true,
			};

			const { data: existing } = await supabase.from('habits').select('id').eq('user_id', TARGET_USER_ID).eq('name', habitData.name).single();

			if (!existing) {
				await supabase.from('habits').insert(habitData);
			}
		}

		// C. MIGRATE DAILY ENTRIES (LOGS)
		console.log('   -> Migrating Daily Logs...');
		const entries = jsonData.entries || {};
		for (const [date, entry] of Object.entries(entries)) {
			if (date === 'inbox') continue;

			// Check if entry conforms to expected shape
			// Your db.json uses 'review' object
			const typedEntry = entry as any;

			const logData = {
				user_id: TARGET_USER_ID,
				date: date,
				completed_habits: typedEntry.habits || {},
				metrics: typedEntry.metrics || {},
				review_win: typedEntry.review?.win || null,
				review_fail: typedEntry.review?.fail || null,
				review_fix: typedEntry.review?.fix || null,
				xp_gained: 0,
			};

			await supabase.from('daily_logs').upsert(logData);
		}

		// D. MIGRATE NOTES
		console.log('   -> Migrating Notes...');
		const notes = jsonData.notes || [];
		for (const note of notes) {
			const noteData = {
				id: note.id,
				user_id: TARGET_USER_ID,
				title: note.title,
				content: note.content,
				tags: note.tags || [],
				created_at: note.createdAt,
				updated_at: note.updatedAt,
			};
			await supabase.from('notes').upsert(noteData);
		}

		console.log(`✅ Migration for user ${TARGET_USER_ID} completed successfully!`);
	} catch (err: any) {
		console.error(`❌ Migration failed:`, err.message);
	}
}

migrateFromLocalJSON();

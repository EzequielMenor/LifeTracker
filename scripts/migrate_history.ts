import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const TARGET_USER_ID = '85972b85-9044-4949-b232-98118cf7d417';

async function migrateHistory() {
	console.log('📜 Migrating History...');
	const filePath = path.join(process.cwd(), 'data', 'db.json');
	const fileContent = fs.readFileSync(filePath, 'utf-8');
	const jsonData = JSON.parse(fileContent);

	const history = jsonData.user.history || [];
	console.log(`Found ${history.length} history items.`);

	for (const item of history) {
		const historyData = {
			user_id: TARGET_USER_ID,
			action: item.action,
			xp_gained: item.xpGained,
			attribute: item.attribute,
			created_at: item.date, // Original date
		};
		await supabase.from('user_history').insert(historyData);
	}
	console.log('✅ History Migrated');
}

migrateHistory();

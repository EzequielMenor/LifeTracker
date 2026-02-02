import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	console.error('❌ Error: Faltan variables de entorno en .env.local');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrate() {
	const filePath = path.join(process.cwd(), 'data', 'db.json');

	if (!fs.existsSync(filePath)) {
		console.error('❌ Error: No se encuentra el archivo data/db.json');
		return;
	}

	try {
		const fileContent = fs.readFileSync(filePath, 'utf-8');
		const jsonData = JSON.parse(fileContent);

		console.log('🚀 Subiendo datos a Supabase...');

		const { error } = await supabase.from('app_data').upsert({
			id: 1,
			data: jsonData,
			updated_at: new Date().toISOString(),
		});

		if (error) {
			throw error;
		}

		console.log('✅ ¡Migración completada con éxito!');
		console.log('Ahora tu aplicación usará los datos de la nube.');
	} catch (error) {
		console.error('❌ Error durante la migración:', error);
	}
}

migrate();

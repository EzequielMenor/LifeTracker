import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

const INITIAL_DATA = {
	user: {
		xp: 0,
		level: 1,
		attributes: {
			strength: 0,
			intellect: 0,
			creativity: 0,
			discipline: 0,
		},
		history: [],
	},
	config: {
		habits: ['Madrugar', 'Leer Biblia', 'Meditar', 'Organizar'],
		metrics: ['Horas de Sueño', 'Horas de Móvil'],
	},
	entries: {},
};

export async function GET() {
	try {
		const supabase = await createClient(); // Cliente de servidor seguro

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		console.log('📥 Fetching data for user:', user.id);

		const { data, error } = await supabase
			.from('app_data')
			.select('data')
			.eq('user_id', user.id) // Busca por UID, no por ID 1
			.single();

		if (error) {
			console.warn('No data found for user, returning initial state:', error.message);
			return NextResponse.json(INITIAL_DATA);
		}

		return NextResponse.json(data.data);
	} catch (error) {
		console.error('API Error:', error);
		return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const newData = await request.json();

		console.log('💾 Saving data for user:', user.id);

		// Upsert que busca coincidencias por user_id
		// Asegúrate de que tu tabla tenga una constraint unique en user_id
		// Si no la tiene, el upsert podría fallar o duplicar.
		// Para simplificar, primero intentamos updatear, si no insertamos.

		const { error } = await supabase.from('app_data').upsert(
			{
				user_id: user.id,
				data: newData,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: 'user_id' },
		); // IMPORTANTE: Requiere que user_id sea unique en la DB

		if (error) {
			console.error('Supabase Save Error:', error);
			throw error;
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Save error:', error);
		return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
	}
}

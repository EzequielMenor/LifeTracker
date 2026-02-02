import { supabase } from '@/lib/supabase';
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
		const { data, error } = await supabase.from('app_data').select('data').eq('id', 1).single();

		if (error) {
			console.error('Supabase error:', error);
			// Si no hay datos, devolvemos el inicial
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
		const newData = await request.json();

		const { error } = await supabase.from('app_data').upsert({
			id: 1,
			data: newData,
			updated_at: new Date().toISOString(),
		});

		if (error) throw error;

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Save error:', error);
		return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
	}
}

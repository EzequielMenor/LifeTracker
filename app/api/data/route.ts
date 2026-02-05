export async function GET() {
	return new Response(null, { status: 410, statusText: 'Gone - API Deprecated' });
}

export async function POST() {
	return new Response(null, { status: 410, statusText: 'Gone - API Deprecated' });
}

import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

// Path to the local JSON database file
const DATA_FILE = path.join(process.cwd(), "data", "db.json");

// Helper to ensure data file exists
function ensureDataFile() {
	if (!fs.existsSync(DATA_FILE)) {
		const initialData = {
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
				habits: ["Madrugar", "Leer Biblia", "Meditar", "Organizar"],
				metrics: ["Horas de Sueño", "Horas de Móvil"],
			},
			entries: {},
		};
		if (!fs.existsSync(path.dirname(DATA_FILE))) {
			fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
		}
		fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
	}
}

export async function GET() {
	try {
		ensureDataFile();
		const fileContent = fs.readFileSync(DATA_FILE, "utf-8");
		const data = JSON.parse(fileContent);
		return NextResponse.json(data);
	} catch (error) {
		return NextResponse.json({ error: "Failed to read data" }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const newData = await request.json();
		ensureDataFile();
		// Validate basics (optional but good)
		if (!newData.entries) {
			return NextResponse.json(
				{ error: "Invalid data format" },
				{ status: 400 },
			);
		}

		fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2));
		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
	}
}

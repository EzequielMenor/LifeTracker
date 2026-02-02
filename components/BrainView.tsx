import { format } from "date-fns";
import {
	Clock,
	Eye,
	Layout,
	PenLine,
	Plus,
	Save,
	Search,
	Tag,
	Trash2,
} from "lucide-react";
import * as React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type Note = {
	id: string;
	title: string;
	content: string;
	tags: string[];
	updatedAt: string;
	createdAt: string;
};

type BrainViewProps = {
	notes: Note[];
	onUpdate: (notes: Note[]) => void;
};

export function BrainView({ notes = [], onUpdate }: BrainViewProps) {
	const [selectedId, setSelectedId] = React.useState<string | null>(null);
	const [search, setSearch] = React.useState("");
	const [viewMode, setViewMode] = React.useState<"edit" | "preview">("edit");
	const [saving, setSaving] = React.useState(false);

	// Editor State
	const [title, setTitle] = React.useState("");
	const [content, setContent] = React.useState("");
	const [tags, setTags] = React.useState("");

	// Debounce Timer Ref
	const saveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

	const filteredNotes = notes
		.filter((note) => {
			const s = search.toLowerCase();
			return (
				note.title.toLowerCase().includes(s) ||
				note.content.toLowerCase().includes(s) ||
				note.tags.some((t) => t.toLowerCase().includes(s))
			);
		})
		.sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		);

	const selectedNote = notes.find((n) => n.id === selectedId);

	// Load selection into editor
	React.useEffect(() => {
		if (selectedNote) {
			setTitle(selectedNote.title);
			setContent(selectedNote.content);
			setTags(selectedNote.tags.join(", "));
		} else {
			setTitle("");
			setContent("");
			setTags("");
		}
	}, [selectedNote]); // Intentionally removed other deps to avoid overwrite

	// Auto-Save Logic
	const handleAutoSave = (
		newTitle: string,
		newContent: string,
		newTags: string,
	) => {
		if (!selectedId) return;

		setSaving(true);
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

		saveTimerRef.current = setTimeout(() => {
			const tagList = newTags
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);

			// We use the functional update pattern if possible, but here we depend on 'notes' prop.
			// To avoid stale closures in the timeout, we should probably rely on the parent's handler
			// or accept that we might overwrite concurrent changes (which is fine for a single user app).
			const updatedNotes = notes.map((n) => {
				if (n.id === selectedId) {
					return {
						...n,
						title: newTitle || "Sin Título",
						content: newContent,
						tags: tagList,
						updatedAt: new Date().toISOString(),
					};
				}
				return n;
			});

			onUpdate(updatedNotes);
			setSaving(false);
		}, 1000); // 1s Debounce
	};

	const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setTitle(val);
		handleAutoSave(val, content, tags);
	};

	const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		setContent(val);
		handleAutoSave(title, val, tags);
	};

	const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setTags(val);
		handleAutoSave(title, content, val);
	};

	const handleCreate = () => {
		const newNote: Note = {
			id: crypto.randomUUID(),
			title: "Nueva Nota",
			content: "",
			tags: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		onUpdate([newNote, ...notes]);
		setSelectedId(newNote.id);
		setViewMode("edit");
		toast.success("Nota creada");
	};

	const handleDelete = () => {
		if (!selectedId) return;
		if (confirm("¿Seguro que quieres borrar esta nota?")) {
			const updatedNotes = notes.filter((n) => n.id !== selectedId);
			onUpdate(updatedNotes);
			setSelectedId(null);
			toast.success("Nota eliminada");
		}
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
			{/* SIDEBAR LIST */}
			<div className="md:col-span-1 flex flex-col gap-4 h-full">
				<div className="flex gap-2">
					<div className="relative flex-1">
						<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<input
							className="w-full rounded-md border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							placeholder="Buscar notas..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<Button onClick={handleCreate} size="icon">
						<Plus className="h-4 w-4" />
					</Button>
				</div>

				<div className="flex-1 overflow-y-auto space-y-2 pr-2">
					{filteredNotes.length === 0 ? (
						<div className="text-center text-muted-foreground py-8 text-sm">
							No hay notas encontradas
						</div>
					) : (
						filteredNotes.map((note) => (
							<Card
								key={note.id}
								className={`cursor-pointer transition-colors hover:bg-muted/50 ${
									selectedId === note.id ? "border-primary bg-muted/30" : ""
								}`}
								onClick={() => {
									setSelectedId(note.id);
									setViewMode("edit");
								}}
							>
								<CardContent className="p-3 space-y-1.5">
									<div className="font-semibold truncate">
										{note.title || "Sin Título"}
									</div>
									<div className="text-xs text-muted-foreground line-clamp-2 h-8">
										{note.content || "Sin contenido..."}
									</div>
									<div className="flex items-center justify-between pt-1">
										<div className="flex gap-1 overflow-hidden">
											{note.tags.slice(0, 3).map((tag) => (
												<span
													key={tag}
													className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-sm truncate max-w-[60px]"
												>
													#{tag}
												</span>
											))}
										</div>
										<span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
											{format(new Date(note.updatedAt), "d MMM")}
										</span>
									</div>
								</CardContent>
							</Card>
						))
					)}
				</div>
			</div>

			{/* EDITOR AREA */}
			<div className="md:col-span-2 flex flex-col h-full bg-card rounded-xl border shadow-sm overflow-hidden">
				{selectedId ? (
					<>
						{/* TOOLBAR */}
						<div className="border-b p-3 flex items-center justify-between bg-muted/20">
							<div className="flex items-center gap-4 text-sm text-muted-foreground">
								<div className="flex items-center gap-1.5">
									{saving ? (
										<span className="text-yellow-500 animate-pulse flex items-center gap-1">
											<Save className="h-3 w-3" /> Guardando...
										</span>
									) : (
										<span className="text-green-500 flex items-center gap-1">
											<CheckCircle className="h-3 w-3" /> Guardado
										</span>
									)}
								</div>
								<div className="h-4 w-px bg-border" />
								<div className="flex items-center gap-1">
									<Clock className="h-3 w-3" />
									<span>
										{selectedNote &&
											format(new Date(selectedNote.updatedAt), "d MMM, HH:mm")}
									</span>
								</div>
							</div>
							<div className="flex gap-2">
								<div className="flex bg-muted rounded-lg p-0.5 mr-2">
									<button
										onClick={() => setViewMode("edit")}
										className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
											viewMode === "edit"
												? "bg-background shadow-sm text-foreground"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										<PenLine size={12} /> Editar
									</button>
									<button
										onClick={() => setViewMode("preview")}
										className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
											viewMode === "preview"
												? "bg-background shadow-sm text-foreground"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										<Eye size={12} /> Vista Previa
									</button>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onClick={handleDelete}
									className="h-8 w-8 text-destructive hover:text-destructive/80"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>

						<div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
							{/* TITLE INPUT (Always Visible) */}
							<input
								className="text-3xl font-bold bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/50"
								placeholder="Título de la nota"
								value={title}
								onChange={handleTitleChange}
							/>

							{/* TAGS INPUT (Always Visible) */}
							<div className="flex items-center gap-2 text-muted-foreground">
								<Tag className="h-4 w-4" />
								<input
									className="flex-1 bg-transparent border-none text-sm focus:outline-none"
									placeholder="Etiquetas (separadas por coma)..."
									value={tags}
									onChange={handleTagsChange}
								/>
							</div>

							<div className="h-px bg-border my-2" />

							{/* CONTENT AREA */}
							{viewMode === "edit" ? (
								<textarea
									className="flex-1 w-full resize-none bg-transparent border-none focus:outline-none leading-relaxed font-mono text-sm"
									placeholder="Escribe aquí usando Markdown..."
									value={content}
									onChange={handleContentChange}
								/>
							) : (
								<div className="flex-1 prose prose-sm dark:prose-invert max-w-none overflow-y-auto pr-2">
									<Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
								</div>
							)}
						</div>
					</>
				) : (
					<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
						<div className="p-4 bg-muted/50 rounded-full">
							<Layout className="h-10 w-10 opacity-50" />
						</div>
						<p>Selecciona una nota o crea una nueva</p>
					</div>
				)}
			</div>
		</div>
	);
}

// Icon helper
function CheckCircle({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
			<polyline points="22 4 12 14.01 9 11.01" />
		</svg>
	);
}

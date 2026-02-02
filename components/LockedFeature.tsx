import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LockedFeatureProps = {
	level: number;
	requiredLevel: number;
	children: React.ReactNode;
	fallbackText?: string;
	className?: string;
};

export function LockedFeature({
	level,
	requiredLevel,
	children,
	fallbackText = "Bloqueado",
	className,
}: LockedFeatureProps) {
	const isUnlocked = level >= requiredLevel;

	if (isUnlocked) {
		return <>{children}</>;
	}

	return (
		<div
			className={cn(
				"relative group overflow-hidden rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 flex flex-col items-center justify-center gap-2 p-4 text-center select-none",
				className,
			)}
		>
			<div className="bg-muted p-2 rounded-full mb-1 group-hover:scale-110 transition-transform">
				<Lock className="h-5 w-5 text-muted-foreground" />
			</div>
			<div className="space-y-1">
				<p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
					{fallbackText}
				</p>
				<p className="text-xs text-muted-foreground/70">
					Requiere Nivel{" "}
					<span className="font-mono font-bold">{requiredLevel}</span>
				</p>
			</div>

			{/* Progress visual */}
			<div className="absolute bottom-0 left-0 w-full h-1 bg-muted">
				<div
					className="h-full bg-primary/30"
					style={{ width: `${(level / requiredLevel) * 100}%` }}
				/>
			</div>
		</div>
	);
}

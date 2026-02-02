"use client";

import confetti from "canvas-confetti";
import { Plus, Skull, Sword, Trash2, Zap } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Boss } from "@/lib/types";
import { cn } from "@/lib/utils";

type BossWidgetProps = {
  bosses: Boss[];
  onUpdateBosses: (bosses: Boss[]) => void;
  onGainXP: (amount: number, reason: string) => void;
};

export function BossWidget({
  bosses = [],
  onUpdateBosses,
  onGainXP,
}: BossWidgetProps) {
  const [isCreating, setIsCreating] = React.useState(false);
  const [newBossName, setNewBossName] = React.useState("");
  const [newBossHp, setNewBossHp] = React.useState(500);
  const [newBossXp, setNewBossXp] = React.useState(1000);

  const handleCreate = () => {
    if (!newBossName.trim()) return;
    const newBoss: Boss = {
      id: crypto.randomUUID(),
      name: newBossName,
      totalHp: newBossHp,
      currentHp: newBossHp,
      xpReward: newBossXp,
      status: "active",
    };
    onUpdateBosses([...bosses, newBoss]);
    setIsCreating(false);
    setNewBossName("");
    toast.success("Nueva misión añadida");
  };

  const handleAttack = (
    bossId: string,
    damage: number,
    type: "quick" | "heavy" | "crit",
  ) => {
    const bossIndex = bosses.findIndex((b) => b.id === bossId);
    if (bossIndex === -1) return;

    const activeBoss = bosses[bossIndex];
    const newHp = Math.max(0, activeBoss.currentHp - damage);

    if (newHp === 0) {
      // Defeated
      onGainXP(activeBoss.xpReward, `Misión Completada: ${activeBoss.name}`);
      const newBosses = bosses.filter((b) => b.id !== bossId);
      onUpdateBosses(newBosses);

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
      });
      toast.success(`¡${activeBoss.name} COMPLETADO!`, {
        description: `+${activeBoss.xpReward} XP`,
      });
    } else {
      // Update
      const updatedBoss = { ...activeBoss, currentHp: newHp };
      const newBosses = [...bosses];
      newBosses[bossIndex] = updatedBoss;
      onUpdateBosses(newBosses);

      const msgs = { quick: "Hit!", heavy: "Boom!", crit: "CRITICAL!" };
      toast.info(`${msgs[type]} -${damage} HP`);
    }
  };

  const handleDelete = (bossId: string) => {
    if (confirm("¿Abandonar esta misión?")) {
      onUpdateBosses(bosses.filter((b) => b.id !== bossId));
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Skull className="h-5 w-5" />
          Jefes & Misiones
        </h3>
        {!isCreating && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2 h-8"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-4 w-4" /> Nueva Misión
          </Button>
        )}
      </div>

      {/* CREATE FORM */}
      {isCreating && (
        <Card className="border-dashed animate-in slide-in-from-top-2">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <input
                className="w-full p-2 bg-background border rounded-md text-sm font-medium"
                placeholder="Nombre de la misión..."
                value={newBossName}
                onChange={(e) => setNewBossName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  className="w-24 p-2 bg-background border rounded-md text-sm"
                  placeholder="HP"
                  value={newBossHp}
                  onChange={(e) => setNewBossHp(Number(e.target.value))}
                />
                <input
                  type="number"
                  className="w-24 p-2 bg-background border rounded-md text-sm"
                  placeholder="XP"
                  value={newBossXp}
                  onChange={(e) => setNewBossXp(Number(e.target.value))}
                />
                <div className="flex-1 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreating(false)}
                  >
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleCreate}>
                    Crear
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                HP = Tiempo estimado (minutos) o Dificultad
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOSS LIST */}
      <div className="grid gap-3">
        {bosses.length === 0 && !isCreating && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
            <p className="text-sm">No hay jefes activos.</p>
            <p className="text-xs opacity-70">
              Crea uno para grandes proyectos.
            </p>
          </div>
        )}

        {bosses.map((boss) => {
          const progress = (boss.currentHp / boss.totalHp) * 100;
          return (
            <Card key={boss.id} className="overflow-hidden relative group">
              {/* Background Progress Bar */}
              <div
                className="absolute inset-0 bg-primary/5 pointer-events-none transition-all duration-500"
                style={{ width: `${progress}%` }}
              />

              <CardHeader className="p-4 pb-2 relative z-10 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    {boss.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    HP: {boss.currentHp}/{boss.totalHp} • Recompensa:{" "}
                    {boss.xpReward} XP
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(boss.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardHeader>

              <CardContent className="p-4 pt-2 relative z-10">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-xs gap-1 hover:border-primary/50 hover:bg-primary/5"
                    onClick={() => handleAttack(boss.id, 25, "quick")}
                  >
                    <Sword className="h-3 w-3" /> 25
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-xs gap-1 hover:border-primary/50 hover:bg-primary/5"
                    onClick={() => handleAttack(boss.id, 50, "heavy")}
                  >
                    <Zap className="h-3 w-3" /> 50
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-xs gap-1 hover:border-primary/50 hover:bg-primary/5"
                    onClick={() => handleAttack(boss.id, 100, "crit")}
                  >
                    <Skull className="h-3 w-3" /> 100
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

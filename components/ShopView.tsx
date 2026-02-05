'use client';

import { Coins, Palette, Plus, Shield, ShoppingBag, Trash2, X, Zap } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameSystem } from '@/hooks/useGameSystem';
import type { DB, Reward } from '@/lib/types';
import { cn } from '@/lib/utils';

type ShopViewProps = {
	data: DB;
	onUpdate: (newData: DB) => void;
	onClose: () => void;
};

export function ShopView({ data, onUpdate, onClose }: ShopViewProps) {
	const { gold, spendGold } = useGameSystem(data, onUpdate);
	const [activeTab, setActiveTab] = React.useState<'real' | 'game'>('real');

	// Local state for rewards management
	const [rewards, setRewards] = React.useState<Reward[]>(data.config?.rewards || []);

	const [newRewardName, setNewRewardName] = React.useState('');
	const [newRewardCost, setNewRewardCost] = React.useState(100);

	// GAME ITEMS (Hardcoded for now)
	const GAME_ITEMS = [
		{
			id: 'shield',
			name: 'Escudo de Racha',
			cost: 500,
			icon: Shield,
			desc: 'Protege tu racha si fallas un día.',
		},
		{
			id: 'double_xp',
			name: 'Doble XP (24h)',
			cost: 300,
			icon: Zap,
			desc: 'Gana el doble de experiencia hoy.',
		},
		{
			id: 'theme_dark',
			name: 'Tema Dark Gold',
			cost: 1000,
			icon: Palette,
			desc: 'Desbloquea el aspecto premium.',
		},
	];

	const handleBuyGameItem = (item: any) => {
		console.log('Intentando comprar:', item);
		console.log('Inventario actual:', data.user.inventory);
		// 1. Verificamos si ya lo tiene (para no comprarlo dos veces)
		if (data.user.inventory?.includes(item.id)) {
			toast.error('¡Ya tienes este objeto!');
			return;
		}

		// 2. Intentamos gastar el oro
		if (spendGold(item.cost)) {
			// 3. Si paga, actualizamos la Base de Datos añadiendo el item al inventario
			const newInventory = [...(data.user.inventory || []), item.id];

			const newData = {
				...data,
				user: {
					...data.user,
					inventory: newInventory,
				},
			};
			// 4. Guardamos
			onUpdate(newData);

			toast.success(`¡Has comprado: ${item.name}!`);
		} else {
			toast.error('No tienes suficiente oro'); // Feedback extra por si acaso
		}
	};

	// Sync local state to DB when modified
	const updateRewards = (newRewards: Reward[]) => {
		setRewards(newRewards);
		const newData = {
			...data,
			config: {
				...data.config,
				rewards: newRewards,
			},
		};
		onUpdate(newData);
	};

	const handleAddReward = () => {
		if (!newRewardName.trim()) return;

		const newReward: Reward = {
			id: crypto.randomUUID(),
			name: newRewardName,
			cost: newRewardCost,
		};

		updateRewards([...rewards, newReward]);
		setNewRewardName('');
		toast.success('Recompensa añadida a la tienda');
	};

	const handleDeleteReward = (id: string) => {
		updateRewards(rewards.filter((r) => r.id !== id));
	};

	const handleBuy = (reward: Reward) => {
		if (spendGold(reward.cost)) {
			toast.success(`¡Disfruta tu recompensa: ${reward.name}! 🎉`);
		}
	};
	console.log('LOG: Oro actual:', gold);
	return (
		<div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 pb-10">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-yellow-500/10 rounded-full text-yellow-500">
						<ShoppingBag size={24} />
					</div>
					<div>
						<h2 className="text-2xl font-bold">Mercado</h2>
						<p className="text-sm text-muted-foreground">Invierte en ti mismo.</p>
					</div>
				</div>
				<Button variant="ghost" size="icon" onClick={onClose}>
					<X className="h-5 w-5" />
				</Button>
			</div>

			{/* GOLD DISPLAY */}
			<Card className="bg-yellow-500/5 border-yellow-500/20">
				<CardContent className="p-4 flex items-center justify-between">
					<span className="font-medium text-muted-foreground">Tu Saldo:</span>
					<div className="flex items-center gap-2 text-2xl font-bold text-yellow-500">
						<Coins size={28} />
						{gold}
					</div>
				</CardContent>
			</Card>

			{/* TABS */}
			<div className="flex gap-2 p-1 bg-muted rounded-lg">
				<button
					onClick={() => setActiveTab('real')}
					className={cn(
						'flex-1 py-2 text-sm font-medium rounded-md transition-all',
						activeTab === 'real' ? 'bg-background shadow-sm' : 'text-muted-foreground',
					)}>
					Vida Real
				</button>
				<button
					onClick={() => setActiveTab('game')}
					className={cn(
						'flex-1 py-2 text-sm font-medium rounded-md transition-all',
						activeTab === 'game' ? 'bg-background shadow-sm' : 'text-muted-foreground',
					)}>
					Power-Ups
				</button>
			</div>

			{/* CONTENT */}
			{activeTab === 'real' ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{rewards.length === 0 && (
						<div className="col-span-full text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
							<p className="text-sm">No hay recompensas definidas.</p>
							<Button
								variant="link"
								onClick={() => {
									const defaults = [
										{
											id: crypto.randomUUID(),
											name: '🎮 1h Videojuegos',
											cost: 100,
										},
										{
											id: crypto.randomUUID(),
											name: '🍕 Cheat Meal',
											cost: 500,
										},
										{
											id: crypto.randomUUID(),
											name: '📦 Capricho Amazon',
											cost: 2000,
										},
									];
									updateRewards(defaults);
								}}>
								Cargar Pack Inicial
							</Button>
						</div>
					)}
					{rewards.map((reward) => {
						const canAfford = gold >= reward.cost;
						return (
							<div
								key={reward.id}
								className={cn(
									'relative group rounded-xl border-2 transition-all overflow-hidden',
									canAfford ? 'hover:border-yellow-500/50 hover:shadow-lg hover:-translate-y-1 bg-card' : 'bg-muted border-transparent opacity-80',
								)}>
								<button
									onClick={() => handleBuy(reward)}
									disabled={!canAfford}
									className={cn(
										'flex flex-col items-center justify-center w-full h-full p-6 text-center outline-none',
										!canAfford && 'cursor-not-allowed grayscale',
									)}>
									<div className="text-lg font-bold mb-1">{reward.name}</div>
									<div className={cn('text-sm font-mono font-bold flex items-center gap-1', canAfford ? 'text-yellow-500' : 'text-muted-foreground')}>
										<Coins size={14} /> {reward.cost}
									</div>
								</button>

								{/* Delete button (Always visible) */}
								<button
									className="absolute top-2 right-2 z-20 p-1.5 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive bg-background/80 backdrop-blur-sm border shadow-sm transition-colors"
									onClick={(e) => {
										e.stopPropagation();
										handleDeleteReward(reward.id);
									}}
									title="Eliminar recompensa">
									<Trash2 size={14} />
								</button>
							</div>
						);
					})}

					{/* ADD NEW CARD */}
					<div className="flex flex-col gap-2 p-4 rounded-xl border-2 border-dashed border-muted bg-muted/20">
						<div className="flex-1 flex flex-col justify-center gap-2">
							<input
								className="w-full bg-transparent border-b border-muted-foreground/20 focus:border-primary outline-none text-center font-medium placeholder:text-muted-foreground/50"
								placeholder="Nueva Recompensa"
								value={newRewardName}
								onChange={(e) => setNewRewardName(e.target.value)}
							/>
							<div className="flex items-center justify-center gap-2">
								<Coins size={14} className="text-muted-foreground" />
								<input
									type="number"
									className="w-16 bg-transparent border-b border-muted-foreground/20 focus:border-primary outline-none text-center font-mono text-sm"
									placeholder="Coste"
									value={newRewardCost}
									onChange={(e) => setNewRewardCost(Number(e.target.value))}
								/>
							</div>
						</div>
						<Button size="sm" variant="outline" className="w-full mt-2" onClick={handleAddReward}>
							<Plus size={14} className="mr-1" /> Crear
						</Button>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-3">
					{GAME_ITEMS.map((item) => {
						const canAfford = gold >= item.cost;
						const Icon = item.icon;
						return (
							<button
								key={item.id}
								onClick={() => handleBuyGameItem(item)}
								disabled={!canAfford}
								className={cn(
									'flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
									canAfford ? 'bg-card hover:border-purple-500/50 hover:bg-purple-500/5' : 'bg-muted opacity-60 cursor-not-allowed grayscale',
								)}>
								<div
									className={cn('p-3 rounded-full', canAfford ? 'bg-purple-500/10 text-purple-500' : 'bg-muted-foreground/20 text-muted-foreground')}>
									<Icon size={20} />
								</div>
								<div className="flex-1">
									<h4 className="font-bold">{item.name}</h4>
									<p className="text-xs text-muted-foreground">{item.desc}</p>
								</div>
								<div className={cn('font-mono font-bold flex items-center gap-1', canAfford ? 'text-yellow-500' : 'text-muted-foreground')}>
									{item.cost} <Coins size={14} />
								</div>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

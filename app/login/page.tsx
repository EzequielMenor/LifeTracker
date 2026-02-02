import { login, signup } from './actions';

export default function LoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-sm space-y-8 rounded-xl border bg-card p-8 shadow-lg">
				<div className="space-y-2 text-center">
					<h1 className="text-3xl font-bold tracking-tight">Bienvenido</h1>
					<p className="text-muted-foreground">Ingresa a tu Life Tracker</p>
				</div>

				<form className="space-y-6">
					<div className="space-y-2">
						<label htmlFor="email" className="text-sm font-medium leading-none">
							Email
						</label>
						<input
							id="email"
							name="email"
							type="email"
							required
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							placeholder="tu@email.com"
						/>
					</div>
					<div className="space-y-2">
						<label htmlFor="password" className="text-sm font-medium leading-none">
							Contraseña
						</label>
						<input
							id="password"
							name="password"
							type="password"
							required
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
					</div>

					<div className="grid gap-4">
						<button
							formAction={login}
							className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
							Iniciar sesión
						</button>
						<button
							formAction={signup}
							className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
							Registrarse
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

import type { DB, Entry, Task } from './types';

/**
 * Migrates tasks from old format (Record<string, boolean>) to new format (Record<string, Task>)
 */
export function migrateTasks(data: DB): DB {
	if (!data.entries) return data;

	const newEntries: Record<string, Entry> = {};

	Object.entries(data.entries).forEach(([dateKey, entry]) => {
		const newTasks: Record<string, Task> = {};

		Object.entries(entry.tasks || {}).forEach(([taskId, value]) => {
			if (typeof value === 'boolean') {
				// Old format: migrate
				newTasks[taskId] = {
					name: taskId,
					completed: value,
				};
			} else {
				// Already migrated
				newTasks[taskId] = value;
			}
		});

		newEntries[dateKey] = { ...entry, tasks: newTasks };
	});

	return { ...data, entries: newEntries };
}

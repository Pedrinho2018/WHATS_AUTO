type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const levelPriority: Record<LogLevel, number> = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
};

const normalizeLevel = (value: string | undefined): LogLevel => {
	if (value === 'error' || value === 'warn' || value === 'info' || value === 'debug') {
		return value;
	}

	return 'info';
};

const currentLevel = normalizeLevel(process.env.LOG_LEVEL);

const serialize = (value: unknown): unknown => {
	if (value instanceof Error) {
		return {
			name: value.name,
			message: value.message,
			stack: value.stack,
		};
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (Array.isArray(value)) {
		return value.map((item) => serialize(item));
	}

	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, serialize(item)])
		);
	}

	return value;
};

const shouldLog = (level: LogLevel): boolean => {
	return levelPriority[level] <= levelPriority[currentLevel];
};

const write = (level: LogLevel, message: string, meta?: unknown): void => {
	if (!shouldLog(level)) {
		return;
	}

	const timestamp = new Date().toISOString();
	const payload = {
		timestamp,
		level,
		message,
		...(meta && typeof meta === 'object' && !(meta instanceof Error)
			? (serialize(meta) as Record<string, unknown>)
			: meta === undefined
				? {}
				: { meta: serialize(meta) }),
	};
	const output = JSON.stringify(payload);

	if (level === 'error') {
		console.error(output);
		return;
	}

	if (level === 'warn') {
		console.warn(output);
		return;
	}

	console.log(output);
};

export const logger = {
	error(message: string, meta?: unknown): void {
		write('error', message, meta);
	},
	warn(message: string, meta?: unknown): void {
		write('warn', message, meta);
	},
	info(message: string, meta?: unknown): void {
		write('info', message, meta);
	},
	debug(message: string, meta?: unknown): void {
		write('debug', message, meta);
	},
	isDebugEnabled(): boolean {
		return currentLevel === 'debug';
	},
	isSqlLoggingEnabled(): boolean {
		return process.env.DB_LOGGING === 'true' || currentLevel === 'debug';
	},
};

export default logger;

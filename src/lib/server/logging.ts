import { createLogger, format, transports } from 'winston';
import { getServerConfig } from '@/lib/services/config/config.server';
import DailyRotateFile from 'winston-daily-rotate-file';
import chalk from 'chalk';

const config = getServerConfig().log

const logFormat = format.printf(({ level, message, label, timestamp, levelLabel }) => {
	const name = (label ?? '').padEnd(12)

	const line = `${chalk.cyan(timestamp)} | ${levelLabel} | ${chalk.cyan(name)} | ${message}`;

	if (level === "debug") return chalk.cyan(line)
	if (level === "error") return chalk.red(line)
	if (level === "crit") return chalk.bgRed(line)
	if (level === "warning") return chalk.yellow(line)
	return line
});

const levels = {
	crit: 0,
	error: 1,
	warning: 2,
	info: 3,
	debug: 4
}

export const log = createLogger({
	level: config.level,
	levels,
	transports: [
		new transports.Console()
	],
	format: format.combine(
		format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		format.splat(),
		format((info) => {
			info.levelLabel = info.level.toUpperCase()[0]
			return info
		})(),
		logFormat
	),
})

if (config.file) {
	log.add(new DailyRotateFile({ filename: config.file }))
}

export function getLogger(name: string) {
	return log.child({ label: name })
}
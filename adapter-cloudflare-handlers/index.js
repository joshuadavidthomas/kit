import { existsSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** @import { Adapter, Builder } from '@sveltejs/kit' */

/**
 * Decorate `@sveltejs/adapter-cloudflare` so that named exports from
 * `src/handlers.cloudflare.<ext>` (or a custom path) are wired onto the
 * Worker's default export alongside `fetch`. Recognized exports: `scheduled`,
 * `queue`, `email`. Absent exports leave no trace on the final default export.
 *
 * The extension list is derived from `kit.moduleExtensions`, so whatever
 * extensions SvelteKit treats as modules in your project will be honored.
 *
 * @param {Adapter} base The adapter returned by `@sveltejs/adapter-cloudflare`.
 * @param {{
 *   entry?: string,
 *   workerPath?: string
 * }} [options]
 *   `entry` overrides the convention file location. `workerPath` overrides the
 *   generated worker location (defaults to `.svelte-kit/cloudflare/_worker.js`
 *   which matches the base adapter's default).
 * @returns {Adapter}
 */
export default function withCloudflareHandlers(base, options = {}) {
	return {
		name: `${base.name}+handlers`,
		/** @param {Builder} builder */
		async adapt(builder) {
			await base.adapt(builder);

			const candidates = builder.config.kit.moduleExtensions.map(
				(ext) => `src/handlers.cloudflare${ext}`
			);
			const entry = options.entry ?? candidates.find((p) => existsSync(p));
			if (!entry || !existsSync(entry)) {
				builder.log.minor(
					`adapter-cloudflare-handlers: no ${candidates.join(' / ')} found, skipping`
				);
				return;
			}

			const worker_path = resolve_worker_path(builder, options.workerPath);
			if (!existsSync(worker_path)) {
				builder.log.warn(
					`adapter-cloudflare-handlers: could not locate generated worker at ${worker_path}; ` +
						'pass `workerPath` if your wrangler config writes elsewhere.'
				);
				return;
			}

			const worker_dir = path.dirname(worker_path);
			const base_name = '_worker.base.js';
			const base_path = path.join(worker_dir, base_name);

			renameSync(worker_path, base_path);

			const import_specifier = `./${posixify(path.relative(worker_dir, path.resolve(entry)))}`;

			writeFileSync(
				worker_path,
				[
					`import base from './${base_name}';`,
					`import * as handlers from '${import_specifier}';`,
					'',
					'export default {',
					'\t...base,',
					'\t...(handlers.scheduled && { scheduled: handlers.scheduled }),',
					'\t...(handlers.queue && { queue: handlers.queue }),',
					'\t...(handlers.email && { email: handlers.email })',
					'};',
					''
				].join('\n')
			);
		},
		emulate: base.emulate?.bind(base),
		supports: base.supports
	};
}

/**
 * @param {Builder} builder
 * @param {string | undefined} override
 * @returns {string}
 */
function resolve_worker_path(builder, override) {
	if (override) return path.resolve(override);
	return path.join(builder.getBuildDirectory('cloudflare'), '_worker.js');
}

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}

/**
 * Identity helper so authors get full IntelliSense on handler signatures.
 * Runtime no-op.
 *
 * @template T
 * @param {T} handlers
 * @returns {T}
 */
export function defineHandlers(handlers) {
	return handlers;
}

import type { Adapter } from '@sveltejs/kit';
import type {
	ExecutionContext,
	ForwardableEmailMessage,
	MessageBatch,
	ScheduledController
} from '@cloudflare/workers-types';

export interface WithCloudflareHandlersOptions {
	/**
	 * Override the convention-file path. Defaults to whichever of
	 * `src/handlers.cloudflare.{js,ts,mjs}` exists.
	 */
	entry?: string;
	/**
	 * Override the generated worker path. Defaults to the base adapter's
	 * build-directory location (`.svelte-kit/cloudflare/_worker.js`).
	 */
	workerPath?: string;
}

/**
 * Decorate `@sveltejs/adapter-cloudflare` so that named exports from
 * `src/handlers.cloudflare.{js,ts,mjs}` are wired onto the Worker's
 * default export alongside `fetch`.
 */
export default function withCloudflareHandlers(
	base: Adapter,
	options?: WithCloudflareHandlersOptions
): Adapter;

/**
 * Optional identity helper that gives handler modules full IntelliSense
 * when authored as an object. Runtime no-op. Example:
 *
 * ```js
 * // src/handlers.cloudflare.js
 * import { defineHandlers } from 'adapter-cloudflare-handlers';
 *
 * export const { scheduled, queue } = defineHandlers({
 *   scheduled(controller, env, ctx) { ... },
 *   queue(batch, env, ctx) { ... }
 * });
 * ```
 */
export function defineHandlers<Env = unknown, QueueBody = unknown>(
	handlers: CloudflareHandlers<Env, QueueBody>
): CloudflareHandlers<Env, QueueBody>;

export interface CloudflareHandlers<Env = unknown, QueueBody = unknown> {
	scheduled?: (
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	) => void | Promise<void>;
	queue?: (batch: MessageBatch<QueueBody>, env: Env, ctx: ExecutionContext) => void | Promise<void>;
	email?: (
		message: ForwardableEmailMessage,
		env: Env,
		ctx: ExecutionContext
	) => void | Promise<void>;
}

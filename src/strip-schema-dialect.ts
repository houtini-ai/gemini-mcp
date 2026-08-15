/**
 * Strip `$schema` dialect declarations from outgoing tool schemas.
 *
 * WHY THIS EXISTS
 * Every tool in this server was rejected by strict MCP clients with:
 *
 *   Tool 'gemini_chat' has an invalid outputSchema: JSON Schema declares an unsupported
 *   dialect ("$schema": "http://json-schema.org/draft-07/schema#"). The default validator
 *   supports JSON Schema 2020-12 only.
 *
 * The cause is in the SDK, not here. `McpServer` converts our Zod schemas via
 * `toJsonSchemaCompat`, and passes NO `target` option:
 *
 *   toJsonSchemaCompat(obj, { strictUnions: true, pipeStrategy: 'output' })
 *
 * With no target, both branches of that helper produce draft-07 and stamp a `$schema` key:
 * the Zod v3 branch calls `zodToJsonSchema` (whose default target is `jsonSchema7`), and
 * the Zod v4 branch maps an absent target to `'draft-7'`. Verified empirically against
 * both — switching Zod versions does not help, and neither does bumping the SDK, because
 * the missing argument is at the call site.
 *
 * The schema BODIES are dialect-agnostic — plain `type`/`properties`/`required`/
 * `additionalProperties`, which mean the same thing in draft-07 and 2020-12. Only the
 * declaration is wrong. Removing it lets the client apply its own default (2020-12) and
 * the schema validates unchanged.
 *
 * Deleting `outputSchema` from the tools would also have silenced the error, but would
 * have broken a working feature: every handler returns `structuredContent`, and the App
 * viewers consume it. The declarations are correct; only the dialect tag is not.
 *
 * This is a shim over an upstream defect. Once the SDK passes a 2020-12 target, drop
 * this module and the wiring in index.ts.
 */
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

/** Recursively remove `$schema` keys. Returns a copy; the input is not mutated. */
function withoutDialect<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(withoutDialect) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '$schema') continue;
      out[k] = withoutDialect(v);
    }
    return out as unknown as T;
  }
  return value;
}

/**
 * Wrap a transport so any `tools/list` result loses its `$schema` declarations on the way
 * out. Applied to the transport rather than the request handler so we do not have to
 * reimplement the SDK's own tool-listing logic just to adjust one key.
 */
export function stripSchemaDialect(transport: Transport): Transport {
  const send = transport.send.bind(transport);
  transport.send = async (message: unknown, options?: unknown) => {
    const m = message as { result?: { tools?: unknown[] } };
    if (m && typeof m === 'object' && m.result && Array.isArray(m.result.tools)) {
      m.result.tools = m.result.tools.map(withoutDialect);
    }
    return send(message as never, options as never);
  };
  return transport;
}

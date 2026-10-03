// Provider adapter for the engine's LLM calls. Anthropic (Claude) by default,
// then Gemini, then OpenAI, by which API key is set; switch explicitly with
// LLM_PROVIDER=anthropic|gemini|openai. Callers speak one neutral format; all
// provider wire-format differences live in this file.
//
// Gemini runs through Google's OpenAI-compatible endpoint, so it shares the
// OpenAI code path (chat, tools, json_schema, images) with a different client.

import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import OpenAI from "openai";

const MODELS = {
	anthropic: {
		fast: process.env.ANTHROPIC_MODEL_FAST || "claude-sonnet-5-5",
		smart: process.env.ANTHROPIC_MODEL_SMART || "claude-sonnet-5-5",
	},
	gemini: {
		fast: process.env.GEMINI_MODEL_FAST || "gemini-flash-lite-latest",
		smart: process.env.GEMINI_MODEL_SMART || "gemini-flash-lite-latest",
	},
	openai: { fast: "gpt-4.1-mini", smart: "gpt-4.1" },
};

// Claude Sonnet 5.5 rejects {type: "disabled"} thinking; thinking stays on
// and effort is the speed/depth control. Fast tier is dialogue: keep it low.
const EFFORT = { fast: "low", smart: "medium" };
// Thinking tokens count against max_tokens; reply length is set by the prompts.
const ANTHROPIC_MAX_TOKENS = 16000;

// Shared request fields for every Claude call. On a safety refusal the API
// re-runs the request on a fallback model inside the same call.
const claudeParams = (tier) => ({
	model: model(tier),
	max_tokens: ANTHROPIC_MAX_TOKENS,
	output_config: { effort: EFFORT[tier] || "low" },
	betas: ["server-side-fallback-2026-07-01"],
	fallbacks: "default",
});

let anthropicClient = null;
let openaiClient = null;
let geminiClient = null;
// A key that is not scoped to a workspace (e.g. sk-ant-usr...) must name one
// on every request; ANTHROPIC_WORKSPACE_ID supplies it.
const anthropic = () =>
	(anthropicClient ||= new Anthropic({
		apiKey: process.env.ANTHROPIC_API_KEY,
		...(process.env.ANTHROPIC_WORKSPACE_ID && {
			defaultHeaders: { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID },
		}),
	}));
const openai = () => (openaiClient ||= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
const gemini = () =>
	(geminiClient ||= new OpenAI({
		apiKey: process.env.GEMINI_API_KEY,
		baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
	}));

export const getProvider = () => {
	const forced = process.env.LLM_PROVIDER;
	if (["gemini", "openai", "anthropic"].includes(forced)) return forced;
	if (process.env.ANTHROPIC_API_KEY) return "anthropic";
	if (process.env.GEMINI_API_KEY) return "gemini";
	return process.env.OPENAI_API_KEY ? "openai" : "anthropic";
};

// Providers that speak the OpenAI chat-completions wire format.
const isCompat = () => getProvider() !== "anthropic";
const compat = () => (getProvider() === "gemini" ? gemini() : openai());

const model = (tier) => MODELS[getProvider()][tier] || MODELS[getProvider()].fast;

// Thinking tokens count against max_tokens: a 300-token spoken turn could come
// back empty. Fast tier is dialogue, so switch thinking off there (same choice
// as the Anthropic path). Flash-Lite rejects "none" and takes "minimal".
const noThinking = (tier) => {
	if (getProvider() !== "gemini" || tier !== "fast") return {};
	return { reasoning_effort: model(tier).includes("lite") ? "minimal" : "none" };
};

// ---------------------------------------------------------------------------
// complete: plain chat. messages = [{ role: "user"|"assistant", text }]
// ---------------------------------------------------------------------------
export const complete = async ({ system, messages, maxTokens = 600, tier = "fast" }) => {
	if (isCompat()) {
		const response = await compat().chat.completions.create({
			model: model(tier),
			...noThinking(tier),
			max_tokens: maxTokens,
			messages: [
				{ role: "system", content: system },
				...messages.map((m) => ({ role: m.role, content: m.text })),
			],
		});
		return response.choices[0]?.message?.content?.trim() || "";
	}

	const response = await anthropic().beta.messages.create({
		...claudeParams(tier),
		system,
		messages: messages.map((m) => ({ role: m.role, content: m.text })),
	});
	if (response.stop_reason === "refusal") return "";
	return response.content.find((b) => b.type === "text")?.text?.trim() || "";
};

// ---------------------------------------------------------------------------
// completeWithTools: one turn of a tool-using loop over a NEUTRAL history.
// history entries:
//   { role: "user", text }
//   { role: "assistant", text, toolCalls: [{ id, name, input }] }
//   { role: "toolResults", results: [{ id, name, content }] }
// tools: [{ name, description, schema }]
// Returns { text, toolCalls: [{ id, name, input }] }.
// ---------------------------------------------------------------------------
export const completeWithTools = async ({ system, history, tools, maxTokens = 600, tier = "fast" }) => {
	if (isCompat()) {
		const messages = [{ role: "system", content: system }];
		for (const h of history) {
			if (h.role === "user") messages.push({ role: "user", content: h.text });
			else if (h.role === "assistant")
				messages.push({
					role: "assistant",
					// null content is only valid alongside tool_calls
					content: h.text || (h.toolCalls?.length ? null : ""),
					...(h.toolCalls?.length && {
						tool_calls: h.toolCalls.map((tc) => ({
							id: tc.id,
							type: "function",
							function: { name: tc.name, arguments: JSON.stringify(tc.input) },
						})),
					}),
				});
			else if (h.role === "toolResults")
				for (const r of h.results)
					messages.push({ role: "tool", tool_call_id: r.id, content: r.content });
		}
		const response = await compat().chat.completions.create({
			model: model(tier),
			...noThinking(tier),
			max_tokens: maxTokens,
			messages,
			tools: tools.map((t) => ({
				type: "function",
				function: { name: t.name, description: t.description, parameters: t.schema },
			})),
		});
		const msg = response.choices[0]?.message || {};
		return {
			text: msg.content?.trim() || "",
			toolCalls: (msg.tool_calls || []).map((tc) => ({
				id: tc.id,
				name: tc.function.name,
				input: JSON.parse(tc.function.arguments || "{}"),
			})),
		};
	}

	const messages = [];
	for (const h of history) {
		if (h.role === "user") messages.push({ role: "user", content: h.text });
		else if (h.role === "assistant") {
			const content = [];
			if (h.text) content.push({ type: "text", text: h.text });
			for (const tc of h.toolCalls || [])
				content.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.input });
			messages.push({ role: "assistant", content });
		} else if (h.role === "toolResults")
			messages.push({
				role: "user",
				content: h.results.map((r) => ({
					type: "tool_result",
					tool_use_id: r.id,
					content: r.content,
				})),
			});
	}
	const response = await anthropic().beta.messages.create({
		...claudeParams(tier),
		system,
		tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema })),
		messages,
	});
	if (response.stop_reason === "refusal") return { text: "", toolCalls: [] };
	return {
		text: response.content.find((b) => b.type === "text")?.text?.trim() || "",
		toolCalls: response.content
			.filter((b) => b.type === "tool_use")
			.map((b) => ({ id: b.id, name: b.name, input: b.input })),
	};
};

// ---------------------------------------------------------------------------
// completeJson: text in, JSON object matching `schema` out (structured
// outputs on every provider, so no fishing JSON out of prose).
// ---------------------------------------------------------------------------
export const completeJson = async ({ system, text, schema, tier = "smart" }) => {
	if (isCompat()) {
		const response = await compat().chat.completions.create({
			model: model(tier),
			...noThinking(tier),
			max_tokens: 16000,
			response_format: { type: "json_schema", json_schema: { name: "result", schema } },
			messages: [
				{ role: "system", content: system },
				{ role: "user", content: text },
			],
		});
		return JSON.parse(response.choices[0]?.message?.content || "{}");
	}

	const { type, schema: outputSchema } = jsonSchemaOutputFormat(schema);
	const response = await anthropic().beta.messages.create({
		...claudeParams(tier),
		output_config: { effort: EFFORT[tier] || "low", format: { type, schema: outputSchema } },
		system,
		messages: [{ role: "user", content: text }],
	});
	if (response.stop_reason === "refusal") throw new Error("The model declined this request");
	return JSON.parse(response.content.find((b) => b.type === "text")?.text || "{}");
};

// ---------------------------------------------------------------------------
// extractStructured: vision extraction of a JSON object matching `schema` from
// an image or PDF. OpenAI path uses json_schema response format; PDFs fall
// back to Anthropic (better native PDF support) when a key is available.
// ---------------------------------------------------------------------------
export const extractStructured = async ({ prompt, schema, fileBase64, mediaType }) => {
	const data = fileBase64.replace(/^data:[^;]+;base64,/, "");
	const isPdf = mediaType === "application/pdf";
	const useAnthropic =
		getProvider() === "anthropic" || (isPdf && process.env.ANTHROPIC_API_KEY);

	if (!useAnthropic) {
		const filePart = isPdf
			? { type: "file", file: { filename: "document.pdf", file_data: `data:${mediaType};base64,${data}` } }
			: { type: "image_url", image_url: { url: `data:${mediaType};base64,${data}` } };
		const response = await compat().chat.completions.create({
			model: model("smart"),
			max_tokens: 4096,
			response_format: {
				type: "json_schema",
				json_schema: { name: "extraction", schema },
			},
			messages: [{ role: "user", content: [filePart, { type: "text", text: prompt }] }],
		});
		try {
			return JSON.parse(response.choices[0]?.message?.content || "{}");
		} catch {
			return {};
		}
	}

	// Structured outputs, not forced tool use (tool_choice "tool" is a 400 on
	// Claude Sonnet 5.5). Always the Anthropic model here, even when a PDF is
	// routed to Claude while another provider is the default.
	const source = { type: "base64", media_type: mediaType, data };
	const { type, schema: outputSchema } = jsonSchemaOutputFormat(schema);
	const response = await anthropic().beta.messages.create({
		...claudeParams("smart"),
		model: MODELS.anthropic.smart,
		output_config: { effort: EFFORT.smart, format: { type, schema: outputSchema } },
		messages: [
			{
				role: "user",
				content: [
					isPdf ? { type: "document", source } : { type: "image", source },
					{ type: "text", text: prompt },
				],
			},
		],
	});
	if (response.stop_reason === "refusal") return {};
	try {
		return JSON.parse(response.content.find((b) => b.type === "text")?.text || "{}");
	} catch {
		return {};
	}
};

export default { getProvider, complete, completeWithTools, completeJson, extractStructured };

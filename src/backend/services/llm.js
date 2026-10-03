// Provider adapter for the engine's LLM calls. OpenAI by default, Anthropic as
// the fallback flow; switch explicitly with LLM_PROVIDER=openai|anthropic.
// Callers speak one neutral format; all provider wire-format differences live
// in this file.

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const MODELS = {
	openai: { fast: "gpt-4.1-mini", smart: "gpt-4.1" },
	anthropic: { fast: "claude-sonnet-5", smart: "claude-opus-4-8" },
};

let anthropicClient = null;
let openaiClient = null;
const anthropic = () =>
	(anthropicClient ||= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));
const openai = () => (openaiClient ||= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

export const getProvider = () => {
	const forced = process.env.LLM_PROVIDER;
	if (forced === "anthropic" || forced === "openai") return forced;
	return process.env.OPENAI_API_KEY ? "openai" : "anthropic";
};

const model = (tier) => MODELS[getProvider()][tier] || MODELS[getProvider()].fast;

// ---------------------------------------------------------------------------
// complete: plain chat. messages = [{ role: "user"|"assistant", text }]
// ---------------------------------------------------------------------------
export const complete = async ({ system, messages, maxTokens = 600, tier = "fast" }) => {
	if (getProvider() === "openai") {
		const response = await openai().chat.completions.create({
			model: model(tier),
			max_tokens: maxTokens,
			messages: [
				{ role: "system", content: system },
				...messages.map((m) => ({ role: m.role, content: m.text })),
			],
		});
		return response.choices[0]?.message?.content?.trim() || "";
	}

	const response = await anthropic().messages.create({
		model: model(tier),
		max_tokens: maxTokens,
		// fast tier is spoken dialogue: thinking would eat the budget and add
		// latency. smart tier (reports) thinks adaptively.
		thinking: tier === "fast" ? { type: "disabled" } : { type: "adaptive" },
		system,
		messages: messages.map((m) => ({ role: m.role, content: m.text })),
	});
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
	if (getProvider() === "openai") {
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
		const response = await openai().chat.completions.create({
			model: model(tier),
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
	const response = await anthropic().messages.create({
		model: model(tier),
		max_tokens: maxTokens,
		thinking: { type: "disabled" },
		system,
		tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema })),
		messages,
	});
	return {
		text: response.content.find((b) => b.type === "text")?.text?.trim() || "",
		toolCalls: response.content
			.filter((b) => b.type === "tool_use")
			.map((b) => ({ id: b.id, name: b.name, input: b.input })),
	};
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
		const response = await openai().chat.completions.create({
			model: MODELS.openai.smart,
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

	const source = { type: "base64", media_type: mediaType, data };
	const response = await anthropic().messages.create({
		model: MODELS.anthropic.smart,
		max_tokens: 4096,
		tools: [{ name: "record_extraction", description: prompt, input_schema: schema }],
		tool_choice: { type: "tool", name: "record_extraction" },
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
	const toolUse = response.content.find((b) => b.type === "tool_use");
	return toolUse ? toolUse.input : {};
};

export default { getProvider, complete, completeWithTools, extractStructured };

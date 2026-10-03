import dbConnect from "@/lib/dbConnect";
import Session from "@/backend/models/session";
import { redact } from "@/backend/services/redaction";

// POST { role: "agent"|"user", text, at, question?: { kind, aboutEventAt } }
// Agent turns that are questions are also logged in session.questions so we
// can prove the "3 questions, 1 guardrail" requirement.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    await dbConnect();
    const { role, text, at, question } = req.body || {};
    const session = await Session.findById(req.query.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const offRecord = session.offRecordSpans.some((s) => s.to == null);
    session.transcript.push({ role, text: offRecord ? "[off the record]" : redact(text), at, offRecord });
    if (role === "agent" && question && !offRecord) {
      session.questions.push({ at, text, ...question });
    }
    // Link the previous unanswered question to this user answer.
    if (role === "user" && !offRecord) {
      const q = [...session.questions].reverse().find((x) => x.answerTurnIndex == null);
      if (q) q.answerTurnIndex = session.transcript.length - 1;
    }
    await session.save();
    return res.status(200).json({ ok: true, turnIndex: session.transcript.length - 1 });
  } catch (error) {
    console.error("sessions/[id]/transcript error:", error);
    return res.status(500).json({ error: error.message });
  }
}

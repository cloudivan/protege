// Trust: the expert can take anything off the record. While on, frames are
// dropped unseen and transcript turns are stored as "[off the record]".
import { useState } from "react";
import { EyeOff, Eye } from "lucide-react";
import { api } from "@/lib/utils";

export default function OffRecordButton({ sessionId, getAt, onChange }) {
  const [on, setOn] = useState(false);
  const toggle = async () => {
    const next = !on;
    await api(`/api/sessions/${sessionId}/off-record`, { method: "POST", body: { on: next, at: getAt() } });
    setOn(next);
    onChange?.(next);
  };
  return (
    <button type="button" onClick={toggle} className={`btn ${on ? "bg-error-500 text-white" : "btn-secondary"}`}>
      {on ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
      {on ? "Back on the record" : "Off the record"}
    </button>
  );
}

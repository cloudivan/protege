// Creates (once) a session of `kind` for a workflow and provides the
// screen-moment clock. Used by the capture, debrief and teach pages.
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/utils";

export function useLiveSession(workflowId, kind, participantName) {
  const [session, setSession] = useState(null);
  const startRef = useRef(Date.now());
  const created = useRef(false);

  useEffect(() => {
    if (!workflowId || created.current) return;
    created.current = true;
    api("/api/sessions", { method: "POST", body: { workflowId, kind, participantName } })
      .then(({ session }) => {
        startRef.current = Date.now();
        setSession(session);
      })
      .catch((e) => toast.error(e.message));
  }, [workflowId, kind, participantName]);

  const getAt = useCallback(() => Date.now() - startRef.current, []);
  return { session, getAt };
}

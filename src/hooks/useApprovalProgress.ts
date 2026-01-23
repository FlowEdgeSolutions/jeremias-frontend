import { useEffect, useRef, useState } from "react";
import {
  APPROVAL_STEP_COUNT,
  ApprovalStep,
  buildApprovalErrorSteps,
  buildApprovalSteps,
  buildApprovalSuccessSteps,
} from "@/lib/approvalSteps";

const STEP_ADVANCE_MS = 1400;
const CLOSE_DELAY_MS = 1800;

export const useApprovalProgress = () => {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<ApprovalStep[]>(buildApprovalSteps(0));
  const intervalRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const activeIndexRef = useRef(0);

  const stopInterval = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
    }, CLOSE_DELAY_MS);
  };

  const start = () => {
    stopInterval();
    clearCloseTimeout();
    activeIndexRef.current = 0;
    setSteps(buildApprovalSteps(0));
    setOpen(true);

    intervalRef.current = window.setInterval(() => {
      activeIndexRef.current = Math.min(activeIndexRef.current + 1, APPROVAL_STEP_COUNT - 1);
      setSteps(buildApprovalSteps(activeIndexRef.current));
    }, STEP_ADVANCE_MS);
  };

  const finishSuccess = (emailSent: boolean) => {
    stopInterval();
    clearCloseTimeout();
    setSteps(buildApprovalSuccessSteps(emailSent));
    scheduleClose();
  };

  const finishError = (message: string) => {
    stopInterval();
    clearCloseTimeout();
    setSteps(buildApprovalErrorSteps(message));
    scheduleClose();
  };

  const onOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      stopInterval();
      clearCloseTimeout();
    }
    setOpen(nextOpen);
  };

  useEffect(() => {
    return () => {
      stopInterval();
      clearCloseTimeout();
    };
  }, []);

  return {
    open,
    steps,
    start,
    finishSuccess,
    finishError,
    onOpenChange,
  };
};

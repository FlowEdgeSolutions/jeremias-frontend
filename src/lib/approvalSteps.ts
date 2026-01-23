export type ApprovalStepStatus = "pending" | "active" | "done" | "error";

export type ApprovalStepId = "approve" | "invoice" | "sevdesk" | "email";

export type ApprovalStep = {
  id: ApprovalStepId;
  label: string;
  status: ApprovalStepStatus;
};

const BASE_STEPS: Array<{ id: ApprovalStepId; label: string }> = [
  { id: "approve", label: "Projekt wird freigegeben" },
  { id: "invoice", label: "Rechnung wird erstellt" },
  { id: "sevdesk", label: "Rechnung wird an Sevdesk uebertragen" },
  { id: "email", label: "E-Mail wird gesendet" },
];

export const APPROVAL_STEP_COUNT = BASE_STEPS.length;

const clampIndex = (value: number) => {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), BASE_STEPS.length - 1);
};

export const buildApprovalSteps = (activeIndex = 0): ApprovalStep[] => {
  const active = clampIndex(activeIndex);
  return BASE_STEPS.map((step, index) => ({
    ...step,
    status: index < active ? "done" : index === active ? "active" : "pending",
  }));
};

export const buildApprovalSuccessSteps = (emailSent: boolean): ApprovalStep[] => {
  return BASE_STEPS.map((step, index) => ({
    ...step,
    status: index === BASE_STEPS.length - 1 && !emailSent ? "error" : "done",
  }));
};

const resolveErrorIndex = (message: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes("sevdesk")) return 2;
  if (normalized.includes("rechnung") || normalized.includes("invoice")) return 1;
  if (normalized.includes("email") || normalized.includes("mail")) return 3;
  return 0;
};

export const buildApprovalErrorSteps = (message: string): ApprovalStep[] => {
  const errorIndex = resolveErrorIndex(message);
  return BASE_STEPS.map((step, index) => ({
    ...step,
    status: index < errorIndex ? "done" : index === errorIndex ? "error" : "pending",
  }));
};

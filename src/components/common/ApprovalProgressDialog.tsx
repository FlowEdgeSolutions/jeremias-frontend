import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ApprovalStep } from "@/lib/approvalSteps";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

type ApprovalProgressDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  steps: ApprovalStep[];
};

const StepIcon = ({ status }: { status: ApprovalStep["status"] }) => {
  if (status === "active") {
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  }
  if (status === "done") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (status === "error") {
    return <XCircle className="h-4 w-4 text-red-500" />;
  }
  return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
};

export const ApprovalProgressDialog = ({
  open,
  onOpenChange,
  title,
  description,
  steps,
}: ApprovalProgressDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                step.status === "active" && "bg-muted/50 text-foreground",
                step.status === "pending" && "text-muted-foreground",
                step.status === "done" && "text-foreground",
                step.status === "error" && "text-red-600"
              )}
            >
              <StepIcon status={step.status} />
              <span className={cn(step.status === "active" && "animate-pulse")}>{step.label}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

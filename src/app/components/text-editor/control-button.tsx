import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/app/components/ui/tooltip";
import { Button } from "@/src/app/components/ui/button";

interface ControlButtonProps {
  label: string;
  icon: React.ReactNode;
  command: () => boolean | void;
  canExecute: () => boolean;
  isActive: () => boolean;
  className?: string;
}

export function ControlButton({
  label,
  icon,
  command,
  canExecute,
  isActive,
  className,
}: ControlButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={() => command()}
              disabled={!canExecute()}
              className={`text-black w-10 aspect-square border-hidden rounded-none hover:bg-gray-400 ${
                isActive() ? "bg-gray-400" : "bg-transparent"
                } ${className || ""}`}
            >
              {icon}
            </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

import { ChevronDown } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A styled native <select>: best for long lists on phones (districts, areas,
 * breeds), with the same field tokens as Input.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "h-(--control-h) w-full min-w-0 appearance-none rounded-(--control-radius) border-(length:--border-w) border-(--field-line) bg-(--field-bg) ps-(--control-px) pe-9 text-base shadow-(--shadow-field) transition-[color,box-shadow] duration-(--motion-fast) outline-none focus-visible:border-ring focus-visible:shadow-(--shadow-field-focus) focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { NativeSelect };

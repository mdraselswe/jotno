import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-(--control-radius) border-(length:--border-w) border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,translate,scale] duration-(--motion-fast) ease-(--ease-press) outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:scale-(--press-scale) disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "glass bg-primary bg-(image:--primary-sheen) text-primary-foreground shadow-(--shadow-primary) inset-ring inset-ring-white/15 hover:translate-x-(--hover-x) hover:translate-y-(--hover-y) hover:bg-primary/90 hover:shadow-(--shadow-primary-hover) active:shadow-(--shadow-primary-active) active:not-aria-[haspopup]:translate-x-(--press-x) active:not-aria-[haspopup]:translate-y-(--press-y)",
        outline:
          "glass border-(--line) bg-card/70 shadow-(--shadow-control) inset-ring inset-ring-foreground/8 hover:translate-x-(--hover-x) hover:translate-y-(--hover-y) hover:bg-card hover:text-foreground hover:shadow-(--shadow-control-hover) active:shadow-(--shadow-control-active) active:not-aria-[haspopup]:translate-x-(--press-x) active:not-aria-[haspopup]:translate-y-(--press-y) aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "glass bg-secondary/85 text-secondary-foreground shadow-(--shadow-control) hover:translate-x-(--hover-x) hover:translate-y-(--hover-y) hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] hover:shadow-(--shadow-control-hover) active:shadow-(--shadow-control-active) active:not-aria-[haspopup]:translate-x-(--press-x) active:not-aria-[haspopup]:translate-y-(--press-y) aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "glass hover:bg-foreground/6 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "glass bg-destructive/12 text-destructive inset-ring inset-ring-destructive/15 hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-(--control-h) gap-1.5 px-(--control-px) has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-(--control-h-sm) gap-1 px-(--control-px) text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-(--control-h-lg) gap-1.5 px-[calc(var(--control-px)*1.25)] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-(--control-h)",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-(--control-h-sm)",
        "icon-lg": "size-(--control-h-lg)",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * Looks come from the design knobs (src/config/design.ts): radius, border,
 * shadow, press and height are tokens, so every project's buttons differ.
 * `effect` adds an opt-in flourish on top of any look:
 *   shine: a light sweeps across on hover (hero, pricing CTA)
 *   beam:  a light runs around the border on hover/focus (outline buttons)
 */
function Button({
  className,
  variant = "default",
  size = "default",
  effect,
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { effect?: "shine" | "beam" }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-effect={effect}
      className={cn(buttonVariants({ variant, size }), effect && "relative isolate", className)}
      {...props}
    >
      {effect === "shine" ? <span aria-hidden="true" className="shine" /> : null}
      {effect === "beam" ? <span aria-hidden="true" className="edge beam" /> : null}
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };

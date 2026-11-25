"use client";

import { Check, Sparkles } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties, PointerEvent } from "react";
import { cn } from "@/lib/utils";

export interface PricingCard {
  name: string;
  price: string;
  unit: string;
  body: string;
  points: readonly string[];
  cta: string;
  href: Route;
  featured?: boolean;
  /** Shown on the featured card. */
  tag?: string;
}

const SQUISH = { type: "spring", stiffness: 420, damping: 14, mass: 0.8 } as const;

function Card({ plan, index }: { plan: PricingCard; index: number }) {
  const reduce = useReducedMotion();
  // Tilt toward the pointer, like pressing into a soft cushion.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), { stiffness: 220, damping: 18 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-8, 8]), { stiffness: 220, damping: 18 });
  const move = (e: PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <motion.article
      whileTap={reduce ? undefined : { scaleX: 1.04, scaleY: 0.95 }}
      onPointerMove={move}
      onPointerLeave={reset}
      style={
        reduce
          ? ({ "--i": index } as CSSProperties)
          : ({ rotateX: rx, rotateY: ry, transformPerspective: 900, "--i": index } as CSSProperties)
      }
      className={cn(
        "glow-border relative grid content-start gap-5 rounded-(--radius-2xl) p-6 shadow-(--shadow-card) transition-shadow duration-(--motion-base) hover:shadow-(--shadow-card-hover) sm:p-8",
        plan.featured
          ? "bg-primary text-primary-foreground lg:-my-4 lg:py-12"
          : "bg-card text-card-foreground",
      )}
    >
      {plan.featured && plan.tag ? (
        <span className="absolute top-5 right-5 inline-flex items-center gap-1 rounded-full bg-highlight px-3 py-1 text-xs font-bold text-highlight-foreground">
          <Sparkles aria-hidden="true" className="size-3.5" />
          {plan.tag}
        </span>
      ) : null}
      <header className="grid gap-1">
        <h3 className={cn("font-heading text-lg font-semibold", plan.featured && plan.tag && "pe-28")}>
          {plan.name}
        </h3>
        <p className={cn("text-sm", plan.featured ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {plan.body}
        </p>
      </header>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="relative isolate inline-block font-heading text-5xl font-bold tracking-tight whitespace-nowrap tabular-nums">
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-x-0 bottom-[0.08em] -z-10 h-[0.28em] rounded-full",
              plan.featured ? "bg-primary-foreground/20" : "bg-highlight/45",
            )}
          />
          {plan.price}
        </span>
        <span
          className={cn("text-sm", plan.featured ? "text-primary-foreground/80" : "text-muted-foreground")}
        >
          {plan.unit}
        </span>
      </p>
      <ul className="grid gap-2.5 text-sm">
        {plan.points.map((pt) => (
          <li key={pt} className="flex gap-2.5">
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full",
                plan.featured ? "bg-primary-foreground/20" : "bg-primary/12 text-primary",
              )}
            >
              <Check aria-hidden="true" className="size-3.5" />
            </span>
            {pt}
          </li>
        ))}
      </ul>
      <motion.div whileTap={reduce ? undefined : { scale: 0.92 }} transition={SQUISH} className="mt-2">
        <Link
          href={plan.href}
          className={cn(
            "glass relative inline-flex h-12 w-full items-center justify-center rounded-(--control-radius) px-6 font-semibold transition-colors duration-(--motion-fast)",
            plan.featured
              ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              : "bg-foreground text-background hover:bg-foreground/85",
          )}
        >
          {plan.cta}
        </Link>
      </motion.div>
    </motion.article>
  );
}

/** Pricing cards that squish under the pointer (motion/react springs). */
export function SquishyPricing({ plans }: { plans: readonly PricingCard[] }) {
  return (
    <div className="grid items-center gap-6 [perspective:1200px] lg:grid-cols-3">
      {plans.map((p, i) => (
        <Card key={p.name} plan={p} index={i} />
      ))}
    </div>
  );
}

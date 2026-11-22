"use client";

import { Check, Sparkles } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import type { PointerEvent } from "react";
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
      initial={reduce ? false : { opacity: 0, y: 60, scale: 0.92 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ type: "spring", stiffness: 160, damping: 18, delay: index * 0.08 }}
      whileHover={reduce ? undefined : { y: -10 }}
      whileTap={reduce ? undefined : { scaleX: 1.04, scaleY: 0.95 }}
      onPointerMove={move}
      onPointerLeave={reset}
      style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={cn(
        "relative grid content-start gap-5 rounded-(--radius-3xl) p-6 shadow-(--shadow-card) sm:p-8",
        plan.featured ? "bg-primary text-primary-foreground lg:-my-4 lg:py-12" : "bg-card",
      )}
    >
      {plan.featured && plan.tag ? (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-highlight px-3 py-1 text-xs font-bold text-highlight-foreground shadow-(--shadow-card)">
          <Sparkles aria-hidden="true" className="size-3.5" />
          {plan.tag}
        </span>
      ) : null}
      <header className="grid gap-1">
        <h3 className="font-heading text-lg font-semibold">{plan.name}</h3>
        <p className={cn("text-sm", plan.featured ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {plan.body}
        </p>
      </header>
      <p className="flex items-baseline gap-2">
        <motion.span
          className="relative inline-block font-heading text-5xl font-bold tracking-tight [font-stretch:80%] tabular-nums"
          whileHover={reduce ? undefined : { scale: [1, 1.18, 0.94, 1.04, 1] }}
          transition={{ duration: 0.6 }}
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute -inset-x-3 -inset-y-1 -z-10 jelly rounded-[45%_55%_60%_40%/55%_45%_55%_45%]",
              plan.featured ? "bg-primary-foreground/15" : "bg-highlight/35",
            )}
          />
          {plan.price}
        </motion.span>
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
            "inline-flex h-12 w-full items-center justify-center rounded-full px-6 font-semibold transition-colors duration-(--motion-fast)",
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

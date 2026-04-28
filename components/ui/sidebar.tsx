import * as React from "react";
import { cn } from "@/lib/utils";

export function SidebarLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      {sidebar}
      {children}
    </div>
  );
}

export function Sidebar({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <aside
      className={cn("lg:sticky lg:top-6 lg:self-start", className)}
      {...props}
    />
  );
}

export function SidebarPanel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroup({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {title ? (
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {title}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3 lg:block lg:space-y-2">
        {children}
      </div>
    </div>
  );
}

export function SidebarItem({
  href,
  title,
  hint,
  active,
  badge,
}: {
  href: string;
  title: string;
  hint: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "w-full min-w-0 rounded-2xl border px-4 py-3 transition lg:block",
        active
          ? "border-sky-300 bg-sky-100 text-sky-950 shadow-sm"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{title}</span>
        {badge ? (
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-xs leading-6 text-slate-500">{hint}</div>
    </a>
  );
}

export function SidebarInset({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("min-w-0 space-y-6", className)} {...props} />;
}

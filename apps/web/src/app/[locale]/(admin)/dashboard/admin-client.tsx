"use client";

import type { AdminKPIs } from "@/actions/admin";

// ─── Colour tokens (dark indigo theme) ────────────────────────────────────────
const C = {
  bg: "oklch(10% 0.04 265)",
  card: "oklch(14% 0.05 265)",
  cardHover: "oklch(16% 0.055 265)",
  border: "oklch(22% 0.065 265)",
  borderAccent: "oklch(35% 0.09 265)",
  saffron: "oklch(68% 0.16 68)",
  saffronDim: "oklch(60% 0.14 68)",
  text: "oklch(88% 0.015 265)",
  muted: "oklch(52% 0.06 265)",
  dim: "oklch(35% 0.06 265)",
  green: "oklch(62% 0.17 145)",
  red: "oklch(62% 0.2 25)",
  amber: "oklch(72% 0.155 70)",
  blue: "oklch(65% 0.15 240)",
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = false,
  wide = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${wide ? "col-span-2" : ""}`}
      style={{
        background: C.card,
        border: `1px solid ${accent ? C.borderAccent : C.border}`,
      }}
    >
      <p className="mb-1 text-xs font-medium uppercase tracking-widest" style={{ color: C.muted }}>
        {label}
      </p>
      <p
        className="text-4xl font-bold tabular-nums leading-none"
        style={{ color: accent ? C.saffron : C.text }}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1.5 text-xs" style={{ color: C.muted }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function Pill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3"
      style={{ background: "oklch(18% 0.06 265)", border: `1px solid ${C.border}` }}
    >
      <span className="text-xs font-medium" style={{ color: C.muted }}>
        {label}
      </span>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>
        {count}
      </span>
    </div>
  );
}

// ─── Gauge bar ────────────────────────────────────────────────────────────────

function GaugeBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      className="mt-3 h-2 w-full overflow-hidden rounded-full"
      style={{ background: "oklch(20% 0.06 265)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: C.dim }}>
      {title}
    </h2>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function AdminClient({ kpis }: { kpis: AdminKPIs }) {
  const now = new Date().toLocaleString("fr-MA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page title */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.text }}>
            Tableau de bord
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: C.muted }}>
            Plateforme Kasb — données en temps réel
          </p>
        </div>
        <p className="font-mono text-xs" style={{ color: C.dim }}>
          {now}
        </p>
      </div>

      {/* ── Row 1: Activity ── */}
      <section>
        <SectionHeader title="Activité" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="DAU" value={kpis.dau} sub="actifs aujourd'hui" accent />
          <StatCard label="MAU" value={kpis.mau} sub="actifs ce mois" />
          <StatCard label="Saisies aujourd'hui" value={kpis.entriesToday} />
          <StatCard
            label="Moy. saisies / jour"
            value={kpis.avgEntriesPerDay30d}
            sub="sur 30 jours"
          />
        </div>
      </section>

      {/* ── Row 2: Platform ── */}
      <section>
        <SectionHeader title="Plateforme" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Activités totales" value={kpis.totalBusinesses} />
          <StatCard label="Scores calculés" value={kpis.scoresComputed} accent />
          <StatCard
            label="Taux de formalisation"
            value={`${kpis.formalizationRate}%`}
            sub={`${kpis.aeRegistered} inscriptions AE`}
          />
        </div>
      </section>

      {/* ── Row 3: Formalization gauge + credit apps ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Formalization gauge card */}
        <div
          className="rounded-2xl p-5"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          <p
            className="mb-1 text-xs font-medium uppercase tracking-widest"
            style={{ color: C.muted }}
          >
            Progression vers la formalisation
          </p>
          <p className="text-3xl font-bold tabular-nums" style={{ color: C.amber }}>
            {kpis.formalizationRate}
            <span className="text-lg">%</span>
          </p>
          <GaugeBar pct={kpis.formalizationRate} color={C.amber} />
          <div className="mt-3 flex justify-between text-xs" style={{ color: C.muted }}>
            <span>{kpis.aeRegistered} inscrits AE</span>
            <span>{kpis.totalBusinesses} total</span>
          </div>
        </div>

        {/* Credit applications breakdown */}
        <div
          className="rounded-2xl p-5"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          <p
            className="mb-1 text-xs font-medium uppercase tracking-widest"
            style={{ color: C.muted }}
          >
            Demandes de crédit
          </p>
          <p className="mb-4 text-3xl font-bold tabular-nums" style={{ color: C.text }}>
            {kpis.creditApps.total}
          </p>
          <div className="space-y-2">
            <Pill label="Soumises" count={kpis.creditApps.submitted} color={C.amber} />
            <Pill label="En examen" count={kpis.creditApps.reviewing} color={C.blue} />
            <Pill label="Approuvées" count={kpis.creditApps.approved} color={C.green} />
            <Pill label="Refusées" count={kpis.creditApps.rejected} color={C.red} />
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs"
        style={{
          background: "oklch(13% 0.05 265)",
          border: `1px solid ${C.border}`,
          color: C.dim,
        }}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.green }} />
        Système opérationnel — données mises à jour à chaque chargement de page
      </div>
    </div>
  );
}

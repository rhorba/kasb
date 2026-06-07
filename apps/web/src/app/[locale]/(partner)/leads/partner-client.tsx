"use client";

import { updateApplicationStatus } from "@/actions/partner";
import type { PartnerLead } from "@/actions/partner";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Soumise",
  reviewing: "En examen",
  approved: "Approuvée",
  rejected: "Refusée",
  withdrawn: "Annulée",
};

const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-700 border-amber-200",
  reviewing: "bg-blue-100 text-blue-700 border-blue-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  withdrawn: "bg-gray-100 text-gray-500 border-gray-200",
};

function formatMAD(centimes: number) {
  return `${(centimes / 100).toLocaleString("fr-MA")} MAD`;
}

function LeadRow({ lead }: { lead: PartnerLead }) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const canUpdate = lead.status === "submitted" || lead.status === "reviewing";

  async function handleUpdate(newStatus: "reviewing" | "approved" | "rejected") {
    setUpdating(true);
    await updateApplicationStatus({ applicationId: lead.id, status: newStatus });
    setUpdating(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Summary row */}
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 p-4 text-start"
        onClick={() => setExpanded((e) => !e)}
        style={{ minHeight: "unset" }}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{lead.businessName}</p>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[lead.status] ?? STATUS_STYLE.withdrawn}`}
            >
              {STATUS_LABEL[lead.status] ?? lead.status}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {lead.businessCity} · Score {lead.scoreAtApplication}/100 ·{" "}
            {new Date(lead.submittedAt).toLocaleDateString("fr-MA")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-kasb-500 tabular-nums">
            {formatMAD(lead.requestedAmount)}
          </p>
          <p className="text-xs text-gray-400">demandé</p>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 p-4">
          <div className="mb-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-400">Score Kasb</p>
              <p className="mt-0.5 font-semibold text-gray-700">{lead.scoreAtApplication}/100</p>
            </div>
            <div>
              <p className="text-gray-400">Montant demandé</p>
              <p className="mt-0.5 font-semibold text-gray-700">
                {formatMAD(lead.requestedAmount)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Ville</p>
              <p className="mt-0.5 font-semibold text-gray-700">{lead.businessCity}</p>
            </div>
            <div>
              <p className="text-gray-400">Dernière mise à jour</p>
              <p className="mt-0.5 font-semibold text-gray-700">
                {new Date(lead.updatedAt).toLocaleDateString("fr-MA")}
              </p>
            </div>
          </div>

          {canUpdate && (
            <div className="flex gap-2">
              {lead.status === "submitted" && (
                <button
                  type="button"
                  onClick={() => handleUpdate("reviewing")}
                  disabled={updating}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl bg-blue-600 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Mettre en examen
                </button>
              )}
              <button
                type="button"
                onClick={() => handleUpdate("approved")}
                disabled={updating}
                className="flex h-10 flex-1 items-center justify-center rounded-xl bg-income text-xs font-semibold text-white disabled:opacity-50"
              >
                Approuver
              </button>
              <button
                type="button"
                onClick={() => handleUpdate("rejected")}
                disabled={updating}
                className="flex h-10 flex-1 items-center justify-center rounded-xl bg-expense text-xs font-semibold text-white disabled:opacity-50"
              >
                Refuser
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PartnerClient({ leads }: { leads: PartnerLead[] }) {
  const pending = leads.filter((l) => l.status === "submitted" || l.status === "reviewing");
  const closed = leads.filter(
    (l) => l.status === "approved" || l.status === "rejected" || l.status === "withdrawn",
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-kasb-500">Mes Leads</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {leads.length} demande{leads.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      {leads.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 py-16 text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-3 text-sm font-semibold text-gray-600">Aucune demande pour l'instant</p>
          <p className="mt-1 text-xs text-gray-400">
            Les demandes des clients Kasb apparaîtront ici
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            En attente · {pending.length}
          </h2>
          <div className="space-y-3">
            {pending.map((lead) => (
              <LeadRow key={lead.id} lead={lead} />
            ))}
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Clôturées · {closed.length}
          </h2>
          <div className="space-y-3">
            {closed.map((lead) => (
              <LeadRow key={lead.id} lead={lead} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

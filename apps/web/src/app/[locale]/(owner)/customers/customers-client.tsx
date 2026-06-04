"use client";

import type { CustomerWithMeta } from "@/actions/customer";
import AddCustomerSheet from "@/components/add-customer-sheet";
import { Link } from "@/i18n/navigation";
import { formatMAD } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  customers: CustomerWithMeta[];
};

export default function CustomersClient({ customers }: Props) {
  const t = useTranslations("customers");
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-kasb-600">{t("title")}</h1>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex h-12 items-center gap-2 rounded-xl bg-kasb-500 px-4 text-sm font-semibold text-white shadow-md active:scale-95"
        >
          + {t("addCustomer")}
        </button>
      </div>

      {/* Customer list */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 py-12 text-center">
          <p className="text-2xl">👥</p>
          <p className="mt-2 text-sm text-gray-500">{t("noCustomers")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {customers.map((customer, i) => {
            const hasDebt = customer.outstandingDebt > 0;
            return (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className={`flex items-center justify-between px-4 py-3 active:bg-gray-50 ${
                  i < customers.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kasb-50 text-base font-bold text-kasb-600">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{customer.name}</p>
                    {customer.phone && <p className="text-xs text-gray-400">{customer.phone}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold tabular-nums ${
                      hasDebt ? "text-expense" : "text-income"
                    }`}
                  >
                    {hasDebt ? formatMAD(customer.outstandingDebt) : t("settled")}
                  </p>
                  {hasDebt && <p className="text-xs text-gray-400">{t("owes")}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <AddCustomerSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => {
          setSheetOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

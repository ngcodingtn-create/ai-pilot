"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CopyLicenseCard({
  customer,
  licenseKey,
  whatsapp,
}: {
  customer: string;
  licenseKey: string;
  whatsapp?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLicense() {
    await navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Card className="mt-4 overflow-hidden border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#f8fffc_100%)]">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              Licence prête à envoyer sur WhatsApp
            </p>
            <div className="mt-2 grid gap-1 text-sm text-emerald-900">
              <p>
                <span className="font-semibold">Client:</span> {customer}
              </p>
              {whatsapp ? (
                <p>
                  <span className="font-semibold">WhatsApp:</span> {whatsapp}
                </p>
              ) : null}
            </div>
          </div>

          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                `Bonjour ${customer}, voici votre clé de licence AIPilot : ${licenseKey}`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
            >
              Ouvrir WhatsApp
            </a>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            readOnly
            value={licenseKey}
            className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900"
          />
          <Button type="button" onClick={copyLicense} variant="success" className="sm:w-auto">
            {copied ? "Copiée" : "Copier la clé"}
          </Button>
        </div>

        <p className="mt-3 text-xs text-emerald-800">
          Envoie cette clé au client sur WhatsApp puis demande-lui de revenir au
          portail pour la saisir.
        </p>
      </CardContent>
    </Card>
  );
}

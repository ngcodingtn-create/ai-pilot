"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildWhatsAppUrl, normalizeTunisiaWhatsappNumber } from "@/lib/whatsapp";

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
  const normalizedWhatsapp = whatsapp
    ? normalizeTunisiaWhatsappNumber(whatsapp)
    : null;
  const whatsappUrl = whatsapp
    ? buildWhatsAppUrl(
        whatsapp,
        `Bonjour ${customer}, voici votre clé de licence AIPilot : ${licenseKey}`,
      )
    : null;

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
                <p className="break-all">
                  <span className="font-semibold">WhatsApp:</span>{" "}
                  {normalizedWhatsapp?.display ?? whatsapp}
                </p>
              ) : null}
            </div>
          </div>

          {whatsapp || whatsappUrl ? (
            <a
              href={whatsappUrl ?? buildLooseWhatsAppUrl(whatsapp ?? "", customer, licenseKey)}
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
            className="w-full min-w-0 rounded-xl border border-emerald-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900"
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

function buildLooseWhatsAppUrl(whatsappNumber: string, customer: string, licenseKey: string) {
  const message = `Bonjour ${customer}, voici votre clé de licence AIPilot : ${licenseKey}`;
  const normalized = normalizeTunisiaWhatsappNumber(whatsappNumber);
  const digits = String(whatsappNumber ?? "").replace(/[^\d]/g, "");
  const phone = normalized?.waId || digits || "";

  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

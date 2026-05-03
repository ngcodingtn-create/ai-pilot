export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          AIPilot
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Politique de confidentialité
        </h1>
        <p className="mt-4 leading-8 text-slate-300">
          AIPilot collecte les informations que vous envoyez dans le formulaire
          d’essai, notamment le prénom et le numéro WhatsApp, afin de répondre à
          votre demande, fournir l’accès au service et assurer le support.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Mesure publicitaire</h2>
          <p className="leading-8 text-slate-300">
            Le funnel peut utiliser Meta Pixel et Meta Conversions API pour mesurer
            les visites, demandes d’essai, handoffs WhatsApp et conversions paid.
            Les données techniques comme `_fbp`, `_fbc`, `fbclid`, l’adresse IP,
            le navigateur, l’URL de la page et les paramètres UTM peuvent être
            utilisées pour attribuer correctement les campagnes.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Utilisation des données</h2>
          <p className="leading-8 text-slate-300">
            Ces données servent à contacter les prospects, améliorer le funnel,
            comprendre les campagnes performantes et confirmer les conversions.
            AIPilot ne publie pas vos informations personnelles dans l’interface
            publique.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="leading-8 text-slate-300">
            Pour une demande de suppression ou de correction, contactez le support
            AIPilot via WhatsApp ou email depuis le portail.
          </p>
        </section>

        <a
          href="/funnel"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
        >
          Retour au funnel
        </a>
      </article>
    </main>
  );
}

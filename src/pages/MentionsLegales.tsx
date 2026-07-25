import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';

const PLACEHOLDER = (label: string) => (
  <span className="text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded px-1.5 py-0.5 text-[12px]">
    [À compléter : {label}]
  </span>
);

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0a1a] via-[#16102a] to-[#0c0814] text-foreground">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-purple-300 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à Virtuel-RT
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Scale className="w-7 h-7 text-purple-300" />
          <h1 className="text-2xl font-bold tracking-tight">Mentions légales</h1>
        </div>
        <p className="text-sm text-muted-foreground/60 mb-8">
          Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique (LCEN).
        </p>

        <div className="space-y-8 text-[13px] leading-relaxed text-muted-foreground/85">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">1. Éditeur du site</h2>
            <p>Le site Virtuel-RT est édité par :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Raison sociale / nom : {PLACEHOLDER('nom de l’éditeur ou de la société')}</li>
              <li>Forme juridique : {PLACEHOLDER('ex. SAS, association, particulier')}</li>
              <li>Siège social : {PLACEHOLDER('adresse complète')}</li>
              <li>SIRET / RCS : {PLACEHOLDER('numéro')}</li>
              <li>Capital social : {PLACEHOLDER('montant si société')}</li>
              <li>Directeur de la publication : {PLACEHOLDER('nom du responsable')}</li>
              <li>Contact : {PLACEHOLDER('email de contact')}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">2. Hébergeur</h2>
            <p>Le site est hébergé par :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Hostinger International Ltd.</li>
              <li>61 Lordou Vironos Street, 6023 Larnaca, Chypre</li>
              <li>Site : <a className="text-purple-300 underline" href="https://www.hostinger.fr" target="_blank" rel="noreferrer">www.hostinger.fr</a></li>
            </ul>
            <p className="text-[12px] text-muted-foreground/50">
              Les données applicatives (comptes, messages) peuvent également être stockées via Supabase (infrastructure cloud) — {PLACEHOLDER('préciser la région / projet si besoin')}.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">3. Propriété intellectuelle</h2>
            <p>
              L’ensemble des éléments constituant le site Virtuel-RT (textes, graphismes, logo, interface, code, bases de données)
              est protégé par le droit d’auteur et le droit de la propriété intellectuelle. Toute reproduction, représentation,
              modification ou exploitation non autorisée est interdite sans accord préalable écrit de l’éditeur.
            </p>
            <p>
              Les contenus publiés par les utilisateurs restent sous leur responsabilité ; en les publiant, ils accordent à
              Virtuel-RT une licence non exclusive d’affichage sur le service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">4. Données personnelles (RGPD)</h2>
            <p>
              Virtuel-RT traite des données nécessaires au fonctionnement du chat (identifiant / pseudo, avatar, messages,
              préférences, éventuellement adresse email en cas de compte). Le responsable du traitement est l’éditeur identifié ci-dessus.
            </p>
            <p>
              Conformément au Règlement (UE) 2016/679 (RGPD) et à la loi « Informatique et Libertés », vous disposez d’un droit
              d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité. Pour les exercer :
              {' '}{PLACEHOLDER('email DPO / contact RGPD')}.
            </p>
            <p>
              Vous pouvez introduire une réclamation auprès de la CNIL (<a className="text-purple-300 underline" href="https://www.cnil.fr" target="_blank" rel="noreferrer">www.cnil.fr</a>).
            </p>
            <p className="text-[12px] text-muted-foreground/50">
              Une politique de confidentialité détaillée pourra être publiée séparément — {PLACEHOLDER('lien politique de confidentialité si disponible')}.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">5. Cookies et traceurs</h2>
            <p>
              Le site peut utiliser des cookies ou stockage local (localStorage) strictement nécessaires au fonctionnement
              (session, préférences d’affichage, favoris locaux). Des cookies analytics éventuels feront l’objet d’un consentement
              lorsque cela sera applicable — {PLACEHOLDER('préciser outils analytics / bannière cookies')}.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">6. Responsabilité</h2>
            <p>
              L’éditeur s’efforce d’assurer la disponibilité et la sécurité du service, sans garantie d’absence d’interruption
              ou d’erreur. Les utilisateurs sont seuls responsables des contenus qu’ils publient. Virtuel-RT ne saurait être
              tenu responsable des dommages résultant d’un usage non conforme, d’un contenu tiers, ou d’une indisponibilité
              temporaire du service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">7. Droit applicable</h2>
            <p>
              Les présentes mentions sont régies par le droit français. En cas de litige, et à défaut de résolution amiable,
              les tribunaux français compétents seront seuls compétents.
            </p>
          </section>

          <p className="text-[11px] text-muted-foreground/40 pt-4 border-t border-white/5">
            Dernière mise à jour : juillet 2026 · Virtuel-RT
          </p>
        </div>
      </div>
    </div>
  );
}

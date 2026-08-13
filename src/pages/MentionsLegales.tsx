import React from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Scale } from 'lucide-react';

const CONTACT_EMAIL = 'alerts@virtuel-rt.com';
const SITE_URL = 'https://www.virtuel-rt.com';

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
          Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique (LCEN)
          et au Règlement (UE) 2016/679 (RGPD).
        </p>

        <div className="space-y-8 text-[13px] leading-relaxed text-muted-foreground/85">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">1. Éditeur du site</h2>
            <p>
              Le site <strong className="text-foreground font-semibold">Virtuel-RT</strong> ({SITE_URL} / virtuel-rt.com)
              est un service de chat communautaire <strong className="text-foreground font-semibold">réservé aux majeurs (18+)</strong>,
              avec fonctionnalités sociales (salons, messages, présence) et une offre Premium (dont mode coquin 18+).
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nom du service : Virtuel-RT</li>
              <li>Site : <a className="text-purple-300 underline" href={SITE_URL} target="_blank" rel="noreferrer">{SITE_URL}</a></li>
              <li>Contact : <a className="text-purple-300 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
            </ul>
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100/90">
              Identité de l’éditeur / directeur de la publication (raison sociale ou nom, forme juridique, siège, SIRET/RCS le cas échéant) :
              à compléter par l’opérateur du service. Aucun SIRET ni adresse privée n’est inventé ici.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">2. Hébergeur</h2>
            <p>Le site (fichiers front / hébergement web) est hébergé par :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Hostinger International Ltd.</li>
              <li>61 Lordou Vironos Street, Lumiel Building, 4th Floor, 6023 Larnaca, Chypre</li>
              <li>
                Site :{' '}
                <a className="text-purple-300 underline" href="https://www.hostinger.fr" target="_blank" rel="noreferrer">
                  www.hostinger.fr
                </a>
              </li>
            </ul>
            <p className="text-[12px] text-muted-foreground/55">
              Les données applicatives (comptes, messages, présence, préférences) sont également traitées via Supabase
              (infrastructure cloud PostgreSQL / Auth / Realtime / Storage). Les détails complets de l’hébergeur Hostinger
              restent ceux publiés par le prestataire ; la région exacte du projet Supabase peut être précisée par l’opérateur.
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
              Virtuel-RT traite des données nécessaires au fonctionnement du chat communautaire : identifiant / pseudo, avatar,
              messages de salon et messages directs, présence en ligne, préférences d’affichage, badges / XP, et éventuellement
              adresse e-mail et métadonnées d’authentification (compte Supabase Auth). Le mode Premium / coquin peut conditionner
              l’accès à certains salons et contenus 18+.
            </p>
            <p>
              Finalités principales : fourniture du service de chat, authentification (compte ou session invité), modération et
              sécurité, notifications, amélioration du service, et gestion de l’offre Premium. Base légale typique : exécution
              du service / intérêt légitime (sécurité, abus) ; consentement lorsque requis (ex. certains traceurs non essentiels).
            </p>
            <p>
              Le responsable du traitement est l’éditeur identifié à la section 1 (à compléter). Conformément au RGPD et à la
              loi « Informatique et Libertés », vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation,
              d’opposition et de portabilité. Pour les exercer :{' '}
              <a className="text-purple-300 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
            <p>
              Vous pouvez introduire une réclamation auprès de la CNIL (
              <a className="text-purple-300 underline" href="https://www.cnil.fr" target="_blank" rel="noreferrer">
                www.cnil.fr
              </a>
              ).
            </p>
            <p className="text-[12px] text-muted-foreground/55">
              Une politique de confidentialité détaillée pourra être publiée séparément sur ce site ; en l’absence de page dédiée,
              les présentes mentions décrivent les traitements essentiels liés au chat / Auth / Supabase.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">5. Cookies, stockage local et PWA</h2>
            <p>
              Le site utilise du stockage local (localStorage / session) et éventuellement un service worker (PWA) pour le
              fonctionnement du service : session (compte ou invité), préférences d’affichage, favoris / salons déverrouillés,
              cache de messages hors-ligne, et notifications locales. Ces traitements sont strictement nécessaires au service
              ou liés à votre usage du chat.
            </p>
            <p>
              Des outils d’analytics ou de monitoring d’erreurs (ex. Sentry, si configuré) peuvent être activés par l’opérateur ;
              le cas échéant, un consentement sera recueilli lorsque la réglementation l’exige. Aucune bannière cookies tierce
              n’est présentée par défaut hors besoins strictement techniques.
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
            <h2 className="text-base font-semibold text-foreground">7. Accès réservé aux majeurs (18+) et offre Premium</h2>
            <p>
              Virtuel-RT est un service de chat <strong className="text-foreground font-semibold">interdit aux mineurs</strong>.
              Toute personne qui s’inscrit, se connecte ou utilise le service (y compris en mode invité) déclare avoir
              <strong className="text-foreground font-semibold"> 18 ans ou plus</strong>.
            </p>
            <p>
              Aucune vérification d’identité officielle (pièce d’identité, selfie, etc.) n’est exigée à l’entrée : l’accès
              repose sur une confirmation déclarative et sur le respect des règles de la communauté. Un champ d’âge
              optionnel peut être renseigné sur le profil à titre indicatif.
            </p>
            <p>
              L’offre Premium (dont le mode coquin) peut débloquer des salons et contenus adultes. L’accès Premium est accordé
              côté serveur (profil) par l’opérateur / staff ; le client affiche une proposition d’upsell mais ne constitue pas
              à lui seul une preuve d’abonnement.
            </p>
            <p>
              Sont strictement interdits : tout contenu à caractère sexuel impliquant des mineurs (réel ou fictif),
              toute sollicitation ou exploitation de mineurs, et tout partage de matériel illicite. Les utilisateurs
              peuvent signaler un contenu ou un comportement via les outils de signalement. La modération peut supprimer
              du contenu, muter ou bannir un compte, et transmettre aux autorités compétentes lorsque la loi l’exige.
            </p>
            <p>
              L’éditeur ne peut garantir l’âge réel de chaque utilisateur. En cas de doute ou de signalement crédible
              concernant un mineur, des mesures conservatoires (restriction, bannissement) peuvent être prises.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">8. Droit applicable</h2>
            <p>
              Les présentes mentions sont régies par le droit français. En cas de litige, et à défaut de résolution amiable,
              les tribunaux français compétents seront seuls compétents.
            </p>
          </section>

          <p className="text-[11px] text-muted-foreground/40 pt-4 border-t border-white/5">
            Dernière mise à jour : août 2026 · Virtuel-RT · {SITE_URL} · Interdit aux mineurs (18+)
          </p>
        </div>
      </div>
    </div>
  );
}

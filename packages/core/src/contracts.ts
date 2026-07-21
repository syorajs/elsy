/**
 * Contrats gelés — Phase 0.
 *
 * Ce fichier est le contrat central du projet. Toute modification doit
 * faire l'objet d'une nouvelle ADR dans docs/decisions/, justifiée par un
 * besoin concret rencontré dans un adapter ou un runtime réel — jamais de
 * façon spéculative.
 *
 * Voir docs/ARCHITECTURE.md (section "Contrats" et "Invariants") et
 * docs/decisions/001-runtime-context.md pour le raisonnement complet.
 */

/**
 * Métadonnées non structurantes sur la plateforme d'exécution.
 *
 * Invariant : l'Application peut lire ces valeurs (par exemple pour du
 * logging), mais ne doit JAMAIS s'en servir pour brancher sa logique
 * métier (pas de `if (platform.name === 'cloudflare')` dans une Application).
 * Un tel branchement est une violation d'invariant, pas un simple style
 * de code discutable.
 */
export interface PlatformInfo {
  /** Identifiant de la plateforme, ex. "node", "cloudflare", "aws-lambda". */
  readonly name: string;
  /** Version du runtime/adapter, à but de diagnostic uniquement. */
  readonly version?: string;
}

/**
 * Ce que le standard `Request` ne peut pas porter nativement :
 * variables d'environnement normalisées, métadonnées de plateforme,
 * mécanisme de tâche différée (pattern courant sur les runtimes edge).
 *
 * Construit exclusivement par un Adapter. Jamais par l'Application ou
 * le Runtime.
 */
export interface RuntimeContext {
  /**
   * Variables d'environnement normalisées, quel que soit le format natif
   * de la plateforme (process.env, bindings Cloudflare, config Netlify...).
   * La normalisation est la responsabilité de l'Adapter.
   */
  readonly env: Record<string, unknown>;

  /** Métadonnées de plateforme — lecture seule, jamais de branchement dessus. */
  readonly platform: PlatformInfo;

  /**
   * Enregistre une tâche à exécuter après l'envoi de la réponse.
   * Optionnel : seules certaines plateformes (edge / workers) exposent
   * ce concept nativement. Un adapter qui n'a pas d'équivalent natif peut
   * omettre ce champ ou fournir une implémentation synchrone dégradée.
   */
  waitUntil?(promise: Promise<unknown>): void;
}

/**
 * Le contrat unique entre l'application et le monde extérieur.
 *
 * `ctx` est optionnel : un `fetch()` valide au sens du contrat minimal
 * peut toujours être appelé avec un seul argument (utile en test unitaire
 * simple, ou hors de toute plateforme).
 */
export interface Application {
  fetch(request: Request, ctx?: RuntimeContext): Promise<Response>;
}

/**
 * Forme "fonction" du même contrat que `Application`. Les deux formes
 * sont interchangeables — voir docs/GLOSSARY.md.
 */
export type FetchHandler = (
  request: Request,
  ctx?: RuntimeContext
) => Promise<Response>;

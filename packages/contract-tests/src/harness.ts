import type { Application } from "@elsy/core";

/**
 * Instance en cours d'exécution d'une Application, servie par un adapter
 * réel sur une vraie plateforme (ou une émulation fidèle de celle-ci).
 */
export interface RunningInstance {
  /** URL de base à interroger via `fetch()` (ex. "http://127.0.0.1:54321"). */
  baseUrl: string;
  /** Arrête l'instance et libère les ressources (port, process...). */
  stop(): Promise<void> | void;
}

/**
 * Contrat que chaque adapter doit implémenter pour brancher la suite
 * commune de contract tests sur sa propre plateforme.
 *
 * `@elsy/contract-tests` ne dépend que de `@elsy/core` : ce fichier est le
 * seul point de contact entre la suite générique et un adapter concret.
 */
export interface ContractTestHarness {
  /** Nom de la plateforme, affiché dans les titres de test. */
  name: string;
  /** Démarre une Application donnée sur la plateforme réelle de l'adapter. */
  start(app: Application): Promise<RunningInstance>;
}

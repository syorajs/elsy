/**
 * Contrat générique d'un Preset — Phase 5.
 *
 * Voir docs/decisions/004-generic-preset-and-builder.md pour le
 * raisonnement complet, et docs/ARCHITECTURE.md / docs/INVARIANTS.md pour
 * les invariants qui s'appliquent ici.
 *
 * Un `Preset` décrit *quoi* générer (INV-030) : une liste de fichiers avec
 * leur contenu final. Il ne décrit jamais *comment* les écrire sur disque
 * (c'est le rôle du Builder, `@elsy/builder`) ni aucune logique métier
 * applicative (INV-031). Un Preset concret (ex. `@elsy/preset-node`) doit
 * pouvoir être entièrement inspecté — logué, diffé, sérialisé — sans
 * exécuter quoi que ce soit.
 */

/** Un fichier à produire, décrit sous forme purement déclarative. */
export interface PresetFile {
  /**
   * Chemin relatif du fichier, depuis le dossier de sortie choisi par
   * l'appelant du Builder. Peut contenir des sous-dossiers
   * (ex. "netlify/functions/server.mjs") : c'est au Preset de connaître
   * l'arborescence attendue par sa plateforme, pas au Builder.
   */
  readonly path: string;
  /** Contenu textuel intégral du fichier. */
  readonly contents: string;
}

/**
 * Description déclarative d'une plateforme cible.
 *
 * Respecte :
 * - INV-030 : uniquement des données, aucune fonction d'exécution.
 * - INV-031 : aucune logique métier applicative.
 */
export interface Preset {
  /** Identifiant de la plateforme décrite, ex. "node", "netlify". */
  readonly name: string;
  /** Fichiers à produire pour cette plateforme. */
  readonly files: readonly PresetFile[];
}

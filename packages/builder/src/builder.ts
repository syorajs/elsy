import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize, relative } from "node:path";
import type { Preset } from "@elsy/preset";

/**
 * Builder générique — Phase 5.
 *
 * Exécute un `Preset` donné (INV-040 : orchestre uniquement, ne connaît
 * aucune plateforme en dur — toute spécificité vient du `Preset` passé en
 * argument, jamais d'un `if (preset.name === 'node')` ici). Ce fichier ne
 * doit jamais importer un package `@elsy/preset-*` concret : il n'opère
 * que sur la forme générique `Preset`/`PresetFile` de `@elsy/preset`.
 *
 * Voir docs/decisions/004-generic-preset-and-builder.md.
 */

export interface BuildOptions {
  /** Le Preset à exécuter. */
  preset: Preset;
  /** Dossier de sortie dans lequel écrire les fichiers du Preset. */
  outDir: string;
}

export interface BuildResult {
  /** Dossier de sortie effectivement utilisé. */
  outDir: string;
  /** Chemins absolus de tous les fichiers écrits, dans l'ordre du Preset. */
  files: readonly string[];
}

/**
 * Écrit sur disque tous les fichiers décrits par `options.preset`, sous
 * `options.outDir`. Aucune logique spécifique à une plateforme : ce que
 * contient chaque fichier et où il va est entièrement déterminé par le
 * `Preset` fourni.
 */
export async function build(options: BuildOptions): Promise<BuildResult> {
  const { preset, outDir } = options;
  const writtenFiles: string[] = [];

  for (const file of preset.files) {
    const targetPath = resolveWithinOutDir(outDir, file.path);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, file.contents, "utf8");
    writtenFiles.push(targetPath);
  }

  return { outDir, files: writtenFiles };
}

/**
 * Résout `filePath` (relatif, fourni par un Preset) à l'intérieur de
 * `outDir`, et refuse toute tentative d'en sortir (ex. "../../etc/passwd").
 * Un Preset est une donnée déclarative : rien ne garantit qu'elle provient
 * toujours d'une source de confiance, donc le Builder ne fait pas
 * confiance aveuglément à `file.path`.
 */
function resolveWithinOutDir(outDir: string, filePath: string): string {
  if (isAbsolute(filePath)) {
    throw new Error(
      `[elsy][builder] chemin de fichier de Preset invalide (absolu non autorisé) : "${filePath}"`
    );
  }

  const resolvedOutDir = normalize(outDir);
  const target = normalize(join(resolvedOutDir, filePath));
  const relativeToOutDir = relative(resolvedOutDir, target);

  if (relativeToOutDir.startsWith("..") || isAbsolute(relativeToOutDir)) {
    throw new Error(
      `[elsy][builder] chemin de fichier de Preset invalide (hors de outDir) : "${filePath}"`
    );
  }

  return target;
}

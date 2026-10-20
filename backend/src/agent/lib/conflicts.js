/**
 * Conflict de-duplication.
 *
 * The same underlying contradiction gets reported many times across a run:
 * once per reflection pass, and again during synthesis — each time reworded.
 * A live report showed both of these, for one real disagreement about
 * head-heavy racquets:
 *
 *   "Suitability of head-heavy racquets for beginners."
 *   "Head-heavy racquets are not recommended for beginners."
 *
 * Text matching cannot see that these are the same finding, so the report
 * printed the contradiction twice and looked sloppy.
 *
 * The stable signal is the evidence involved: reworded duplicates cite the
 * same sources, while genuinely distinct conflicts cite different ones. We key
 * on the sorted evidence-id set and fall back to claim text only when a
 * conflict carries no usable evidence ids — so unrelated conflicts are never
 * collapsed into one.
 */

/** Build the de-duplication key for a single conflict. */
const conflictKey = (conflict) => {
  const evidenceIds = (conflict?.evidenceIds || []).map(String).filter(Boolean).sort();
  if (evidenceIds.length > 0) return `ev:${evidenceIds.join(',')}`;
  return `claim:${String(conflict?.claim || '').toLowerCase().slice(0, 40)}`;
};

/**
 * Drop duplicate conflicts, keeping the first sighting of each.
 *
 * @param {Array<{claim: string, description?: string, evidenceIds?: Array<string>}>} conflicts
 * @returns {Array} Conflicts with duplicates removed, order preserved.
 */
const dedupeConflicts = (conflicts) => {
  const seen = new Set();
  return (Array.isArray(conflicts) ? conflicts : []).filter((conflict) => {
    if (!conflict) return false;
    const key = conflictKey(conflict);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

module.exports = { dedupeConflicts, conflictKey };

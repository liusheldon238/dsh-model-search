export function mapGroupedModelRows(root, groups) {
  if (!root || !Array.isArray(groups)) return null;
  const sections = [...root.querySelectorAll('section[role="group"]')]
    .map((section) => ({ section, rows: [...section.querySelectorAll('button[role="menuitemradio"]')] }))
    .filter(({ rows }) => rows.length > 0);

  if (sections.length !== groups.length) return null;
  const entries = [];
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const mapped = sections[groupIndex];
    const models = Array.isArray(group?.models) ? group.models : [];
    if (mapped.rows.length !== models.length) return null;
    for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
      entries.push({
        group,
        model: models[modelIndex],
        row: mapped.rows[modelIndex],
        section: mapped.section
      });
    }
  }
  return { entries, sections: sections.map(({ section }) => section) };
}

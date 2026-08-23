function normalized(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function sectionLabel(section) {
  const labelledBy = section.getAttribute("aria-labelledby");
  const labelled = labelledBy && section.ownerDocument.getElementById(labelledBy);
  const heading = section.querySelector("h1,h2,h3,h4,h5,h6");
  const first = section.firstElementChild;
  const selectable = 'button[role="menuitemradio"],[role="option"]';
  const safeFirst = first && !first.matches(selectable) && !first.querySelector(selectable) ? first : null;
  return (labelled?.textContent ?? heading?.textContent ?? safeFirst?.textContent ?? "").trim();
}

function rowLabel(row) {
  return (row.getAttribute("title") ?? row.getAttribute("aria-label") ?? row.textContent ?? "").trim();
}

function groupMatchesLabel(group, label) {
  const value = normalized(label);
  return value !== "" && [group?.id, group?.name].some((candidate) => normalized(candidate) === value);
}

function semanticMapping(sections, groups) {
  const entries = [];
  for (const mapped of sections) {
    const label = sectionLabel(mapped.section);
    const matches = groups.filter((group) => groupMatchesLabel(group, label));
    const group = matches.length === 1 ? matches[0] : { id: label, name: label, models: [] };
    for (const row of mapped.rows) {
      const visible = normalized(rowLabel(row));
      const models = matches.length === 1
        ? (group.models ?? []).filter((model) => [model?.name, model?.id].some((value) => normalized(value) === visible))
        : [];
      entries.push({ group, model: models[0], models, row, section: mapped.section });
    }
  }
  return { entries, sections: sections.map(({ section }) => section), mode: "semantic" };
}

export function mapGroupedModelRows(root, groups, { semanticFallback = false } = {}) {
  if (!root || !Array.isArray(groups)) return null;
  const sections = [...root.querySelectorAll('section[role="group"]')]
    .map((section) => ({ section, rows: [...section.querySelectorAll('button[role="menuitemradio"]')] }))
    .filter(({ rows }) => rows.length > 0);

  if (sections.length === 0) return null;

  const structurallyCompatible = sections.length === groups.length && sections.every((mapped, index) => {
    const label = sectionLabel(mapped.section);
    const models = groups[index]?.models ?? [];
    return (!label || groupMatchesLabel(groups[index], label))
      && mapped.rows.length === models.length
      && mapped.rows.every((row, modelIndex) => {
        const visible = normalized(rowLabel(row));
        const model = models[modelIndex];
        return [model?.name, model?.id].some((value) => normalized(value) === visible);
      });
  });
  if (!structurallyCompatible) return semanticFallback ? semanticMapping(sections, groups) : null;
  const entries = [];
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const mapped = sections[groupIndex];
    const models = Array.isArray(group?.models) ? group.models : [];
    if (mapped.rows.length !== models.length) return semanticFallback ? semanticMapping(sections, groups) : null;
    for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
      entries.push({
        group,
        model: models[modelIndex],
        models: [models[modelIndex]],
        row: mapped.rows[modelIndex],
        section: mapped.section
      });
    }
  }
  return { entries, sections: sections.map(({ section }) => section), mode: "structural" };
}

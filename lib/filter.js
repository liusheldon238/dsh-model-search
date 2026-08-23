export function normalizeQuery(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

export function modelMatches(group, model, query) {
  const needle = normalizeQuery(query);
  if (!needle) return true;
  return [group?.id, group?.name, model?.id, model?.name, model?.description]
    .some((value) => normalizeQuery(value).includes(needle));
}

export function filterGroups(groups, query) {
  if (!Array.isArray(groups)) return [];
  return groups.flatMap((group) => {
    const models = Array.isArray(group?.models)
      ? group.models.filter((model) => modelMatches(group, model, query))
      : [];
    return models.length ? [{ ...group, models }] : [];
  });
}

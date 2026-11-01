/** Weak-verb present conjugations with common orthographic adjustments. */
export function conjugateWeak(infinitive) {
  const stem = infinitive.endsWith('en')
    ? infinitive.slice(0, -2)
    : infinitive.endsWith('n')
      ? infinitive.slice(0, -1)
      : infinitive;

  const sibilant = /[sßxz]$/.test(stem);
  // arbeiten → arbeitest; öffnen → öffnest; rechnen → rechnest; atmen → atmest
  const dOrT = /[dt]$/.test(stem) && !/(ern|eln)$/.test(infinitive);
  const consonantNasal = /([bcdfgkpqstvwxz]|ch)[mn]$/.test(stem) && !/(mm|nn)$/.test(stem);
  const needsE = dOrT || consonantNasal;

  // -eln: ich sammle, du sammelst
  if (infinitive.endsWith('eln')) {
    return {
      ich: stem.slice(0, -2) + 'le',
      du: stem + 'st',
      er: stem + 't',
      wir: infinitive,
      ihr: stem + 't',
      sie: infinitive,
    };
  }
  // -ern: ich wandere, du wanderst
  if (infinitive.endsWith('ern')) {
    return {
      ich: stem + 'e',
      du: stem + 'st',
      er: stem + 't',
      wir: infinitive,
      ihr: stem + 't',
      sie: infinitive,
    };
  }

  return {
    ich: stem + 'e',
    du: sibilant ? stem + 't' : needsE ? stem + 'est' : stem + 'st',
    er: needsE ? stem + 'et' : stem + 't',
    wir: infinitive,
    ihr: needsE ? stem + 'et' : stem + 't',
    sie: infinitive,
  };
}

/** Build conjugation set where only du/er (stem-changing verbs) differ from the regular pattern. */
export function conjugateStemChange(infinitive, du, er) {
  const base = conjugateWeak(infinitive);
  return { ...base, du, er };
}

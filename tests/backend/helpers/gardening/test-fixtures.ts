import type {
  CultivarCharacteristics,
  GardeningAction,
  SpeciesCharacteristics,
} from "@backend/core/domain/gardening/value-objects";

export function fixtureNoteAction(overrides?: Partial<GardeningAction>): GardeningAction {
  return {
    type: "note",
    content: "fixture note",
    ...overrides,
  } as GardeningAction;
}

export function fixtureSpeciesCharacteristics(
  overrides?: Partial<SpeciesCharacteristics>,
): SpeciesCharacteristics {
  return {
    name: "Test species",
    description: null,
    ...overrides,
  };
}

export function fixtureCultivarCharacteristics(
  overrides?: Partial<CultivarCharacteristics>,
): CultivarCharacteristics {
  return {
    name: "Test cultivar",
    description: null,
    ...overrides,
  };
}

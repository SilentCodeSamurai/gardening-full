import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import { locationId } from "@backend/infrastructure/integrations/shared/database-ids";

import { fixtureNoteAction } from "../../../../../helpers/gardening/test-fixtures";
import { resolveGardeningRepositoryPorts } from "./resolve-gardening-repository-ports";

export function registerLocationRepositoryContract(
  adapterLabel: string,
  createContainer: () => DependencyContainer,
): void {
  describe(`LocationRepository (${adapterLabel})`, () => {
    let locationRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["location"];
    let gardeningEventRepository: ReturnType<
      typeof resolveGardeningRepositoryPorts
    >["gardeningEvent"];

    beforeEach(() => {
      const ports = resolveGardeningRepositoryPorts(createContainer());
      locationRepository = ports.location;
      gardeningEventRepository = ports.gardeningEvent;
    });

    it("delete clears gardening event↔location links and removes the location", async () => {
      const loc = await locationRepository.create({ name: "Bench" });
      const ev = await gardeningEventRepository.create({
        action: fixtureNoteAction(),
      });
      await gardeningEventRepository.bindToLocation({ id: ev.id, locationId: loc.id });
      const before = await gardeningEventRepository.getBindingsForEvent({ id: ev.id });
      expect(before.locationIds.map((id) => id as string)).toContain(loc.id as string);

      await locationRepository.delete({ id: loc.id });

      await expect(locationRepository.getById({ id: loc.id })).rejects.toBeInstanceOf(
        RepositoryNotFoundError,
      );
      const after = await gardeningEventRepository.getBindingsForEvent({ id: ev.id });
      expect(after.locationIds).toHaveLength(0);
      const stillThere = await gardeningEventRepository.getById({ id: ev.id });
      expect(stillThere.id).toEqual(ev.id);
    });

    it("deleteMany removes existing locations in request order and skips missing ids", async () => {
      const x = await locationRepository.create({ name: "X" });
      const y = await locationRepository.create({ name: "Y" });
      const ghost = locationId("00000000-0000-4000-8000-00000000aaaa");
      const { deletedIds } = await locationRepository.deleteMany({
        ids: [y.id, ghost, x.id],
      });
      expect(deletedIds).toEqual([y.id, x.id]);
      await expect(locationRepository.getById({ id: x.id })).rejects.toBeInstanceOf(
        RepositoryNotFoundError,
      );
      await expect(locationRepository.getById({ id: y.id })).rejects.toBeInstanceOf(
        RepositoryNotFoundError,
      );
    });

    it("deleteMany clears event links for each removed location", async () => {
      const l1 = await locationRepository.create({ name: "A" });
      const l2 = await locationRepository.create({ name: "B" });
      const ev = await gardeningEventRepository.create({
        action: fixtureNoteAction(),
      });
      await gardeningEventRepository.bindToLocation({ id: ev.id, locationId: l1.id });
      await gardeningEventRepository.bindToLocation({ id: ev.id, locationId: l2.id });
      await locationRepository.deleteMany({ ids: [l1.id, l2.id] });
      const bindings = await gardeningEventRepository.getBindingsForEvent({ id: ev.id });
      expect(bindings.locationIds).toHaveLength(0);
    });
  });
}

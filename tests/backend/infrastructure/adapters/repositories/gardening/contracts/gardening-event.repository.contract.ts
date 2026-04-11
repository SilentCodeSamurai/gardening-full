import {
	gardeningEventId,
	locationId,
	plantId,
} from "@backend/infrastructure/integrations/shared/database-ids";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import {
	fixtureCultivarCharacteristics,
	fixtureNoteAction,
	fixtureSpeciesCharacteristics,
} from "../../../../../helpers/gardening/test-fixtures";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import { resolveGardeningRepositoryPorts } from "./resolve-gardening-repository-ports";

export function registerGardeningEventRepositoryContract(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	describe(`GardeningEventRepository (${adapterLabel})`, () => {
		const workspaceKey = WorkspaceVO.user("test-user").toKey();
		let speciesCategoryRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["speciesCategory"];
		let speciesRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["species"];
		let cultivarRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["cultivar"];
		let plantRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["plant"];
		let locationRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["location"];
		let gardeningEventRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["gardeningEvent"];

		beforeEach(() => {
			const ports = resolveGardeningRepositoryPorts(createContainer());
			speciesCategoryRepository = ports.speciesCategory;
			speciesRepository = ports.species;
			cultivarRepository = ports.cultivar;
			plantRepository = ports.plant;
			locationRepository = ports.location;
			gardeningEventRepository = ports.gardeningEvent;
		});

		async function plantFixture() {
			const cat = await speciesCategoryRepository.createScoped({
				dto: { title: "C", workspaceKey },
			});
			const species = await speciesRepository.createScoped({
				dto: {
					workspaceKey,
					categoryId: cat.id,
					characteristics: fixtureSpeciesCharacteristics(),
				},
			});
			const cultivar = await cultivarRepository.createScoped({
				dto: {
					workspaceKey,
					speciesId: species.id,
					characteristics: fixtureCultivarCharacteristics(),
				},
			});
			const plant = await plantRepository.createScoped({
				dto: {
					workspaceKey,
					title: "p",
					description: null,
					cultivarId: cultivar.id,
				},
			});
			return { cultivar, plant, species };
		}

		it("bindToPlant and getForPlant", async () => {
			const { plant } = await plantFixture();
			const action = fixtureNoteAction();
			const ev = await gardeningEventRepository.createScoped({
				dto: { workspaceKey, action },
			});
			await gardeningEventRepository.bindToPlantScoped({
				workspaceKey,
				dto: { id: ev.id, plantId: plant.id },
			});
			const { items } = await gardeningEventRepository.getForPlantScoped({
				workspaceKeys: [workspaceKey],
				dto: { plantId: plant.id },
			});
			expect(items).toHaveLength(1);
			const [first] = items;
			expect(first).toBeDefined();
			expect(first.id).toEqual(ev.id);
		});

		it("bindToLocation and getForLocation", async () => {
			const loc = await locationRepository.createScoped({ dto: { name: "GH", workspaceKey } });
			const action = fixtureNoteAction();
			const ev = await gardeningEventRepository.createScoped({
				dto: { workspaceKey, action },
			});
			await gardeningEventRepository.bindToLocationScoped({
				workspaceKey,
				dto: { id: ev.id, locationId: loc.id },
			});
			const { items } = await gardeningEventRepository.getForLocationScoped({
				workspaceKeys: [workspaceKey],
				dto: { locationId: loc.id },
			});
			expect(items).toHaveLength(1);
		});

		it("getBindingsForEvent returns linked plants and locations", async () => {
			const { plant } = await plantFixture();
			const loc = await locationRepository.createScoped({ dto: { name: "Bed", workspaceKey } });
			const ev = await gardeningEventRepository.createScoped({
				dto: { workspaceKey, action: fixtureNoteAction() },
			});
			await gardeningEventRepository.bindToPlantScoped({
				workspaceKey,
				dto: { id: ev.id, plantId: plant.id },
			});
			await gardeningEventRepository.bindToLocationScoped({
				workspaceKey,
				dto: { id: ev.id, locationId: loc.id },
			});
			const b = await gardeningEventRepository.getBindingsForEventScoped({
				workspaceKey,
				dto: { id: ev.id },
			});
			expect(b.plantIds.map(String)).toContain(String(plant.id));
			expect(b.locationIds.map(String)).toContain(String(loc.id));
		});

		it("getBindingsForEventScoped throws when event missing in workspace", async () => {
			await expect(
				gardeningEventRepository.getBindingsForEventScoped({
					workspaceKey,
					dto: { id: gardeningEventId("00000000-0000-4000-8000-000000000001") },
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("getByIdScoped hides event from wrong workspace", async () => {
			const otherWk = WorkspaceVO.user("other").toKey();
			const ev = await gardeningEventRepository.createScoped({
				dto: { workspaceKey, action: fixtureNoteAction() },
			});
			await expect(
				gardeningEventRepository.getByIdScoped({ workspaceKey: otherWk, dto: { id: ev.id } }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("bindToPlant throws for missing event or plant", async () => {
			const { plant } = await plantFixture();
			await expect(
				gardeningEventRepository.bindToPlantScoped({
					workspaceKey,
					dto: {
						id: gardeningEventId("00000000-0000-4000-8000-000000000001"),
						plantId: plant.id,
					},
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
			const ev = await gardeningEventRepository.createScoped({
				dto: { workspaceKey, action: fixtureNoteAction() },
			});
			await expect(
				gardeningEventRepository.bindToPlantScoped({
					workspaceKey,
					dto: {
						id: ev.id,
						plantId: plantId("00000000-0000-4000-8000-000000000002"),
					},
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("delete clears junction links", async () => {
			const { plant } = await plantFixture();
			const loc = await locationRepository.createScoped({ dto: { name: "B", workspaceKey } });
			const ev = await gardeningEventRepository.createScoped({
				dto: { workspaceKey, action: fixtureNoteAction() },
			});
			await gardeningEventRepository.bindToPlantScoped({
				workspaceKey,
				dto: { id: ev.id, plantId: plant.id },
			});
			await gardeningEventRepository.bindToLocationScoped({
				workspaceKey,
				dto: { id: ev.id, locationId: loc.id },
			});
			await gardeningEventRepository.deleteByIdScoped({ workspaceKey, dto: { id: ev.id } });
			const forPlant = await gardeningEventRepository.getForPlantScoped({
				workspaceKeys: [workspaceKey],
				dto: { plantId: plant.id },
			});
			const forLoc = await gardeningEventRepository.getForLocationScoped({
				workspaceKeys: [workspaceKey],
				dto: { locationId: loc.id },
			});
			expect(forPlant.items).toHaveLength(0);
			expect(forLoc.items).toHaveLength(0);
		});

		it("bindToLocation throws when location missing", async () => {
			const ev = await gardeningEventRepository.createScoped({
				dto: { workspaceKey, action: fixtureNoteAction() },
			});
			await expect(
				gardeningEventRepository.bindToLocationScoped({
					workspaceKey,
					dto: {
						id: ev.id,
						locationId: locationId("00000000-0000-4000-8000-000000000099"),
					},
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});
	});
}

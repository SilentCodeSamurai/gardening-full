import { RepositoryNotFoundError } from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
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
		const wk = WorkspaceVO.user("location-contract").toKey();
		let locationRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["location"];
		let gardeningEventRepository: ReturnType<typeof resolveGardeningRepositoryPorts>["gardeningEvent"];

		beforeEach(() => {
			const ports = resolveGardeningRepositoryPorts(createContainer());
			locationRepository = ports.location;
			gardeningEventRepository = ports.gardeningEvent;
		});

		it("delete clears gardening event↔location links and removes the location", async () => {
			const loc = await locationRepository.createScoped({ dto: { name: "Bench", workspaceKey: wk } });
			const ev = await gardeningEventRepository.createScoped({
				dto: { workspaceKey: wk, action: fixtureNoteAction() },
			});
			await gardeningEventRepository.bindToLocationScoped({
				workspaceKey: wk,
				dto: { id: ev.id, locationId: loc.id },
			});
			const before = await gardeningEventRepository.getBindingsForEventScoped({
				workspaceKey: wk,
				dto: { id: ev.id },
			});
			expect(before.locationIds.map((id) => id as string)).toContain(loc.id as string);

			await locationRepository.deleteByIdScoped({ workspaceKey: wk, dto: { id: loc.id } });

			await expect(
				locationRepository.getByIdScoped({ workspaceKey: wk, dto: { id: loc.id } }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
			const after = await gardeningEventRepository.getBindingsForEventScoped({
				workspaceKey: wk,
				dto: { id: ev.id },
			});
			expect(after.locationIds).toHaveLength(0);
			const stillThere = await gardeningEventRepository.getByIdScoped({
				workspaceKey: wk,
				dto: { id: ev.id },
			});
			expect(stillThere.id).toEqual(ev.id);
		});

		it("getByIdScoped wrong workspace is not found", async () => {
			const wkB = WorkspaceVO.user("other").toKey();
			const loc = await locationRepository.createScoped({ dto: { name: "X", workspaceKey: wk } });
			await expect(locationRepository.getByIdScoped({ workspaceKey: wkB, dto: { id: loc.id } })).rejects.toBeInstanceOf(
				RepositoryNotFoundError,
			);
		});

		it("deleteMany removes existing locations in request order and skips missing ids", async () => {
			const x = await locationRepository.createScoped({ dto: { name: "X", workspaceKey: wk } });
			const y = await locationRepository.createScoped({ dto: { name: "Y", workspaceKey: wk } });
			const ghost = locationId("00000000-0000-4000-8000-00000000aaaa");
			const { deletedIds } = await locationRepository.deleteManyScoped({
				workspaceKeys: [wk],
				dto: { ids: [y.id, ghost, x.id] },
			});
			expect(deletedIds).toEqual([y.id, x.id]);
			await expect(
				locationRepository.getByIdScoped({ workspaceKey: wk, dto: { id: x.id } }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
			await expect(
				locationRepository.getByIdScoped({ workspaceKey: wk, dto: { id: y.id } }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteMany clears event links for each removed location", async () => {
			const l1 = await locationRepository.createScoped({ dto: { name: "A", workspaceKey: wk } });
			const l2 = await locationRepository.createScoped({ dto: { name: "B", workspaceKey: wk } });
			const ev = await gardeningEventRepository.createScoped({
				dto: { workspaceKey: wk, action: fixtureNoteAction() },
			});
			await gardeningEventRepository.bindToLocationScoped({
				workspaceKey: wk,
				dto: { id: ev.id, locationId: l1.id },
			});
			await gardeningEventRepository.bindToLocationScoped({
				workspaceKey: wk,
				dto: { id: ev.id, locationId: l2.id },
			});
			await locationRepository.deleteManyScoped({
				workspaceKeys: [wk],
				dto: { ids: [l1.id, l2.id] },
			});
			const bindings = await gardeningEventRepository.getBindingsForEventScoped({
				workspaceKey: wk,
				dto: { id: ev.id },
			});
			expect(bindings.locationIds).toHaveLength(0);
		});
	});
}

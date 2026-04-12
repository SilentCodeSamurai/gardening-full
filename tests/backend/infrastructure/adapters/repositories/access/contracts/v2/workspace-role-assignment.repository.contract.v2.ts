import {
	RepositoryConflictError,
	RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";
import { ACCESS_ROLE } from "@backend/core/domain/access/enums";
import { SubjectVO } from "@backend/core/domain/access/subject.vo";
import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import { workspaceRoleAssignmentId } from "@backend/infrastructure/integrations/shared/database-ids";
import type { DependencyContainer } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import { resolveAccessRepositoryPortsV2 } from "./resolve-access-repository-ports.v2";

export function registerWorkspaceRoleAssignmentRepositoryContractV2(
	adapterLabel: string,
	createContainer: () => DependencyContainer,
): void {
	describe(`WorkspaceRoleAssignmentRepositoryPortV2 (${adapterLabel})`, () => {
		let repo: ReturnType<typeof resolveAccessRepositoryPortsV2>["workspaceRoleAssignment"];

		const u1 = SubjectVO.user("contract-u1").toKey();
		const u2 = SubjectVO.user("contract-u2").toKey();
		const u3 = SubjectVO.user("contract-u3").toKey();
		const orgSubject = SubjectVO.organization("contract-org").toKey();
		const wsA = WorkspaceVO.org("contract-ws-a").toKey();
		const wsB = WorkspaceVO.org("contract-ws-b").toKey();
		const wsGlobal = WorkspaceVO.globalShared().toKey();

		beforeEach(() => {
			const ports = resolveAccessRepositoryPortsV2(createContainer());
			repo = ports.workspaceRoleAssignment;
		});

		it("createOne with grantSource, full read/update/delete cycle", async () => {
			const row = await repo.createOne({
				subjectKey: u1,
				workspaceKey: wsA,
				role: ACCESS_ROLE.VIEWER,
				grantSource: "seed",
			});
			expect(row.grantSource).toBe("seed");

			const got = await repo.getOne({ filters: [{ id: row.id }] });
			expect(got.role).toBe(ACCESS_ROLE.VIEWER);

			const { items } = await repo.getMany();
			expect(items.some((x) => x.id === row.id)).toBe(true);

			const updated = await repo.updateOne({
				filters: [{ id: row.id }],
				dto: { role: ACCESS_ROLE.EDITOR, grantSource: "promoted" },
			});
			expect(updated.role).toBe(ACCESS_ROLE.EDITOR);
			expect(updated.grantSource).toBe("promoted");

			const deletedId = await repo.deleteOne({ filters: [{ id: row.id }] });
			expect(deletedId).toEqual(row.id);
			await expect(repo.getOne({ filters: [{ id: row.id }] })).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("createOne without grantSource leaves grantSource undefined", async () => {
			const row = await repo.createOne({
				subjectKey: u1,
				workspaceKey: wsA,
				role: ACCESS_ROLE.ADMIN,
			});
			expect(row.grantSource).toBeUndefined();
		});

		it("createOne throws when the same subjectKey and workspaceKey already exists", async () => {
			await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const p = repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.ADMIN });
			await expect(p).rejects.toBeInstanceOf(RepositoryConflictError);
			await expect(p).rejects.toMatchObject({ reason: "duplicate-subject-workspace" });
		});

		it("createMany returns count and inserts distinct pairs", async () => {
			const { count } = await repo.createMany({
				items: [
					{ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER },
					{ subjectKey: u2, workspaceKey: wsA, role: ACCESS_ROLE.EDITOR },
					{ subjectKey: u1, workspaceKey: wsB, role: ACCESS_ROLE.ADMIN },
				],
			});
			expect(count).toBe(3);
			const { items } = await repo.getMany();
			expect(items).toHaveLength(3);
		});

		it("createMany with empty items returns count 0", async () => {
			const { count } = await repo.createMany({ items: [] });
			expect(count).toBe(0);
		});

		it("createMany leaves prior rows when a later item duplicates an earlier pair", async () => {
			await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const p = repo.createMany({
				items: [
					{ subjectKey: u2, workspaceKey: wsA, role: ACCESS_ROLE.EDITOR },
					{ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.ADMIN },
				],
			});
			await expect(p).rejects.toBeInstanceOf(RepositoryConflictError);
			const { items } = await repo.getMany();
			expect(items).toHaveLength(2);
			const roles = new Set(items.map((i) => i.role));
			expect(roles.has(ACCESS_ROLE.VIEWER)).toBe(true);
			expect(roles.has(ACCESS_ROLE.EDITOR)).toBe(true);
		});

		it("createMany aborts on duplicate pairs within the same batch after inserting the first row", async () => {
			const p = repo.createMany({
				items: [
					{ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER },
					{ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.EDITOR },
				],
			});
			await expect(p).rejects.toBeInstanceOf(RepositoryConflictError);
			const { items } = await repo.getMany();
			expect(items).toHaveLength(1);
			expect(items[0]?.role).toBe(ACCESS_ROLE.VIEWER);
		});

		it("getOne uses OR filters — first clause misses, second hits", async () => {
			const row = await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const ghost = workspaceRoleAssignmentId("00000000-0000-4000-8000-00000000dead");
			const got = await repo.getOne({
				filters: [{ id: ghost }, { id: row.id }],
			});
			expect(got.id).toEqual(row.id);
		});

		it("getMany without filters returns every assignment in the store", async () => {
			await repo.createMany({
				items: [
					{ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER },
					{ subjectKey: u2, workspaceKey: wsB, role: ACCESS_ROLE.EDITOR },
				],
			});
			const { items } = await repo.getMany();
			expect(items).toHaveLength(2);
		});

		it("getMany with filters: [] returns empty", async () => {
			await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const { items } = await repo.getMany({ filters: [] });
			expect(items).toHaveLength(0);
		});

		it("getMany OR unions rows matching any clause", async () => {
			await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const b = await repo.createOne({ subjectKey: u2, workspaceKey: wsA, role: ACCESS_ROLE.EDITOR });
			await repo.createOne({ subjectKey: u3, workspaceKey: wsB, role: ACCESS_ROLE.ADMIN });
			const { items } = await repo.getMany({
				filters: [{ subjectKey: u1 }, { subjectKey: u2 }],
			});
			expect(items).toHaveLength(2);
			expect(new Set(items.map((i) => i.id as string)).has(b.id as string)).toBe(true);
		});

		it("getOne throws when no clause matches", async () => {
			await expect(
				repo.getOne({
					filters: [{ id: workspaceRoleAssignmentId("00000000-0000-4000-8000-000000000000") }],
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("updateOne throws when no row matches filters", async () => {
			await expect(
				repo.updateOne({
					filters: [{ id: workspaceRoleAssignmentId("00000000-0000-4000-8000-000000000001") }],
					dto: { role: ACCESS_ROLE.ADMIN },
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("getOne matches composite subjectKey + workspaceKey without id", async () => {
			await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const got = await repo.getOne({
				filters: [{ subjectKey: u1, workspaceKey: wsA }],
			});
			expect(got.role).toBe(ACCESS_ROLE.VIEWER);
		});

		it("updateOne preserves id and createdAt when patching role", async () => {
			const row = await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const createdAt = row.createdAt.getTime();
			const updated = await repo.updateOne({
				filters: [{ id: row.id }],
				dto: { role: ACCESS_ROLE.ADMIN },
			});
			expect(updated.id).toEqual(row.id);
			expect(updated.createdAt.getTime()).toBe(createdAt);
			expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt);
		});

		it("updateOne can change subjectKey when the new pair is unoccupied", async () => {
			const row = await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const updated = await repo.updateOne({
				filters: [{ id: row.id }],
				dto: { subjectKey: u2 },
			});
			expect(updated.subjectKey).toBe(u2);
			const got = await repo.getOne({ filters: [{ id: row.id }] });
			expect(got.subjectKey).toBe(u2);
		});

		it("updateOne can change workspaceKey when the new pair is unoccupied", async () => {
			const row = await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const updated = await repo.updateOne({
				filters: [{ id: row.id }],
				dto: { workspaceKey: wsB },
			});
			expect(updated.workspaceKey).toBe(wsB);
		});

		it("updateOne with empty dto still refreshes updatedAt", async () => {
			const row = await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const before = row.updatedAt.getTime();
			const updated = await repo.updateOne({
				filters: [{ id: row.id }],
				dto: {},
			});
			expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
		});

		it("after updateOne relocates map entry, old subject+workspace pair no longer resolves", async () => {
			await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			await repo.updateOne({
				filters: [{ subjectKey: u1, workspaceKey: wsA }],
				dto: { subjectKey: u2 },
			});
			await expect(
				repo.getOne({ filters: [{ subjectKey: u1, workspaceKey: wsA }] }),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
			const moved = await repo.getOne({ filters: [{ subjectKey: u2, workspaceKey: wsA }] });
			expect(moved.role).toBe(ACCESS_ROLE.VIEWER);
		});

		it("updateOne throws when moving onto a subject+workspace pair owned by another row", async () => {
			await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const second = await repo.createOne({ subjectKey: u2, workspaceKey: wsA, role: ACCESS_ROLE.EDITOR });
			const p = repo.updateOne({
				filters: [{ id: second.id }],
				dto: { subjectKey: u1 },
			});
			await expect(p).rejects.toBeInstanceOf(RepositoryConflictError);
			await expect(p).rejects.toMatchObject({ reason: "duplicate-subject-workspace" });
		});

		it("updateMany applies the same patch to every row matching OR filters", async () => {
			await repo.createMany({
				items: [
					{ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER },
					{ subjectKey: u2, workspaceKey: wsB, role: ACCESS_ROLE.VIEWER },
				],
			});
			const { count } = await repo.updateMany({
				filters: [{ role: ACCESS_ROLE.VIEWER }],
				dto: { role: ACCESS_ROLE.EDITOR },
			});
			expect(count).toBe(2);
			const { items } = await repo.getMany({ filters: [{ role: ACCESS_ROLE.EDITOR }] });
			expect(items).toHaveLength(2);
		});

		it("updateMany returns count 0 when nothing matches", async () => {
			const { count } = await repo.updateMany({
				filters: [{ subjectKey: u3 }],
				dto: { role: ACCESS_ROLE.ADMIN },
			});
			expect(count).toBe(0);
		});

		it("updateMany throws when the shared patch would collide after the first row is moved", async () => {
			await repo.createMany({
				items: [
					{ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER },
					{ subjectKey: u2, workspaceKey: wsA, role: ACCESS_ROLE.EDITOR },
				],
			});
			const p = repo.updateMany({
				filters: [{ workspaceKey: wsA }],
				dto: { subjectKey: u3 },
			});
			await expect(p).rejects.toBeInstanceOf(RepositoryConflictError);
			const { items } = await repo.getMany();
			expect(items).toHaveLength(2);
			expect(items.every((i) => i.subjectKey === u3)).toBe(false);
		});

		it("deleteOne throws when the target is missing", async () => {
			await expect(
				repo.deleteOne({
					filters: [{ id: workspaceRoleAssignmentId("00000000-0000-4000-8000-00000000cafe") }],
				}),
			).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteMany removes all rows matching any clause and reports count", async () => {
			await repo.createMany({
				items: [
					{ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER },
					{ subjectKey: u2, workspaceKey: wsB, role: ACCESS_ROLE.EDITOR },
				],
			});
			const { count } = await repo.deleteMany({
				filters: [{ subjectKey: u1 }, { subjectKey: u2 }],
			});
			expect(count).toBe(2);
			const { items } = await repo.getMany();
			expect(items).toHaveLength(0);
		});

		it("deleteMany returns 0 when filters match nothing", async () => {
			const { count } = await repo.deleteMany({
				filters: [{ subjectKey: u3 }],
			});
			expect(count).toBe(0);
		});

		it("supports organization subject and globalShared workspace keys", async () => {
			const row = await repo.createOne({
				subjectKey: orgSubject,
				workspaceKey: wsGlobal,
				role: ACCESS_ROLE.ADMIN,
				grantSource: "bootstrap",
			});
			const got = await repo.getOne({
				filters: [{ subjectKey: orgSubject, workspaceKey: wsGlobal }],
			});
			expect(got.id).toEqual(row.id);
		});

		it("serviceAccount subject keys round-trip", async () => {
			const sa = SubjectVO.serviceAccount("contract-bot").toKey();
			const row = await repo.createOne({
				subjectKey: sa,
				workspaceKey: wsA,
				role: ACCESS_ROLE.EDITOR,
			});
			const { items } = await repo.getMany({ filters: [{ subjectKey: sa }] });
			expect(items).toHaveLength(1);
			expect(items[0]?.id).toEqual(row.id);
		});

		it("getMany single-field filter by workspaceKey", async () => {
			await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			await repo.createOne({ subjectKey: u2, workspaceKey: wsB, role: ACCESS_ROLE.ADMIN });
			const { items } = await repo.getMany({ filters: [{ workspaceKey: wsA }] });
			expect(items.every((i) => i.workspaceKey === wsA)).toBe(true);
			expect(items.some((i) => i.subjectKey === u1)).toBe(true);
		});

		it("getMany multi-field AND: wrong workspaceKey excludes row", async () => {
			const row = await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const { items } = await repo.getMany({ filters: [{ id: row.id, workspaceKey: wsB }] });
			expect(items).toHaveLength(0);
		});

		it("getMany OR combines id miss with subjectKey hit", async () => {
			const row = await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const { items } = await repo.getMany({
				filters: [{ id: workspaceRoleAssignmentId("00000000-0000-4000-8000-00000000bad") }, { subjectKey: u1 }],
			});
			expect(items).toHaveLength(1);
			expect(items[0]?.id).toEqual(row.id);
		});

		it("updateOne OR filters", async () => {
			const row = await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			const u = await repo.updateOne({
				filters: [{ id: workspaceRoleAssignmentId("00000000-0000-4000-8000-00000000bad") }, { id: row.id }],
				dto: { role: ACCESS_ROLE.ADMIN },
			});
			expect(u.role).toBe(ACCESS_ROLE.ADMIN);
		});

		it("deleteOne OR filters", async () => {
			const row = await repo.createOne({ subjectKey: u2, workspaceKey: wsB, role: ACCESS_ROLE.VIEWER });
			await repo.deleteOne({
				filters: [{ id: workspaceRoleAssignmentId("00000000-0000-4000-8000-00000000bad") }, { id: row.id }],
			});
			await expect(repo.getOne({ filters: [{ id: row.id }] })).rejects.toBeInstanceOf(RepositoryNotFoundError);
		});

		it("deleteMany OR by id and by workspaceKey", async () => {
			const a = await repo.createOne({ subjectKey: u1, workspaceKey: wsA, role: ACCESS_ROLE.VIEWER });
			await repo.createOne({ subjectKey: u2, workspaceKey: wsB, role: ACCESS_ROLE.EDITOR });
			const { count } = await repo.deleteMany({
				filters: [{ id: a.id }, { workspaceKey: wsB, subjectKey: u2 }],
			});
			expect(count).toBe(2);
		});
	});
}

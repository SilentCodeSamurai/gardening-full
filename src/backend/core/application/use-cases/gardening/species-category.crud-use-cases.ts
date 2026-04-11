import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { SpeciesCategoryEntity } from "@backend/core/domain/gardening/entities";
import type {
	SpeciesCategoryRepositoryCreateInputDTO,
	SpeciesCategoryRepositoryDeleteInputDTO,
	SpeciesCategoryRepositoryDeleteOutputDTO,
	SpeciesCategoryRepositoryGetByIdInputDTO,
	SpeciesCategoryRepositoryPort,
	SpeciesCategoryRepositoryUpdateInputDTO,
} from "../../ports/repositories/gardening/species-category.repository.port";
import type { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import type { IUseCase } from "../shared/use-case.interface";
import type { UseCaseRequest } from "../use-case-context";

export type SpeciesCategoryWithSystemCatalog = SpeciesCategoryEntity & { systemCatalog: boolean };

type SpeciesCategoryCreatePayload = Omit<SpeciesCategoryRepositoryCreateInputDTO, "workspaceKey">;
export type SpeciesCategoryCreateUseCaseInput = UseCaseRequest<SpeciesCategoryCreatePayload>;
export type SpeciesCategoryCreateUseCaseOutput = SpeciesCategoryWithSystemCatalog;

export class SpeciesCategoryCreateUseCase
	implements IUseCase<SpeciesCategoryCreateUseCaseInput, SpeciesCategoryCreateUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
	) {}

	public async execute(input: SpeciesCategoryCreateUseCaseInput): Promise<SpeciesCategoryCreateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		const created = await this.speciesCategoryRepository.createScoped({
			dto: {
				...input.dto,
				workspaceKey: input.context.activeWorkspaceScope.toKey(),
			},
		});
		return { ...created, systemCatalog: WorkspaceVO.isGlobalSharedKey(created.workspaceKey) };
	}
}

export type SpeciesCategoryGetByIdUseCaseInput = UseCaseRequest<SpeciesCategoryRepositoryGetByIdInputDTO>;
export type SpeciesCategoryGetByIdUseCaseOutput = SpeciesCategoryWithSystemCatalog;

export class SpeciesCategoryGetByIdUseCase
	implements IUseCase<SpeciesCategoryGetByIdUseCaseInput, SpeciesCategoryGetByIdUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
	) {}

	public async execute(input: SpeciesCategoryGetByIdUseCaseInput): Promise<SpeciesCategoryGetByIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const wk = input.context.activeWorkspaceScope.toKey();
		const row = await this.speciesCategoryRepository.getByIdScoped({ workspaceKey: wk, dto: input.dto });
		return { ...row, systemCatalog: WorkspaceVO.isGlobalSharedKey(row.workspaceKey) };
	}
}

export type SpeciesCategoryGetAllUseCaseInput = UseCaseRequest;
export type SpeciesCategoryGetAllUseCaseOutput = {
	items: SpeciesCategoryWithSystemCatalog[];
};

export class SpeciesCategoryGetAllUseCase
	implements IUseCase<SpeciesCategoryGetAllUseCaseInput, SpeciesCategoryGetAllUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
	) {}
	public async execute(input: SpeciesCategoryGetAllUseCaseInput): Promise<SpeciesCategoryGetAllUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({
			...input.context,
			action: "read",
		});
		const all = await this.speciesCategoryRepository.getAllScoped({
			workspaceKeys: [input.context.activeWorkspaceScope.toKey(), WorkspaceVO.globalShared().toKey()],
		});
		const enriched = all.items.map((item) => ({
			...item,
			systemCatalog: WorkspaceVO.isGlobalSharedKey(item.workspaceKey),
		}));
		return { items: enriched };
	}
}

export type SpeciesCategoryUpdateUseCaseInput = UseCaseRequest<SpeciesCategoryRepositoryUpdateInputDTO>;
export type SpeciesCategoryUpdateUseCaseOutput = SpeciesCategoryWithSystemCatalog;

export class SpeciesCategoryUpdateUseCase
	implements IUseCase<SpeciesCategoryUpdateUseCaseInput, SpeciesCategoryUpdateUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
	) {}
	public async execute(input: SpeciesCategoryUpdateUseCaseInput): Promise<SpeciesCategoryUpdateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const wk = input.context.activeWorkspaceScope.toKey();
		const updated = await this.speciesCategoryRepository.updateByIdScoped({
			workspaceKey: wk,
			dto: input.dto,
		});
		return { ...updated, systemCatalog: WorkspaceVO.isGlobalSharedKey(updated.workspaceKey) };
	}
}

export type SpeciesCategoryDeleteUseCaseInput = UseCaseRequest<SpeciesCategoryRepositoryDeleteInputDTO>;
export type SpeciesCategoryDeleteUseCaseOutput = SpeciesCategoryRepositoryDeleteOutputDTO;

export class SpeciesCategoryDeleteUseCase
	implements IUseCase<SpeciesCategoryDeleteUseCaseInput, SpeciesCategoryDeleteUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
	) {}
	public async execute(input: SpeciesCategoryDeleteUseCaseInput): Promise<SpeciesCategoryDeleteUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const wk = input.context.activeWorkspaceScope.toKey();
		return this.speciesCategoryRepository.deleteByIdScoped({
			workspaceKey: wk,
			dto: input.dto,
		});
	}
}

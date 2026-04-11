import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { SpeciesEntity } from "@backend/core/domain/gardening/entities";
import type {
	SpeciesRepositoryCreateInputDTO,
	SpeciesRepositoryDeleteInputDTO,
	SpeciesRepositoryDeleteOutputDTO,
	SpeciesRepositoryGetByIdInputDTO,
	SpeciesRepositoryPort,
	SpeciesRepositoryUpdateInputDTO,
} from "../../ports/repositories/gardening/species.repository.port";
import type { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import type { IUseCase } from "../shared/use-case.interface";
import type { UseCaseRequest } from "../use-case-context";

export type SpeciesWithSystemCatalog = SpeciesEntity & { systemCatalog: boolean };

type SpeciesCreatePayload = Omit<SpeciesRepositoryCreateInputDTO, "workspaceKey">;
export type SpeciesCreateUseCaseInput = UseCaseRequest<SpeciesCreatePayload>;
export type SpeciesCreateUseCaseOutput = SpeciesWithSystemCatalog;

export class SpeciesCreateUseCase implements IUseCase<SpeciesCreateUseCaseInput, SpeciesCreateUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly speciesRepository: SpeciesRepositoryPort,
	) {}

	public async execute(input: SpeciesCreateUseCaseInput): Promise<SpeciesCreateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		const created = await this.speciesRepository.createScoped({
			dto: {
				...input.dto,
				workspaceKey: input.context.activeWorkspaceScope.toKey(),
			},
		});
		return { ...created, systemCatalog: WorkspaceVO.isGlobalSharedKey(created.workspaceKey) };
	}
}

export type SpeciesGetByIdUseCaseInput = UseCaseRequest<SpeciesRepositoryGetByIdInputDTO>;
export type SpeciesGetByIdUseCaseOutput = SpeciesWithSystemCatalog;

export class SpeciesGetByIdUseCase implements IUseCase<SpeciesGetByIdUseCaseInput, SpeciesGetByIdUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly speciesRepository: SpeciesRepositoryPort,
	) {}

	public async execute(input: SpeciesGetByIdUseCaseInput): Promise<SpeciesGetByIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const wk = input.context.activeWorkspaceScope.toKey();
		const row = await this.speciesRepository.getByIdScoped({ workspaceKey: wk, dto: input.dto });
		return { ...row, systemCatalog: WorkspaceVO.isGlobalSharedKey(row.workspaceKey) };
	}
}

export type SpeciesGetAllUseCaseInput = UseCaseRequest;
export type SpeciesGetAllUseCaseOutput = { items: SpeciesWithSystemCatalog[] };

export class SpeciesGetAllUseCase implements IUseCase<SpeciesGetAllUseCaseInput, SpeciesGetAllUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly speciesRepository: SpeciesRepositoryPort,
	) {}

	public async execute(input: SpeciesGetAllUseCaseInput): Promise<SpeciesGetAllUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({
			...input.context,
			action: "read",
		});
		const all = await this.speciesRepository.getAllScoped({
			workspaceKeys: [input.context.activeWorkspaceScope.toKey(), WorkspaceVO.globalShared().toKey()],
		});
		const enriched = all.items.map((item) => ({
			...item,
			systemCatalog: WorkspaceVO.isGlobalSharedKey(item.workspaceKey),
		}));
		return { items: enriched };
	}
}

export type SpeciesUpdateUseCaseInput = UseCaseRequest<SpeciesRepositoryUpdateInputDTO>;
export type SpeciesUpdateUseCaseOutput = SpeciesWithSystemCatalog;

export class SpeciesUpdateUseCase implements IUseCase<SpeciesUpdateUseCaseInput, SpeciesUpdateUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly speciesRepository: SpeciesRepositoryPort,
	) {}

	public async execute(input: SpeciesUpdateUseCaseInput): Promise<SpeciesUpdateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const wk = input.context.activeWorkspaceScope.toKey();
		const updated = await this.speciesRepository.updateByIdScoped({
			workspaceKey: wk,
			dto: input.dto,
		});
		return { ...updated, systemCatalog: WorkspaceVO.isGlobalSharedKey(updated.workspaceKey) };
	}
}

export type SpeciesDeleteUseCaseInput = UseCaseRequest<SpeciesRepositoryDeleteInputDTO>;
export type SpeciesDeleteUseCaseOutput = SpeciesRepositoryDeleteOutputDTO;

export class SpeciesDeleteUseCase implements IUseCase<SpeciesDeleteUseCaseInput, SpeciesDeleteUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly speciesRepository: SpeciesRepositoryPort,
	) {}

	public async execute(input: SpeciesDeleteUseCaseInput): Promise<SpeciesDeleteUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const wk = input.context.activeWorkspaceScope.toKey();
		return this.speciesRepository.deleteByIdScoped({
			workspaceKey: wk,
			dto: input.dto,
		});
	}
}

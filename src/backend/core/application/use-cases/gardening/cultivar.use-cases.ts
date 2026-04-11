import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type {
	CultivarRepositoryCreateInputDTO,
	CultivarRepositoryCreateOutputDTO,
	CultivarRepositoryDeleteInputDTO,
	CultivarRepositoryDeleteOutputDTO,
	CultivarRepositoryGetAllOutputDTO,
	CultivarRepositoryGetByIdInputDTO,
	CultivarRepositoryGetByIdOutputDTO,
	CultivarRepositoryGetFullByIdInputDTO,
	CultivarRepositoryGetFullByIdOutputDTO,
	CultivarRepositoryPort,
	CultivarRepositoryUpdateInputDTO,
	CultivarRepositoryUpdateOutputDTO,
} from "../../ports/repositories/gardening/cultivar.repositort.port";
import type { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import type { IUseCase } from "../shared/use-case.interface";
import type { UseCaseRequest } from "../use-case-context";

import type { SpeciesWithSystemCatalog } from "./species.crud-use-cases";

export type CultivarGetFullByIdUseCaseOutput = CultivarRepositoryGetFullByIdOutputDTO & {
	species: SpeciesWithSystemCatalog;
};

type CultivarCreatePayload = Omit<CultivarRepositoryCreateInputDTO, "workspaceKey">;
export type CultivarCreateUseCaseInput = UseCaseRequest<CultivarCreatePayload>;
export type CultivarCreateUseCaseOutput = CultivarRepositoryCreateOutputDTO;

export class CultivarCreateUseCase implements IUseCase<CultivarCreateUseCaseInput, CultivarCreateUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly cultivarRepository: CultivarRepositoryPort,
	) {}
	public async execute(input: CultivarCreateUseCaseInput): Promise<CultivarCreateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		const created = await this.cultivarRepository.createScoped({
			dto: {
				...input.dto,
				workspaceKey: input.context.activeWorkspaceScope.toKey(),
			},
		});
		return created;
	}
}

export type CultivarGetByIdUseCaseInput = UseCaseRequest<CultivarRepositoryGetByIdInputDTO>;
export type CultivarGetByIdUseCaseOutput = CultivarRepositoryGetByIdOutputDTO;

export class CultivarGetByIdUseCase implements IUseCase<CultivarGetByIdUseCaseInput, CultivarGetByIdUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly cultivarRepository: CultivarRepositoryPort,
	) {}
	public async execute(input: CultivarGetByIdUseCaseInput): Promise<CultivarGetByIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const wk = input.context.activeWorkspaceScope.toKey();
		return this.cultivarRepository.getByIdScoped({ workspaceKey: wk, dto: input.dto });
	}
}

export type CultivarGetFullByIdUseCaseInput = UseCaseRequest<CultivarRepositoryGetFullByIdInputDTO>;

export class CultivarGetFullByIdUseCase
	implements IUseCase<CultivarGetFullByIdUseCaseInput, CultivarGetFullByIdUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly cultivarRepository: CultivarRepositoryPort,
	) {}
	public async execute(input: CultivarGetFullByIdUseCaseInput): Promise<CultivarGetFullByIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const wk = input.context.activeWorkspaceScope.toKey();
		const item = await this.cultivarRepository.getFullByIdScoped({ workspaceKey: wk, dto: input.dto });
		return {
			...item,
			species: {
				...item.species,
				systemCatalog: WorkspaceVO.isGlobalSharedKey(item.species.workspaceKey),
			},
		};
	}
}

export type CultivarGetAllUseCaseInput = UseCaseRequest;
export type CultivarGetAllUseCaseOutput = CultivarRepositoryGetAllOutputDTO;

export class CultivarGetAllUseCase implements IUseCase<CultivarGetAllUseCaseInput, CultivarGetAllUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly cultivarRepository: CultivarRepositoryPort,
	) {}
	public async execute(input: CultivarGetAllUseCaseInput): Promise<CultivarGetAllUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({
			...input.context,
			action: "read",
		});
		const all = await this.cultivarRepository.getAllScoped({
			workspaceKeys: [input.context.activeWorkspaceScope.toKey(), WorkspaceVO.globalShared().toKey()],
		});
		return { items: all.items };
	}
}

export type CultivarUpdateUseCaseInput = UseCaseRequest<CultivarRepositoryUpdateInputDTO>;
export type CultivarUpdateUseCaseOutput = CultivarRepositoryUpdateOutputDTO;

export class CultivarUpdateUseCase implements IUseCase<CultivarUpdateUseCaseInput, CultivarUpdateUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly cultivarRepository: CultivarRepositoryPort,
	) {}
	public async execute(input: CultivarUpdateUseCaseInput): Promise<CultivarUpdateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const wk = input.context.activeWorkspaceScope.toKey();
		return this.cultivarRepository.updateByIdScoped({
			workspaceKey: wk,
			dto: input.dto,
		});
	}
}

export type CultivarDeleteUseCaseInput = UseCaseRequest<CultivarRepositoryDeleteInputDTO>;
export type CultivarDeleteUseCaseOutput = CultivarRepositoryDeleteOutputDTO;

export class CultivarDeleteUseCase implements IUseCase<CultivarDeleteUseCaseInput, CultivarDeleteUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly cultivarRepository: CultivarRepositoryPort,
	) {}
	public async execute(input: CultivarDeleteUseCaseInput): Promise<CultivarDeleteUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const wk = input.context.activeWorkspaceScope.toKey();
		return this.cultivarRepository.deleteByIdScoped({
			workspaceKey: wk,
			dto: input.dto,
		});
	}
}

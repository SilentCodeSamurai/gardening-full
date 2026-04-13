import { WorkspaceVO } from "@backend/core/domain/access/workspace.vo";
import type { CultivarEntityId } from "@backend/core/domain/gardening/entities";
import { inject, injectable } from "tsyringe";
import {
	type CultivarRepositoryCreateInputDTO,
	type CultivarRepositoryCreateOutputDTO,
	type CultivarRepositoryDeleteManyOutputDTO,
	type CultivarRepositoryDeleteOutputDTO,
	type CultivarRepositoryGetFullOutputDTO,
	type CultivarRepositoryGetManyOutputDTO,
	type CultivarRepositoryPort,
	CultivarRepositoryPortToken,
	type CultivarRepositoryUpdateOutputDTO,
	type CultivarRepositoryUpdatePatchDTO,
} from "../../ports/repositories/gardening/cultivar.repository.port";
import { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import { BaseUseCase } from "../shared/base.use-case";
import type { ExcludeWorkspace } from "../shared/types";
import type { UseCaseRequest } from "../use-case-context";

import type { SpeciesWithSystemCatalog } from "./species.use-cases";

export type CultivarGetFullByIdUseCaseOutput = Omit<CultivarRepositoryGetFullOutputDTO, "species"> & {
	species: SpeciesWithSystemCatalog | null;
};

type CultivarCreatePayload = ExcludeWorkspace<CultivarRepositoryCreateInputDTO>;
export type CultivarCreateUseCaseInput = UseCaseRequest<CultivarCreatePayload>;
export type CultivarCreateUseCaseOutput = CultivarRepositoryCreateOutputDTO;

@injectable()
export class CultivarCreateUseCase extends BaseUseCase<CultivarCreateUseCaseInput, CultivarCreateUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(CultivarRepositoryPortToken) private readonly cultivarRepository: CultivarRepositoryPort,
	) {
		super();
	}
	protected async execute(input: CultivarCreateUseCaseInput): Promise<CultivarCreateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "create" });
		const scope = input.context.activeWorkspaceScope;
		return this.cultivarRepository.createOne({
			...input.dto,
			workspace: scope,
		});
	}
}

export type CultivarGetByIdUseCaseInput = UseCaseRequest<{ id: CultivarEntityId }>;
export type CultivarGetByIdUseCaseOutput = CultivarRepositoryCreateOutputDTO;

@injectable()
export class CultivarGetByIdUseCase extends BaseUseCase<CultivarGetByIdUseCaseInput, CultivarGetByIdUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(CultivarRepositoryPortToken) private readonly cultivarRepository: CultivarRepositoryPort,
	) {
		super();
	}
	protected async execute(input: CultivarGetByIdUseCaseInput): Promise<CultivarGetByIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const scope = input.context.activeWorkspaceScope;
		return this.cultivarRepository.getOne({ filters: [{ id: input.dto.id, workspace: scope }] });
	}
}

export type CultivarGetFullByIdUseCaseInput = UseCaseRequest<{ id: CultivarEntityId }>;

@injectable()
export class CultivarGetFullByIdUseCase extends BaseUseCase<
	CultivarGetFullByIdUseCaseInput,
	CultivarGetFullByIdUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(CultivarRepositoryPortToken) private readonly cultivarRepository: CultivarRepositoryPort,
	) {
		super();
	}
	protected async execute(input: CultivarGetFullByIdUseCaseInput): Promise<CultivarGetFullByIdUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "read" });
		const scope = input.context.activeWorkspaceScope;
		const item = await this.cultivarRepository.getFullOne({ filters: [{ id: input.dto.id, workspace: scope }] });
		return {
			...item,
			species: item.species
				? { ...item.species, systemCatalog: WorkspaceVO.isGlobalShared(item.species.workspace) }
				: null,
		};
	}
}

export type CultivarGetAllUseCaseInput = UseCaseRequest;
export type CultivarGetAllUseCaseOutput = CultivarRepositoryGetManyOutputDTO;

@injectable()
export class CultivarGetAllUseCase extends BaseUseCase<CultivarGetAllUseCaseInput, CultivarGetAllUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(CultivarRepositoryPortToken) private readonly cultivarRepository: CultivarRepositoryPort,
	) {
		super();
	}
	protected async execute(input: CultivarGetAllUseCaseInput): Promise<CultivarGetAllUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({
			...input.context,
			action: "read",
		});
		const active = input.context.activeWorkspaceScope;
		const global = WorkspaceVO.globalShared();
		return this.cultivarRepository.getMany({
			filters: [{ workspace: active }, { workspace: global }],
		});
	}
}

type CultivarUpdatePayload = ExcludeWorkspace<CultivarRepositoryUpdatePatchDTO>;
export type CultivarUpdateUseCaseInput = UseCaseRequest<{ id: CultivarEntityId } & CultivarUpdatePayload>;
export type CultivarUpdateUseCaseOutput = CultivarRepositoryUpdateOutputDTO;

@injectable()
export class CultivarUpdateUseCase extends BaseUseCase<CultivarUpdateUseCaseInput, CultivarUpdateUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(CultivarRepositoryPortToken) private readonly cultivarRepository: CultivarRepositoryPort,
	) {
		super();
	}
	protected async execute(input: CultivarUpdateUseCaseInput): Promise<CultivarUpdateUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "update" });
		const scope = input.context.activeWorkspaceScope;
		const { id, ...patch } = input.dto;
		return this.cultivarRepository.updateOne({
			filters: [{ id, workspace: scope }],
			dto: patch,
		});
	}
}

export type CultivarDeleteUseCaseInput = UseCaseRequest<{ id: CultivarEntityId }>;
export type CultivarDeleteUseCaseOutput = CultivarRepositoryDeleteOutputDTO;

@injectable()
export class CultivarDeleteUseCase extends BaseUseCase<CultivarDeleteUseCaseInput, CultivarDeleteUseCaseOutput> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(CultivarRepositoryPortToken) private readonly cultivarRepository: CultivarRepositoryPort,
	) {
		super();
	}
	protected async execute(input: CultivarDeleteUseCaseInput): Promise<CultivarDeleteUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const scope = input.context.activeWorkspaceScope;
		return this.cultivarRepository.deleteOne({
			filters: [{ id: input.dto.id, workspace: scope }],
		});
	}
}

export type CultivarDeleteManyUseCaseInput = UseCaseRequest<{ ids: CultivarEntityId[] }>;
export type CultivarDeleteManyUseCaseOutput = CultivarRepositoryDeleteManyOutputDTO;

@injectable()
export class CultivarDeleteManyUseCase extends BaseUseCase<
	CultivarDeleteManyUseCaseInput,
	CultivarDeleteManyUseCaseOutput
> {
	constructor(
		@inject(AccessControlApplicationService) private readonly access: AccessControlApplicationService,
		@inject(CultivarRepositoryPortToken) private readonly cultivarRepository: CultivarRepositoryPort,
	) {
		super();
	}
	protected async execute(input: CultivarDeleteManyUseCaseInput): Promise<CultivarDeleteManyUseCaseOutput> {
		await this.access.assertCanPerformActionOnWorkspace({ ...input.context, action: "delete" });
		const scope = input.context.activeWorkspaceScope;
		return this.cultivarRepository.deleteMany({
			filters: input.dto.ids.map((id) => ({ id, workspace: scope })),
		});
	}
}

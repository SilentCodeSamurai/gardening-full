import type { SpeciesCategoryEntity } from "@backend/core/domain/gardening/entities";
import type {
	SpeciesCategoryRepositoryCreateInputDTO,
	SpeciesCategoryRepositoryDeleteInputDTO,
	SpeciesCategoryRepositoryDeleteOutputDTO,
	SpeciesCategoryRepositoryGetAllOutputDTO,
	SpeciesCategoryRepositoryGetByIdInputDTO,
	SpeciesCategoryRepositoryPort,
	SpeciesCategoryRepositoryUpdateInputDTO,
} from "../../ports/repositories/gardening/species-category.repository.port";
import {
	APPLICATION_RESOURCE_TYPES,
	gardeningSpeciesCategoryRef,
} from "../../resource-refs";
import { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import type { IUseCase } from "../shared/use-case.interface";
import type { UseCaseRequest } from "../use-case-context";

export type SpeciesCategoryWithSystemCatalog = SpeciesCategoryEntity & { systemCatalog: boolean };

export type SpeciesCategoryCreateUseCaseInput = UseCaseRequest<SpeciesCategoryRepositoryCreateInputDTO>;
export type SpeciesCategoryCreateUseCaseOutput = SpeciesCategoryWithSystemCatalog;

export class SpeciesCategoryCreateUseCase
	implements IUseCase<SpeciesCategoryCreateUseCaseInput, SpeciesCategoryCreateUseCaseOutput>
{
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort,
	) {}

	public async execute(input: SpeciesCategoryCreateUseCaseInput): Promise<SpeciesCategoryCreateUseCaseOutput> {
		await this.access.assertCanCreate(input.context, input.context.workspaceRef);
		const created = await this.speciesCategoryRepository.create(input.dto);
		await this.access.bootstrapResourceAdminForActor(
			input.context,
			gardeningSpeciesCategoryRef(String(created.id)),
		);
		return { ...created, systemCatalog: false };
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
		const row = await this.speciesCategoryRepository.getById(input.dto);
		await this.access.assertCanRead(input.context, gardeningSpeciesCategoryRef(String(input.dto.id)));
		const [systemCatalog] = await this.access.getGlobalSharedResourceFlags([
			gardeningSpeciesCategoryRef(String(row.id)),
		]);
		return { ...row, systemCatalog: systemCatalog ?? false };
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
		const mask = await this.access.getReadableResourceMask({
			actorRef: input.context.actorRef,
			resourceType: APPLICATION_RESOURCE_TYPES.speciesCategory,
		});
		const all: SpeciesCategoryRepositoryGetAllOutputDTO = await this.speciesCategoryRepository.getAll();
		const flags = await this.access.getGlobalSharedResourceFlags(
			all.items.map((i) => gardeningSpeciesCategoryRef(String(i.id))),
		);
		const enriched = all.items.map((item, i) => ({ ...item, systemCatalog: flags[i] ?? false }));
		return { items: AccessControlApplicationService.filterReadableOrGlobalShared(enriched, mask) };
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
		await this.speciesCategoryRepository.getById({ id: input.dto.id });
		await this.access.assertCanUpdate(input.context, gardeningSpeciesCategoryRef(String(input.dto.id)));
		const updated = await this.speciesCategoryRepository.update(input.dto);
		const [systemCatalog] = await this.access.getGlobalSharedResourceFlags([
			gardeningSpeciesCategoryRef(String(updated.id)),
		]);
		return { ...updated, systemCatalog: systemCatalog ?? false };
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
		await this.speciesCategoryRepository.getById({ id: input.dto.id });
		await this.access.assertCanDelete(input.context, gardeningSpeciesCategoryRef(String(input.dto.id)));
		return this.speciesCategoryRepository.delete(input.dto);
	}
}

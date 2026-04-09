import type { SpeciesEntity } from "@backend/core/domain/gardening/entities";
import type {
	SpeciesRepositoryCreateInputDTO,
	SpeciesRepositoryDeleteInputDTO,
	SpeciesRepositoryDeleteOutputDTO,
	SpeciesRepositoryGetAllOutputDTO,
	SpeciesRepositoryGetByIdInputDTO,
	SpeciesRepositoryPort,
	SpeciesRepositoryUpdateInputDTO,
} from "../../ports/repositories/gardening/species.repository.port";
import { APPLICATION_RESOURCE_TYPES, gardeningSpeciesRef } from "../../resource-refs";
import { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import type { IUseCase } from "../shared/use-case.interface";
import type { UseCaseRequest } from "../use-case-context";

export type SpeciesWithSystemCatalog = SpeciesEntity & { systemCatalog: boolean };

export type SpeciesCreateUseCaseInput = UseCaseRequest<SpeciesRepositoryCreateInputDTO>;
export type SpeciesCreateUseCaseOutput = SpeciesWithSystemCatalog;

export class SpeciesCreateUseCase implements IUseCase<SpeciesCreateUseCaseInput, SpeciesCreateUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly speciesRepository: SpeciesRepositoryPort,
	) {}

	public async execute(input: SpeciesCreateUseCaseInput): Promise<SpeciesCreateUseCaseOutput> {
		await this.access.assertCanCreate(input.context, input.context.workspaceRef);
		const created = await this.speciesRepository.create(input.dto);
		await this.access.bootstrapResourceAdminForActor(input.context, gardeningSpeciesRef(String(created.id)));
		return { ...created, systemCatalog: false };
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
		const row = await this.speciesRepository.getById(input.dto);
		await this.access.assertCanRead(input.context, gardeningSpeciesRef(String(input.dto.id)));
		const [systemCatalog] = await this.access.getGlobalSharedResourceFlags([
			gardeningSpeciesRef(String(row.id)),
		]);
		return { ...row, systemCatalog: systemCatalog ?? false };
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
		const mask = await this.access.getReadableResourceMask({
			actorRef: input.context.actorRef,
			resourceType: APPLICATION_RESOURCE_TYPES.species,
		});
		const all: SpeciesRepositoryGetAllOutputDTO = await this.speciesRepository.getAll();
		const flags = await this.access.getGlobalSharedResourceFlags(
			all.items.map((i) => gardeningSpeciesRef(String(i.id))),
		);
		const enriched = all.items.map((item, i) => ({ ...item, systemCatalog: flags[i] ?? false }));
		return { items: AccessControlApplicationService.filterReadableOrGlobalShared(enriched, mask) };
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
		await this.speciesRepository.getById({ id: input.dto.id });
		await this.access.assertCanUpdate(input.context, gardeningSpeciesRef(String(input.dto.id)));
		const updated = await this.speciesRepository.update(input.dto);
		const [systemCatalog] = await this.access.getGlobalSharedResourceFlags([
			gardeningSpeciesRef(String(updated.id)),
		]);
		return { ...updated, systemCatalog: systemCatalog ?? false };
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
		await this.speciesRepository.getById({ id: input.dto.id });
		await this.access.assertCanDelete(input.context, gardeningSpeciesRef(String(input.dto.id)));
		return this.speciesRepository.delete(input.dto);
	}
}

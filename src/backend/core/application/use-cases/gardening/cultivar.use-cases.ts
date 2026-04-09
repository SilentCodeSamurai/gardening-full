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
import type { SpeciesRepositoryPort } from "../../ports/repositories/gardening/species.repository.port";
import {
	APPLICATION_RESOURCE_TYPES,
	gardeningCultivarRef,
	gardeningSpeciesRef,
} from "../../resource-refs";
import type { AccessControlApplicationService } from "../../services/access-control/access-control.application-service";
import type { IUseCase } from "../shared/use-case.interface";
import type { UseCaseRequest } from "../use-case-context";

import type { SpeciesWithSystemCatalog } from "./species.crud-use-cases";

export type CultivarGetFullByIdUseCaseOutput = CultivarRepositoryGetFullByIdOutputDTO & {
	species: SpeciesWithSystemCatalog;
};

export type CultivarCreateUseCaseInput = UseCaseRequest<CultivarRepositoryCreateInputDTO>;
export type CultivarCreateUseCaseOutput = CultivarRepositoryCreateOutputDTO;

export class CultivarCreateUseCase implements IUseCase<CultivarCreateUseCaseInput, CultivarCreateUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly cultivarRepository: CultivarRepositoryPort,
	) {}
	public async execute(input: CultivarCreateUseCaseInput): Promise<CultivarCreateUseCaseOutput> {
		await this.access.assertCanCreate(input.context, input.context.workspaceRef);
		const created = await this.cultivarRepository.create(input.dto);
		await this.access.bootstrapResourceAdminForActor(input.context, gardeningCultivarRef(String(created.id)));
		return created;
	}
}

export type CultivarGetByIdUseCaseInput = UseCaseRequest<CultivarRepositoryGetByIdInputDTO>;
export type CultivarGetByIdUseCaseOutput = CultivarRepositoryGetByIdOutputDTO;

export class CultivarGetByIdUseCase implements IUseCase<CultivarGetByIdUseCaseInput, CultivarGetByIdUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly cultivarRepository: CultivarRepositoryPort,
		private readonly speciesRepository: SpeciesRepositoryPort,
	) {}
	public async execute(input: CultivarGetByIdUseCaseInput): Promise<CultivarGetByIdUseCaseOutput> {
		const row = await this.cultivarRepository.getById(input.dto);
		const species = await this.speciesRepository.getById({ id: row.speciesId });
		const [speciesManaged] = await this.access.getGlobalSharedResourceFlags([
			gardeningSpeciesRef(String(species.id)),
		]);
		if (!speciesManaged) {
			await this.access.assertCanRead(input.context, gardeningCultivarRef(String(row.id)));
		}
		return row;
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
		const row = await this.cultivarRepository.getFullById(input.dto);
		const [systemCatalog] = await this.access.getGlobalSharedResourceFlags([
			gardeningSpeciesRef(String(row.species.id)),
		]);
		if (!systemCatalog) {
			await this.access.assertCanRead(input.context, gardeningCultivarRef(String(row.id)));
		}
		return { ...row, species: { ...row.species, systemCatalog: systemCatalog ?? false } };
	}
}

export type CultivarGetAllUseCaseInput = UseCaseRequest;
export type CultivarGetAllUseCaseOutput = CultivarRepositoryGetAllOutputDTO;

export class CultivarGetAllUseCase implements IUseCase<CultivarGetAllUseCaseInput, CultivarGetAllUseCaseOutput> {
	constructor(
		private readonly access: AccessControlApplicationService,
		private readonly cultivarRepository: CultivarRepositoryPort,
		private readonly speciesRepository: SpeciesRepositoryPort,
	) {}
	public async execute(input: CultivarGetAllUseCaseInput): Promise<CultivarGetAllUseCaseOutput> {
		const mask = await this.access.getReadableResourceMask({
			actorRef: input.context.actorRef,
			resourceType: APPLICATION_RESOURCE_TYPES.cultivar,
		});
		const all = await this.cultivarRepository.getAll();
		if (mask.includesAllOfType) {
			return { items: all.items };
		}
		const speciesItems = (await this.speciesRepository.getAll()).items;
		const speciesFlags = await this.access.getGlobalSharedResourceFlags(
			speciesItems.map((s) => gardeningSpeciesRef(String(s.id))),
		);
		const managedSpeciesIds = new Set(speciesItems.filter((_s, i) => speciesFlags[i]).map((s) => String(s.id)));
		const allow = new Set(mask.exactIds);
		return {
			items: all.items.filter((c) => managedSpeciesIds.has(String(c.speciesId)) || allow.has(String(c.id))),
		};
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
		await this.cultivarRepository.getById({ id: input.dto.id });
		await this.access.assertCanUpdate(input.context, gardeningCultivarRef(String(input.dto.id)));
		return this.cultivarRepository.update(input.dto);
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
		await this.cultivarRepository.getById({ id: input.dto.id });
		await this.access.assertCanDelete(input.context, gardeningCultivarRef(String(input.dto.id)));
		return this.cultivarRepository.delete(input.dto);
	}
}

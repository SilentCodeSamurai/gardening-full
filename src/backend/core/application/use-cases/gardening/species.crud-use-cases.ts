import type {
	SpeciesRepositoryCreateInputDTO,
	SpeciesRepositoryCreateOutputDTO,
	SpeciesRepositoryDeleteInputDTO,
	SpeciesRepositoryDeleteOutputDTO,
	SpeciesRepositoryGetAllOutputDTO,
	SpeciesRepositoryGetByIdInputDTO,
	SpeciesRepositoryGetByIdOutputDTO,
	SpeciesRepositoryPort,
	SpeciesRepositoryUpdateInputDTO,
	SpeciesRepositoryUpdateOutputDTO,
} from "../../ports/repositories/gardening/species.repository.port";
import { BaseUseCaseError } from "../shared/errors";
import type { IUseCase } from "../shared/use-case.interface";

export class SpeciesUpdateUseCaseDefaultUpdateError extends BaseUseCaseError {
	constructor(params: { id: string }) {
		super({
			message: "Cannot update default species.",
			useCaseName: "SpeciesUpdateUseCase",
			context: params,
		});
	}
}

export class SpeciesDeleteUseCaseDefaultDeletionError extends BaseUseCaseError {
	constructor(params: { id: string }) {
		super({
			message: "Cannot delete default species.",
			useCaseName: "SpeciesDeleteUseCase",
			context: params,
		});
	}
}

/** callers cannot set `isDefault`; repository always receives `isDefault: false`. */
export type SpeciesCreateUseCaseInput = Omit<SpeciesRepositoryCreateInputDTO, "isDefault">;
export type SpeciesCreateUseCaseOutput = SpeciesRepositoryCreateOutputDTO;

export class SpeciesCreateUseCase implements IUseCase<SpeciesCreateUseCaseInput, SpeciesCreateUseCaseOutput> {
	constructor(private readonly speciesRepository: SpeciesRepositoryPort) {}

	public async execute(input: SpeciesCreateUseCaseInput): Promise<SpeciesCreateUseCaseOutput> {
		return this.speciesRepository.create({ ...input, isDefault: false });
	}
}

export type SpeciesGetByIdUseCaseInput = SpeciesRepositoryGetByIdInputDTO;
export type SpeciesGetByIdUseCaseOutput = SpeciesRepositoryGetByIdOutputDTO;

export class SpeciesGetByIdUseCase implements IUseCase<SpeciesGetByIdUseCaseInput, SpeciesGetByIdUseCaseOutput> {
	constructor(private readonly speciesRepository: SpeciesRepositoryPort) {}

	public async execute(input: SpeciesGetByIdUseCaseInput): Promise<SpeciesGetByIdUseCaseOutput> {
		return this.speciesRepository.getById(input);
	}
}

export type SpeciesGetAllUseCaseOutput = SpeciesRepositoryGetAllOutputDTO;

export class SpeciesGetAllUseCase implements IUseCase<void, SpeciesGetAllUseCaseOutput> {
	constructor(private readonly speciesRepository: SpeciesRepositoryPort) {}

	public async execute(): Promise<SpeciesGetAllUseCaseOutput> {
		return this.speciesRepository.getAll();
	}
}

/** `isDefault` is not writable via this use case (preserved by repository merge). */
export type SpeciesUpdateUseCaseInput = Omit<SpeciesRepositoryUpdateInputDTO, "isDefault">;
export type SpeciesUpdateUseCaseOutput = SpeciesRepositoryUpdateOutputDTO;

export class SpeciesUpdateUseCase implements IUseCase<SpeciesUpdateUseCaseInput, SpeciesUpdateUseCaseOutput> {
	constructor(private readonly speciesRepository: SpeciesRepositoryPort) {}

	public async execute(input: SpeciesUpdateUseCaseInput): Promise<SpeciesUpdateUseCaseOutput> {
		const current = await this.speciesRepository.getById({ id: input.id });
		if (current.isDefault) {
			throw new SpeciesUpdateUseCaseDefaultUpdateError({ id: input.id });
		}
		return this.speciesRepository.update(input);
	}
}

export type SpeciesDeleteUseCaseInput = SpeciesRepositoryDeleteInputDTO;
export type SpeciesDeleteUseCaseOutput = SpeciesRepositoryDeleteOutputDTO;

export class SpeciesDeleteUseCase implements IUseCase<SpeciesDeleteUseCaseInput, SpeciesDeleteUseCaseOutput> {
	constructor(private readonly speciesRepository: SpeciesRepositoryPort) {}

	public async execute(input: SpeciesDeleteUseCaseInput): Promise<SpeciesDeleteUseCaseOutput> {
		const current = await this.speciesRepository.getById({ id: input.id });
		if (current.isDefault) {
			throw new SpeciesDeleteUseCaseDefaultDeletionError({ id: input.id });
		}
		return this.speciesRepository.delete(input);
	}
}

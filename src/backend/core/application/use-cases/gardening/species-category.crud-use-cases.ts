import type {
	SpeciesCategoryRepositoryCreateInputDTO,
	SpeciesCategoryRepositoryCreateOutputDTO,
	SpeciesCategoryRepositoryDeleteInputDTO,
	SpeciesCategoryRepositoryDeleteOutputDTO,
	SpeciesCategoryRepositoryGetAllOutputDTO,
	SpeciesCategoryRepositoryGetByIdInputDTO,
	SpeciesCategoryRepositoryGetByIdOutputDTO,
	SpeciesCategoryRepositoryPort,
	SpeciesCategoryRepositoryUpdateInputDTO,
	SpeciesCategoryRepositoryUpdateOutputDTO,
} from "../../ports/repositories/gardening/species-category.repository.port";
import { BaseUseCaseError } from "../shared/errors";
import type { IUseCase } from "../shared/use-case.interface";

export class SpeciesCategoryUpdateUseCaseDefaultUpdateError extends BaseUseCaseError {
	constructor(params: { id: string }) {
		super({
			message: "Cannot update default species category.",
			useCaseName: "SpeciesCategoryUpdateUseCase",
			context: params,
		});
	}
}

export class SpeciesCategoryDeleteUseCaseDefaultDeletionError extends BaseUseCaseError {
	constructor(params: { id: string }) {
		super({
			message: "Cannot delete default species category.",
			useCaseName: "SpeciesCategoryDeleteUseCase",
			context: params,
		});
	}
}

/** callers cannot set `isDefault`; repository always receives `isDefault: false`. */
export type SpeciesCategoryCreateUseCaseInput = Omit<SpeciesCategoryRepositoryCreateInputDTO, "isDefault">;
export type SpeciesCategoryCreateUseCaseOutput = SpeciesCategoryRepositoryCreateOutputDTO;

export class SpeciesCategoryCreateUseCase
	implements IUseCase<SpeciesCategoryCreateUseCaseInput, SpeciesCategoryCreateUseCaseOutput>
{
	constructor(private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort) {}

	public async execute(input: SpeciesCategoryCreateUseCaseInput): Promise<SpeciesCategoryCreateUseCaseOutput> {
		return this.speciesCategoryRepository.create({ ...input, isDefault: false });
	}
}

export type SpeciesCategoryGetByIdUseCaseInput = SpeciesCategoryRepositoryGetByIdInputDTO;
export type SpeciesCategoryGetByIdUseCaseOutput = SpeciesCategoryRepositoryGetByIdOutputDTO;

export class SpeciesCategoryGetByIdUseCase
	implements IUseCase<SpeciesCategoryGetByIdUseCaseInput, SpeciesCategoryGetByIdUseCaseOutput>
{
	constructor(private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort) {}

	public async execute(input: SpeciesCategoryGetByIdUseCaseInput): Promise<SpeciesCategoryGetByIdUseCaseOutput> {
		return this.speciesCategoryRepository.getById(input);
	}
}

export type SpeciesCategoryGetAllUseCaseOutput = SpeciesCategoryRepositoryGetAllOutputDTO;

export class SpeciesCategoryGetAllUseCase implements IUseCase<void, SpeciesCategoryGetAllUseCaseOutput> {
	constructor(private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort) {}
	public async execute(): Promise<SpeciesCategoryGetAllUseCaseOutput> {
		return this.speciesCategoryRepository.getAll();
	}
}

/** `isDefault` is not writable via this use case (preserved by repository merge). */
export type SpeciesCategoryUpdateUseCaseInput = Omit<SpeciesCategoryRepositoryUpdateInputDTO, "isDefault">;
export type SpeciesCategoryUpdateUseCaseOutput = SpeciesCategoryRepositoryUpdateOutputDTO;

export class SpeciesCategoryUpdateUseCase
	implements IUseCase<SpeciesCategoryUpdateUseCaseInput, SpeciesCategoryUpdateUseCaseOutput>
{
	constructor(private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort) {}
	public async execute(input: SpeciesCategoryUpdateUseCaseInput): Promise<SpeciesCategoryUpdateUseCaseOutput> {
		const current = await this.speciesCategoryRepository.getById({ id: input.id });
		if (current.isDefault) {
			throw new SpeciesCategoryUpdateUseCaseDefaultUpdateError({ id: input.id });
		}
		return this.speciesCategoryRepository.update(input);
	}
}

export type SpeciesCategoryDeleteUseCaseInput = SpeciesCategoryRepositoryDeleteInputDTO;
export type SpeciesCategoryDeleteUseCaseOutput = SpeciesCategoryRepositoryDeleteOutputDTO;

export class SpeciesCategoryDeleteUseCase
	implements IUseCase<SpeciesCategoryDeleteUseCaseInput, SpeciesCategoryDeleteUseCaseOutput>
{
	constructor(private readonly speciesCategoryRepository: SpeciesCategoryRepositoryPort) {}
	public async execute(input: SpeciesCategoryDeleteUseCaseInput): Promise<SpeciesCategoryDeleteUseCaseOutput> {
		const current = await this.speciesCategoryRepository.getById({ id: input.id });
		if (current.isDefault) {
			throw new SpeciesCategoryDeleteUseCaseDefaultDeletionError({ id: input.id });
		}
		return this.speciesCategoryRepository.delete(input);
	}
}

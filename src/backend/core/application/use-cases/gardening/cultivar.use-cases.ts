import type {
	CultivarRepositoryPort,
	CultivarRepositoryCreateInputDTO,
	CultivarRepositoryCreateOutputDTO,
	CultivarRepositoryDeleteInputDTO,
	CultivarRepositoryDeleteOutputDTO,
	CultivarRepositoryGetAllOutputDTO,
	CultivarRepositoryGetByIdInputDTO,
	CultivarRepositoryGetByIdOutputDTO,
	CultivarRepositoryGetFullByIdInputDTO,
	CultivarRepositoryGetFullByIdOutputDTO,
	CultivarRepositoryUpdateInputDTO,
	CultivarRepositoryUpdateOutputDTO,
} from "../../ports/repositories/gardening/cultivar.repositort.port";
import type { IUseCase } from "../shared/use-case.interface";

export type CultivarCreateUseCaseInput = CultivarRepositoryCreateInputDTO;
export type CultivarCreateUseCaseOutput = CultivarRepositoryCreateOutputDTO;
export class CultivarCreateUseCase implements IUseCase<CultivarCreateUseCaseInput, CultivarCreateUseCaseOutput> {
	constructor(private readonly cultivarRepository: CultivarRepositoryPort) {}
	public async execute(input: CultivarCreateUseCaseInput): Promise<CultivarCreateUseCaseOutput> {
		return this.cultivarRepository.create(input);
	}
}

export type CultivarGetByIdUseCaseInput = CultivarRepositoryGetByIdInputDTO;
export type CultivarGetByIdUseCaseOutput = CultivarRepositoryGetByIdOutputDTO;
export class CultivarGetByIdUseCase implements IUseCase<CultivarGetByIdUseCaseInput, CultivarGetByIdUseCaseOutput> {
	constructor(private readonly cultivarRepository: CultivarRepositoryPort) {}
	public async execute(input: CultivarGetByIdUseCaseInput): Promise<CultivarGetByIdUseCaseOutput> {
		return this.cultivarRepository.getById(input);
	}
}

export type CultivarGetFullByIdUseCaseInput = CultivarRepositoryGetFullByIdInputDTO;
export type CultivarGetFullByIdUseCaseOutput = CultivarRepositoryGetFullByIdOutputDTO;

export class CultivarGetFullByIdUseCase
	implements IUseCase<CultivarGetFullByIdUseCaseInput, CultivarGetFullByIdUseCaseOutput>
{
	constructor(private readonly cultivarRepository: CultivarRepositoryPort) {}
	public async execute(input: CultivarGetFullByIdUseCaseInput): Promise<CultivarGetFullByIdUseCaseOutput> {
		return this.cultivarRepository.getFullById(input);
	}
}

export type CultivarGetAllUseCaseOutput = CultivarRepositoryGetAllOutputDTO;

export class CultivarGetAllUseCase implements IUseCase<void, CultivarGetAllUseCaseOutput> {
	constructor(private readonly cultivarRepository: CultivarRepositoryPort) {}
	public async execute(): Promise<CultivarGetAllUseCaseOutput> {
		return this.cultivarRepository.getAll();
	}
}

export type CultivarUpdateUseCaseInput = CultivarRepositoryUpdateInputDTO;
export type CultivarUpdateUseCaseOutput = CultivarRepositoryUpdateOutputDTO;

export class CultivarUpdateUseCase implements IUseCase<CultivarUpdateUseCaseInput, CultivarUpdateUseCaseOutput> {
	constructor(private readonly cultivarRepository: CultivarRepositoryPort) {}
	public async execute(input: CultivarUpdateUseCaseInput): Promise<CultivarUpdateUseCaseOutput> {
		return this.cultivarRepository.update(input);
	}
}

export type CultivarDeleteUseCaseInput = CultivarRepositoryDeleteInputDTO;
export type CultivarDeleteUseCaseOutput = CultivarRepositoryDeleteOutputDTO;

export class CultivarDeleteUseCase implements IUseCase<CultivarDeleteUseCaseInput, CultivarDeleteUseCaseOutput> {
	constructor(private readonly cultivarRepository: CultivarRepositoryPort) {}
	public async execute(input: CultivarDeleteUseCaseInput): Promise<CultivarDeleteUseCaseOutput> {
		return this.cultivarRepository.delete(input);
	}
}

/**
 * A base CRUD repository port.
 *
 * Provides 5 basic CRUD operations: create, getById, getAll, update, delete.
 *
 * @template TCreateInputDTO - The input DTO for the create operation.
 * @template TCreateOutputDTO - The output DTO for the create operation.
 * @template TGetByIdInputDTO - The input DTO for the getById operation.
 * @template TGetByIdOutputDTO - The output DTO for the getById operation.
 * @template TGetAllInputDTO - The input DTO for the getAll operation.
 * @template TGetAllOutputDTO - The output DTO for the getAll operation.
 * @template TUpdateInputDTO - The input DTO for the update operation.
 * @template TUpdateOutputDTO - The output DTO for the update operation.
 * @template TDeleteInputDTO - The input DTO for the delete operation.
 * @template TDeleteOutputDTO - The output DTO for the delete operation.
 */
export interface BaseCRUDRepositoryPort<
	TCreateInputDTO,
	TCreateOutputDTO,
	TGetByIdInputDTO,
	TGetByIdOutputDTO,
	TGetAllInputDTO,
	TGetAllOutputDTO,
	TUpdateInputDTO,
	TUpdateOutputDTO,
	TDeleteInputDTO,
	TDeleteOutputDTO,
> {
	create(dto: TCreateInputDTO): Promise<TCreateOutputDTO>;
	getById(dto: TGetByIdInputDTO): Promise<TGetByIdOutputDTO>;
	getAll(dto?: TGetAllInputDTO): Promise<TGetAllOutputDTO>;
	update(dto: TUpdateInputDTO): Promise<TUpdateOutputDTO>;
	delete(dto: TDeleteInputDTO): Promise<TDeleteOutputDTO>;
}

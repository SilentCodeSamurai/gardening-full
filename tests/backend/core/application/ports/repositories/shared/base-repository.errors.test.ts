import { describe, expect, it } from "vitest";

import {
  BaseRepositoryErrors,
  RepositoryConflictError,
  RepositoryNotFoundError,
} from "@backend/core/application/ports/repositories/shared/base-repository.errors";

class RepositoryErrorsHarness extends BaseRepositoryErrors {
  public throwNotFound(resource: string, id: unknown): never {
    return this.throwNotFoundError(resource, id);
  }

  public throwConflict(params: {
    operation: string;
    reason: string;
    context?: Record<string, unknown>;
  }): never {
    return this.throwConflictError(params);
  }
}

describe("base repository errors", () => {
  it("RepositoryNotFoundError carries resource and context", () => {
    const err = new RepositoryNotFoundError({
      resource: "PlantEntity",
      context: { id: "p-1" },
    });
    expect(err.code).toBe("NOT_FOUND");
    expect(err.resource).toBe("PlantEntity");
    expect(err.context).toMatchObject({ id: "p-1" });
  });

  it("RepositoryConflictError keeps operation and reason", () => {
    const err = new RepositoryConflictError({
      operation: "createOne",
      reason: "duplicate",
      context: { id: "p-1" },
    });
    expect(err.code).toBe("CONFLICT");
    expect(err.operation).toBe("createOne");
    expect(err.reason).toBe("duplicate");
    expect(err.context).toMatchObject({ id: "p-1" });
  });

  it("BaseRepositoryErrors helper methods throw the expected typed errors", () => {
    const harness = new RepositoryErrorsHarness();
    expect(() => harness.throwNotFound("SpeciesEntity", "missing-id")).toThrow(RepositoryNotFoundError);
    expect(() =>
      harness.throwConflict({
        operation: "deleteOne",
        reason: "referenced",
        context: { id: "s-1" },
      }),
    ).toThrow(RepositoryConflictError);
  });
});

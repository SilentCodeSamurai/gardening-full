import { registerResourceAccessRepositoryContracts } from "../contracts";
import { createInMemoryResourceAccessTestContainer } from "./create-in-memory-resource-access-test-container";

registerResourceAccessRepositoryContracts("in-memory", createInMemoryResourceAccessTestContainer);

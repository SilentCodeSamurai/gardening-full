import { registerAccessRepositoryContracts } from "../contracts";

import { createInMemoryAccessTestContainer } from "./create-in-memory-access-test-container";

registerAccessRepositoryContracts("in-memory", createInMemoryAccessTestContainer);

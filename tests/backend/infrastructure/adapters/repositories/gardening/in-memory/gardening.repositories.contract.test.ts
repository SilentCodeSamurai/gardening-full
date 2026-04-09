import { registerGardeningRepositoryContracts } from "../contracts";

import { createInMemoryGardeningTestContainer } from "./create-in-memory-gardening-test-container";

registerGardeningRepositoryContracts("in-memory", createInMemoryGardeningTestContainer);

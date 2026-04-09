import { registerGardeningRepositoryContracts } from "../contracts";

import { createIndexedDbGardeningTestContainer } from "./create-indexed-db-gardening-test-container";

registerGardeningRepositoryContracts("indexed-db", createIndexedDbGardeningTestContainer);

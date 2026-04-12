import { registerGardeningRepositoryContractsV2 } from "../contracts/v2";

import { createInMemoryGardeningTestContainer } from "./create-in-memory-gardening-test-container";

registerGardeningRepositoryContractsV2("in-memory", createInMemoryGardeningTestContainer);

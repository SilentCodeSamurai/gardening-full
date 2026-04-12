import { registerAccessRepositoryContractsV2 } from "../contracts/v2";

import { createInMemoryAccessTestContainer } from "./create-in-memory-access-test-container";

registerAccessRepositoryContractsV2("in-memory", createInMemoryAccessTestContainer);

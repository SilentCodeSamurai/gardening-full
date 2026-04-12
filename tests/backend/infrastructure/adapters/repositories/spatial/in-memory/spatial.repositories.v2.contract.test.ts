import { registerSpatialRepositoryContractsV2 } from "../contracts/v2";

import { createInMemoryGardeningTestContainer } from "../../gardening/in-memory/create-in-memory-gardening-test-container";

registerSpatialRepositoryContractsV2("in-memory", createInMemoryGardeningTestContainer);

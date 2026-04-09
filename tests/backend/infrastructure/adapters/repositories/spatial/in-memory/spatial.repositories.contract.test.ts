import { registerSpatialRepositoryContracts } from "../contracts";
import { createInMemoryGardeningTestContainer } from "../../gardening/in-memory/create-in-memory-gardening-test-container";

registerSpatialRepositoryContracts("in-memory", createInMemoryGardeningTestContainer);

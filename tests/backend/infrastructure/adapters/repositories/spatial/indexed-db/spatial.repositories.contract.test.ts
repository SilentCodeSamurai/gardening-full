import { registerSpatialRepositoryContracts } from "../contracts";
import { createIndexedDbGardeningTestContainer } from "../../gardening/indexed-db/create-indexed-db-gardening-test-container";

registerSpatialRepositoryContracts("indexed-db", createIndexedDbGardeningTestContainer);

import { accessRouter } from "./access/router";
import { cultivarRouter } from "./cultivar/router";
import { gardeningEventRouter } from "./gardening-event/router";
import { locationRouter } from "./location/router";
import { plantRouter } from "./plant/router";
import { spatialRouter } from "./spatial/router";
import { speciesRouter } from "./species/router";
import { speciesCategoryRouter } from "./species-category/router";
import { addTodo, listTodos } from "./todos";

export default {
	access: accessRouter,
	listTodos,
	addTodo,
	speciesCategory: speciesCategoryRouter,
	species: speciesRouter,
	cultivar: cultivarRouter,
	plant: plantRouter,
	location: locationRouter,
	spatial: spatialRouter,
	gardeningEvent: gardeningEventRouter,
};

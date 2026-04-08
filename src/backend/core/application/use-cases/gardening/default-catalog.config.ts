import type { SpeciesCategoryRepositoryCreateInputDTO } from "../../ports/repositories/gardening/species-category.repository.port";
import type { SpeciesRepositoryCreateInputDTO } from "../../ports/repositories/gardening/species.repository.port";
import type { ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";
import { ItemPresentationIconKey } from "@backend/core/domain/gardening/enums";

import { CATALOG_I18N_KEYS } from "./catalog-i18n-keys";

/**
 * Wiring slug for default catalog only (not stored on the species category entity).
 * Translatable fields hold Paraglide keys (see {@link CATALOG_I18N_KEYS} and `locales/`).
 */
export type DefaultCatalogCategory = {
	readonly slug: string;
} & SpeciesCategoryRepositoryCreateInputDTO;

/**
 * Same shape as {@link SpeciesRepositoryCreateInputDTO} except `categoryId` is replaced by
 * `categorySlug` referencing a row in `categories`.
 */
export type DefaultCatalogSpecies<C extends readonly DefaultCatalogCategory[]> = {
	readonly categorySlug: C[number]["slug"];
} & Omit<SpeciesRepositoryCreateInputDTO, "categoryId">;

export type DefaultCatalogDefinition<C extends readonly DefaultCatalogCategory[]> = {
	readonly categories: C;
	readonly species: readonly DefaultCatalogSpecies<C>[];
};

export function defineDefaultCatalog<const C extends readonly DefaultCatalogCategory[]>(
	def: DefaultCatalogDefinition<C>,
): DefaultCatalogDefinition<C> {
	return def;
}

type CategorySlugEnum =
	| "vegetables"
	| "herbs"
	| "fruits"
	| "berries"
	| "leafyGreens"
	| "alliums"
	| "brassicas"
	| "legumes"
	| "rootCrops"
	| "flowers"
	| "microgreens"
	| "coverCrops";

const DEFAULT_CATEGORY_PRESENTATION = {
	vegetables: {
		iconKey: ItemPresentationIconKey.generic_carrot,
		iconColor: "#b45309",
		backgroundColor: "#ffedd5",
	},
	herbs: {
		iconKey: ItemPresentationIconKey.generic_leaf,
		iconColor: "#166534",
		backgroundColor: "#dcfce7",
	},
	fruits: {
		iconKey: ItemPresentationIconKey.generic_apple,
		iconColor: "#be123c",
		backgroundColor: "#ffe4e6",
	},
	berries: {
		iconKey: ItemPresentationIconKey.generic_cherry,
		iconColor: "#9f1239",
		backgroundColor: "#ffe4e6",
	},
	leafyGreens: {
		iconKey: ItemPresentationIconKey.generic_leaf2,
		iconColor: "#15803d",
		backgroundColor: "#dcfce7",
	},
	alliums: {
		iconKey: ItemPresentationIconKey.generic_basket,
		iconColor: "#7c2d12",
		backgroundColor: "#ffedd5",
	},
	brassicas: {
		iconKey: ItemPresentationIconKey.generic_flower,
		iconColor: "#0f766e",
		backgroundColor: "#ccfbf1",
	},
	legumes: {
		iconKey: ItemPresentationIconKey.generic_grain,
		iconColor: "#854d0e",
		backgroundColor: "#fef9c3",
	},
	rootCrops: {
		iconKey: ItemPresentationIconKey.generic_carrot_off,
		iconColor: "#9a3412",
		backgroundColor: "#ffedd5",
	},
	flowers: {
		iconKey: ItemPresentationIconKey.generic_flower_filled,
		iconColor: "#a21caf",
		backgroundColor: "#f5d0fe",
	},
	microgreens: {
		iconKey: ItemPresentationIconKey.generic_leaf_filled,
		iconColor: "#166534",
		backgroundColor: "#dcfce7",
	},
	coverCrops: {
		iconKey: ItemPresentationIconKey.generic_grain,
		iconColor: "#365314",
		backgroundColor: "#ecfccb",
	},
} as const satisfies Record<CategorySlugEnum, ItemPresentationValueObject>;

const DEFAULT_SPECIES_BY_CATEGORY: Record<
	CategorySlugEnum,
	{
		characteristics: { name: string; description: string | null };
		presentation: ItemPresentationValueObject;
	}[]
> = {
	vegetables: [
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.tomato.name,
				description: CATALOG_I18N_KEYS.species.vegetables.tomato.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_tomato,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.cucumber.name,
				description: CATALOG_I18N_KEYS.species.vegetables.cucumber.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_cucumber,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.zucchini.name,
				description: CATALOG_I18N_KEYS.species.vegetables.zucchini.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_zucchini,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.eggplant.name,
				description: CATALOG_I18N_KEYS.species.vegetables.eggplant.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_eggplant,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.bellPepper.name,
				description: CATALOG_I18N_KEYS.species.vegetables.bellPepper.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_bellPepper,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.chiliPepper.name,
				description: CATALOG_I18N_KEYS.species.vegetables.chiliPepper.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_chiliPepper,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.pumpkin.name,
				description: CATALOG_I18N_KEYS.species.vegetables.pumpkin.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_pumpkin,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.squash.name,
				description: CATALOG_I18N_KEYS.species.vegetables.squash.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_squash,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.corn.name,
				description: CATALOG_I18N_KEYS.species.vegetables.corn.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_corn,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.okra.name,
				description: CATALOG_I18N_KEYS.species.vegetables.okra.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_okra,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.artichoke.name,
				description: CATALOG_I18N_KEYS.species.vegetables.artichoke.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_artichoke,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.celery.name,
				description: CATALOG_I18N_KEYS.species.vegetables.celery.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_celery,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.asparagus.name,
				description: CATALOG_I18N_KEYS.species.vegetables.asparagus.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_asparagus,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.rhubarb.name,
				description: CATALOG_I18N_KEYS.species.vegetables.rhubarb.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_rhubarb,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.sweetPotato.name,
				description: CATALOG_I18N_KEYS.species.vegetables.sweetPotato.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_sweetPotato,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.tomatillo.name,
				description: CATALOG_I18N_KEYS.species.vegetables.tomatillo.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_tomatillo,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.pattypanSquash.name,
				description: CATALOG_I18N_KEYS.species.vegetables.pattypanSquash.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_pattypanSquash,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.chayote.name,
				description: CATALOG_I18N_KEYS.species.vegetables.chayote.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_chayote,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.kohlrabi.name,
				description: CATALOG_I18N_KEYS.species.vegetables.kohlrabi.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_kohlrabi,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.vegetables.fennel.name,
				description: CATALOG_I18N_KEYS.species.vegetables.fennel.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.species_vegetables_fennel,
			},
		},
	],
	herbs: [
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.basil.name,
				description: CATALOG_I18N_KEYS.species.herbs.basil.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_basil,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.parsley.name,
				description: CATALOG_I18N_KEYS.species.herbs.parsley.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_parsley,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.cilantro.name,
				description: CATALOG_I18N_KEYS.species.herbs.cilantro.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_cilantro,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.dill.name,
				description: CATALOG_I18N_KEYS.species.herbs.dill.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_dill,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.mint.name,
				description: CATALOG_I18N_KEYS.species.herbs.mint.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_mint,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.oregano.name,
				description: CATALOG_I18N_KEYS.species.herbs.oregano.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_oregano,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.thyme.name,
				description: CATALOG_I18N_KEYS.species.herbs.thyme.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_thyme,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.rosemary.name,
				description: CATALOG_I18N_KEYS.species.herbs.rosemary.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_rosemary,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.sage.name,
				description: CATALOG_I18N_KEYS.species.herbs.sage.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_sage,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.chives.name,
				description: CATALOG_I18N_KEYS.species.herbs.chives.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_chives,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.tarragon.name,
				description: CATALOG_I18N_KEYS.species.herbs.tarragon.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_tarragon,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.marjoram.name,
				description: CATALOG_I18N_KEYS.species.herbs.marjoram.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_marjoram,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.lavender.name,
				description: CATALOG_I18N_KEYS.species.herbs.lavender.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_lavender,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.lemonBalm.name,
				description: CATALOG_I18N_KEYS.species.herbs.lemonBalm.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_lemonBalm,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.bayLaurel.name,
				description: CATALOG_I18N_KEYS.species.herbs.bayLaurel.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_bayLaurel,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.lemongrass.name,
				description: CATALOG_I18N_KEYS.species.herbs.lemongrass.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_lemongrass,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.stevia.name,
				description: CATALOG_I18N_KEYS.species.herbs.stevia.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_stevia,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.chervil.name,
				description: CATALOG_I18N_KEYS.species.herbs.chervil.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_chervil,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.summerSavory.name,
				description: CATALOG_I18N_KEYS.species.herbs.summerSavory.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_summerSavory,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.herbs.winterSavory.name,
				description: CATALOG_I18N_KEYS.species.herbs.winterSavory.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.species_herbs_winterSavory,
			},
		},
	],
	fruits: [
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.apple.name,
				description: CATALOG_I18N_KEYS.species.fruits.apple.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_apple,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.pear.name,
				description: CATALOG_I18N_KEYS.species.fruits.pear.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_pear,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.peach.name,
				description: CATALOG_I18N_KEYS.species.fruits.peach.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_peach,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.plum.name,
				description: CATALOG_I18N_KEYS.species.fruits.plum.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_plum,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.apricot.name,
				description: CATALOG_I18N_KEYS.species.fruits.apricot.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_apricot,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.cherry.name,
				description: CATALOG_I18N_KEYS.species.fruits.cherry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_cherry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.fig.name,
				description: CATALOG_I18N_KEYS.species.fruits.fig.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_fig,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.persimmon.name,
				description: CATALOG_I18N_KEYS.species.fruits.persimmon.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_persimmon,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.quince.name,
				description: CATALOG_I18N_KEYS.species.fruits.quince.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_quince,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.grape.name,
				description: CATALOG_I18N_KEYS.species.fruits.grape.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_grape,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.kiwi.name,
				description: CATALOG_I18N_KEYS.species.fruits.kiwi.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_kiwi,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.melon.name,
				description: CATALOG_I18N_KEYS.species.fruits.melon.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_melon,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.watermelon.name,
				description: CATALOG_I18N_KEYS.species.fruits.watermelon.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_watermelon,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.pineapple.name,
				description: CATALOG_I18N_KEYS.species.fruits.pineapple.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_pineapple,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.pomegranate.name,
				description: CATALOG_I18N_KEYS.species.fruits.pomegranate.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_pomegranate,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.orange.name,
				description: CATALOG_I18N_KEYS.species.fruits.orange.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_orange,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.lemon.name,
				description: CATALOG_I18N_KEYS.species.fruits.lemon.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_lemon,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.lime.name,
				description: CATALOG_I18N_KEYS.species.fruits.lime.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_lime,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.mango.name,
				description: CATALOG_I18N_KEYS.species.fruits.mango.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_mango,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.fruits.papaya.name,
				description: CATALOG_I18N_KEYS.species.fruits.papaya.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.species_fruits_papaya,
			},
		},
	],
	berries: [
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.strawberry.name,
				description: CATALOG_I18N_KEYS.species.berries.strawberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_strawberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.blueberry.name,
				description: CATALOG_I18N_KEYS.species.berries.blueberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_blueberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.raspberry.name,
				description: CATALOG_I18N_KEYS.species.berries.raspberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_raspberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.blackberry.name,
				description: CATALOG_I18N_KEYS.species.berries.blackberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_blackberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.gooseberry.name,
				description: CATALOG_I18N_KEYS.species.berries.gooseberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_gooseberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.redCurrant.name,
				description: CATALOG_I18N_KEYS.species.berries.redCurrant.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_redCurrant,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.blackCurrant.name,
				description: CATALOG_I18N_KEYS.species.berries.blackCurrant.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_blackCurrant,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.whiteCurrant.name,
				description: CATALOG_I18N_KEYS.species.berries.whiteCurrant.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_whiteCurrant,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.cranberry.name,
				description: CATALOG_I18N_KEYS.species.berries.cranberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_cranberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.lingonberry.name,
				description: CATALOG_I18N_KEYS.species.berries.lingonberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_lingonberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.elderberry.name,
				description: CATALOG_I18N_KEYS.species.berries.elderberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_elderberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.mulberry.name,
				description: CATALOG_I18N_KEYS.species.berries.mulberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_mulberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.boysenberry.name,
				description: CATALOG_I18N_KEYS.species.berries.boysenberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_boysenberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.loganberry.name,
				description: CATALOG_I18N_KEYS.species.berries.loganberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_loganberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.huckleberry.name,
				description: CATALOG_I18N_KEYS.species.berries.huckleberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_huckleberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.serviceberry.name,
				description: CATALOG_I18N_KEYS.species.berries.serviceberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_serviceberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.seaBuckthorn.name,
				description: CATALOG_I18N_KEYS.species.berries.seaBuckthorn.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_seaBuckthorn,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.aronia.name,
				description: CATALOG_I18N_KEYS.species.berries.aronia.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_aronia,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.cloudberry.name,
				description: CATALOG_I18N_KEYS.species.berries.cloudberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_cloudberry,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.berries.jostaberry.name,
				description: CATALOG_I18N_KEYS.species.berries.jostaberry.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.species_berries_jostaberry,
			},
		},
	],
	leafyGreens: [
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.lettuce.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.lettuce.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_lettuce,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.spinach.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.spinach.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_spinach,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.kale.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.kale.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_kale,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.arugula.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.arugula.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_arugula,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.swissChard.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.swissChard.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_swissChard,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.collardGreens.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.collardGreens.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_collardGreens,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.endive.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.endive.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_endive,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.escarole.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.escarole.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_escarole,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.mustardGreens.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.mustardGreens.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_mustardGreens,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.bokChoy.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.bokChoy.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_bokChoy,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.romaine.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.romaine.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_romaine,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.radicchio.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.radicchio.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_radicchio,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.watercress.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.watercress.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_watercress,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.mizuna.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.mizuna.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_mizuna,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.tatsoi.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.tatsoi.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_tatsoi,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.newZealandSpinach.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.newZealandSpinach.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_newZealandSpinach,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.purslane.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.purslane.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_purslane,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.sorrel.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.sorrel.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_sorrel,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.malabarSpinach.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.malabarSpinach.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_malabarSpinach,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.leafyGreens.chicory.name,
				description: CATALOG_I18N_KEYS.species.leafyGreens.chicory.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.species_leafyGreens_chicory,
			},
		},
	],
	alliums: [
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.onion.name,
				description: CATALOG_I18N_KEYS.species.alliums.onion.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_onion,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.garlic.name,
				description: CATALOG_I18N_KEYS.species.alliums.garlic.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_garlic,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.leek.name,
				description: CATALOG_I18N_KEYS.species.alliums.leek.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_leek,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.shallot.name,
				description: CATALOG_I18N_KEYS.species.alliums.shallot.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_shallot,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.scallion.name,
				description: CATALOG_I18N_KEYS.species.alliums.scallion.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_scallion,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.garlicChive.name,
				description: CATALOG_I18N_KEYS.species.alliums.garlicChive.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_garlicChive,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.onionChive.name,
				description: CATALOG_I18N_KEYS.species.alliums.onionChive.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_onionChive,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.welshOnion.name,
				description: CATALOG_I18N_KEYS.species.alliums.welshOnion.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_welshOnion,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.walkingOnion.name,
				description: CATALOG_I18N_KEYS.species.alliums.walkingOnion.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_walkingOnion,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.rakkyo.name,
				description: CATALOG_I18N_KEYS.species.alliums.rakkyo.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_rakkyo,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.elephantGarlic.name,
				description: CATALOG_I18N_KEYS.species.alliums.elephantGarlic.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_elephantGarlic,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.ramps.name,
				description: CATALOG_I18N_KEYS.species.alliums.ramps.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_ramps,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.garlicChives.name,
				description: CATALOG_I18N_KEYS.species.alliums.garlicChives.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_garlicChives,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.springOnion.name,
				description: CATALOG_I18N_KEYS.species.alliums.springOnion.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_springOnion,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.redOnion.name,
				description: CATALOG_I18N_KEYS.species.alliums.redOnion.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_redOnion,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.yellowOnion.name,
				description: CATALOG_I18N_KEYS.species.alliums.yellowOnion.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_yellowOnion,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.whiteOnion.name,
				description: CATALOG_I18N_KEYS.species.alliums.whiteOnion.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_whiteOnion,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.pearlOnion.name,
				description: CATALOG_I18N_KEYS.species.alliums.pearlOnion.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_pearlOnion,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.cipolliniOnion.name,
				description: CATALOG_I18N_KEYS.species.alliums.cipolliniOnion.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_cipolliniOnion,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.alliums.societyGarlic.name,
				description: CATALOG_I18N_KEYS.species.alliums.societyGarlic.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.species_alliums_societyGarlic,
			},
		},
	],
	brassicas: [
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.cabbage.name,
				description: CATALOG_I18N_KEYS.species.brassicas.cabbage.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_cabbage,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.broccoli.name,
				description: CATALOG_I18N_KEYS.species.brassicas.broccoli.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_broccoli,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.cauliflower.name,
				description: CATALOG_I18N_KEYS.species.brassicas.cauliflower.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_cauliflower,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.brusselsSprouts.name,
				description: CATALOG_I18N_KEYS.species.brassicas.brusselsSprouts.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_brusselsSprouts,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.broccolini.name,
				description: CATALOG_I18N_KEYS.species.brassicas.broccolini.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_broccolini,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.napaCabbage.name,
				description: CATALOG_I18N_KEYS.species.brassicas.napaCabbage.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_napaCabbage,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.savoyCabbage.name,
				description: CATALOG_I18N_KEYS.species.brassicas.savoyCabbage.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_savoyCabbage,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.redCabbage.name,
				description: CATALOG_I18N_KEYS.species.brassicas.redCabbage.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_redCabbage,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.romanesco.name,
				description: CATALOG_I18N_KEYS.species.brassicas.romanesco.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_romanesco,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.turnip.name,
				description: CATALOG_I18N_KEYS.species.brassicas.turnip.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_turnip,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.rutabaga.name,
				description: CATALOG_I18N_KEYS.species.brassicas.rutabaga.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_rutabaga,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.daikon.name,
				description: CATALOG_I18N_KEYS.species.brassicas.daikon.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_daikon,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.wasabi.name,
				description: CATALOG_I18N_KEYS.species.brassicas.wasabi.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_wasabi,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.horseradish.name,
				description: CATALOG_I18N_KEYS.species.brassicas.horseradish.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_horseradish,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.komatsuna.name,
				description: CATALOG_I18N_KEYS.species.brassicas.komatsuna.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_komatsuna,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.broccoliRaab.name,
				description: CATALOG_I18N_KEYS.species.brassicas.broccoliRaab.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_broccoliRaab,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.mustardCabbage.name,
				description: CATALOG_I18N_KEYS.species.brassicas.mustardCabbage.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_mustardCabbage,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.chineseBroccoli.name,
				description: CATALOG_I18N_KEYS.species.brassicas.chineseBroccoli.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_chineseBroccoli,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.pakChoi.name,
				description: CATALOG_I18N_KEYS.species.brassicas.pakChoi.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_pakChoi,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.brassicas.canola.name,
				description: CATALOG_I18N_KEYS.species.brassicas.canola.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.species_brassicas_canola,
			},
		},
	],
	legumes: [
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.pea.name,
				description: CATALOG_I18N_KEYS.species.legumes.pea.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_pea,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.snapPea.name,
				description: CATALOG_I18N_KEYS.species.legumes.snapPea.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_snapPea,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.snowPea.name,
				description: CATALOG_I18N_KEYS.species.legumes.snowPea.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_snowPea,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.greenBean.name,
				description: CATALOG_I18N_KEYS.species.legumes.greenBean.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_greenBean,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.runnerBean.name,
				description: CATALOG_I18N_KEYS.species.legumes.runnerBean.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_runnerBean,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.limaBean.name,
				description: CATALOG_I18N_KEYS.species.legumes.limaBean.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_limaBean,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.favaBean.name,
				description: CATALOG_I18N_KEYS.species.legumes.favaBean.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_favaBean,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.chickpea.name,
				description: CATALOG_I18N_KEYS.species.legumes.chickpea.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_chickpea,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.lentil.name,
				description: CATALOG_I18N_KEYS.species.legumes.lentil.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_lentil,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.soybean.name,
				description: CATALOG_I18N_KEYS.species.legumes.soybean.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_soybean,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.peanut.name,
				description: CATALOG_I18N_KEYS.species.legumes.peanut.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_peanut,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.cowpea.name,
				description: CATALOG_I18N_KEYS.species.legumes.cowpea.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_cowpea,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.pigeonPea.name,
				description: CATALOG_I18N_KEYS.species.legumes.pigeonPea.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_pigeonPea,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.blackEyedPea.name,
				description: CATALOG_I18N_KEYS.species.legumes.blackEyedPea.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_blackEyedPea,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.adzukiBean.name,
				description: CATALOG_I18N_KEYS.species.legumes.adzukiBean.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_adzukiBean,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.mungBean.name,
				description: CATALOG_I18N_KEYS.species.legumes.mungBean.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_mungBean,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.kidneyBean.name,
				description: CATALOG_I18N_KEYS.species.legumes.kidneyBean.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_kidneyBean,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.navyBean.name,
				description: CATALOG_I18N_KEYS.species.legumes.navyBean.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_navyBean,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.pintoBean.name,
				description: CATALOG_I18N_KEYS.species.legumes.pintoBean.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_pintoBean,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.legumes.borlottiBean.name,
				description: CATALOG_I18N_KEYS.species.legumes.borlottiBean.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.species_legumes_borlottiBean,
			},
		},
	],
	rootCrops: [
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.carrot.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.carrot.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_carrot,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.beet.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.beet.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_beet,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.radish.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.radish.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_radish,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.parsnip.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.parsnip.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_parsnip,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.turnipRoot.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.turnipRoot.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_turnipRoot,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.celeriac.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.celeriac.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_celeriac,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.salsify.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.salsify.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_salsify,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.scorzonera.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.scorzonera.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_scorzonera,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.yacon.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.yacon.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_yacon,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.jicama.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.jicama.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_jicama,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.burdock.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.burdock.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_burdock,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.skirret.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.skirret.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_skirret,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.cassava.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.cassava.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_cassava,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.taro.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.taro.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_taro,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.yam.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.yam.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_yam,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.ginger.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.ginger.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_ginger,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.turmeric.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.turmeric.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_turmeric,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.horseradishRoot.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.horseradishRoot.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_horseradishRoot,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.daikonRoot.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.daikonRoot.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_daikonRoot,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.rootCrops.rutabagaRoot.name,
				description: CATALOG_I18N_KEYS.species.rootCrops.rutabagaRoot.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.species_rootCrops_rutabagaRoot,
			},
		},
	],
	flowers: [
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.marigold.name,
				description: CATALOG_I18N_KEYS.species.flowers.marigold.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_marigold,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.nasturtium.name,
				description: CATALOG_I18N_KEYS.species.flowers.nasturtium.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_nasturtium,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.calendula.name,
				description: CATALOG_I18N_KEYS.species.flowers.calendula.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_calendula,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.borage.name,
				description: CATALOG_I18N_KEYS.species.flowers.borage.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_borage,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.chamomile.name,
				description: CATALOG_I18N_KEYS.species.flowers.chamomile.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_chamomile,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.sunflower.name,
				description: CATALOG_I18N_KEYS.species.flowers.sunflower.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_sunflower,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.zinnia.name,
				description: CATALOG_I18N_KEYS.species.flowers.zinnia.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_zinnia,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.cosmos.name,
				description: CATALOG_I18N_KEYS.species.flowers.cosmos.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_cosmos,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.lavenderFlower.name,
				description: CATALOG_I18N_KEYS.species.flowers.lavenderFlower.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_lavenderFlower,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.echinacea.name,
				description: CATALOG_I18N_KEYS.species.flowers.echinacea.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_echinacea,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.yarrow.name,
				description: CATALOG_I18N_KEYS.species.flowers.yarrow.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_yarrow,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.alyssum.name,
				description: CATALOG_I18N_KEYS.species.flowers.alyssum.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_alyssum,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.phacelia.name,
				description: CATALOG_I18N_KEYS.species.flowers.phacelia.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_phacelia,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.cornflower.name,
				description: CATALOG_I18N_KEYS.species.flowers.cornflower.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_cornflower,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.dahlia.name,
				description: CATALOG_I18N_KEYS.species.flowers.dahlia.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_dahlia,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.pansy.name,
				description: CATALOG_I18N_KEYS.species.flowers.pansy.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_pansy,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.viola.name,
				description: CATALOG_I18N_KEYS.species.flowers.viola.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_viola,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.snapdragon.name,
				description: CATALOG_I18N_KEYS.species.flowers.snapdragon.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_snapdragon,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.sweetPeaFlower.name,
				description: CATALOG_I18N_KEYS.species.flowers.sweetPeaFlower.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_sweetPeaFlower,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.flowers.beeBalm.name,
				description: CATALOG_I18N_KEYS.species.flowers.beeBalm.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.species_flowers_beeBalm,
			},
		},
	],
	microgreens: [
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.broccoliMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.broccoliMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_broccoliMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.radishMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.radishMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_radishMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.sunflowerMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.sunflowerMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_sunflowerMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.peaMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.peaMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_peaMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.mustardMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.mustardMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_mustardMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.arugulaMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.arugulaMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_arugulaMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.kaleMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.kaleMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_kaleMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.cabbageMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.cabbageMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_cabbageMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.beetMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.beetMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_beetMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.basilMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.basilMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_basilMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.cilantroMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.cilantroMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_cilantroMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.amaranthMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.amaranthMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_amaranthMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.pakChoiMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.pakChoiMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_pakChoiMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.turnipMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.turnipMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_turnipMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.chiaMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.chiaMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_chiaMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.flaxMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.flaxMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_flaxMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.fennelMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.fennelMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_fennelMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.dillMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.dillMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_dillMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.shisoMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.shisoMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_shisoMicrogreen,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.microgreens.watercressMicrogreen.name,
				description: CATALOG_I18N_KEYS.species.microgreens.watercressMicrogreen.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.species_microgreens_watercressMicrogreen,
			},
		},
	],
	coverCrops: [
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.whiteClover.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.whiteClover.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_whiteClover,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.redClover.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.redClover.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_redClover,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.alfalfa.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.alfalfa.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_alfalfa,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.rye.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.rye.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_rye,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.winterWheat.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.winterWheat.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_winterWheat,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.buckwheat.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.buckwheat.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_buckwheat,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.hairyVetch.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.hairyVetch.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_hairyVetch,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.fieldPea.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.fieldPea.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_fieldPea,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.oat.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.oat.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_oat,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.barley.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.barley.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_barley,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.mustardCover.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.mustardCover.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_mustardCover,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.daikonCover.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.daikonCover.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_daikonCover,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.sorghumSudangrass.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.sorghumSudangrass.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_sorghumSudangrass,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.sunnHemp.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.sunnHemp.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_sunnHemp,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.phaceliaCover.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.phaceliaCover.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_phaceliaCover,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.annualRyegrass.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.annualRyegrass.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_annualRyegrass,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.cowpeaCover.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.cowpeaCover.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_cowpeaCover,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.crimsonClover.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.crimsonClover.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_crimsonClover,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.lablab.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.lablab.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_lablab,
			},
		},
		{
			characteristics: {
				name: CATALOG_I18N_KEYS.species.coverCrops.fabaBeanCover.name,
				description: CATALOG_I18N_KEYS.species.coverCrops.fabaBeanCover.description,
			},
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.species_coverCrops_fabaBeanCover,
			},
		},
	],
};

function buildDefaultSpecies() {
	type CategorySlug = CategorySlugEnum;
	return (
		Object.entries(DEFAULT_SPECIES_BY_CATEGORY) as [
			CategorySlug,
			(typeof DEFAULT_SPECIES_BY_CATEGORY)[CategorySlug],
		][]
	).flatMap(([categorySlug, species]) =>
		species.map((speciesRow) => ({
			categorySlug,
			characteristics: speciesRow.characteristics,
			presentation: speciesRow.presentation,
		})),
	);
}

export const DEFAULT_CATALOG = defineDefaultCatalog({
	categories: [
		{
			slug: "vegetables",
			title: CATALOG_I18N_KEYS.categories.vegetables.title,
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.vegetables,
				iconKey: ItemPresentationIconKey.category_vegetables,
			},
		},
		{
			slug: "herbs",
			title: CATALOG_I18N_KEYS.categories.herbs.title,
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.herbs,
				iconKey: ItemPresentationIconKey.category_herbs,
			},
		},
		{
			slug: "fruits",
			title: CATALOG_I18N_KEYS.categories.fruits.title,
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.fruits,
				iconKey: ItemPresentationIconKey.category_fruits,
			},
		},
		{
			slug: "berries",
			title: CATALOG_I18N_KEYS.categories.berries.title,
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.berries,
				iconKey: ItemPresentationIconKey.category_berries,
			},
		},
		{
			slug: "leafyGreens",
			title: CATALOG_I18N_KEYS.categories.leafyGreens.title,
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.leafyGreens,
				iconKey: ItemPresentationIconKey.category_leafyGreens,
			},
		},
		{
			slug: "alliums",
			title: CATALOG_I18N_KEYS.categories.alliums.title,
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.alliums,
				iconKey: ItemPresentationIconKey.category_alliums,
			},
		},
		{
			slug: "brassicas",
			title: CATALOG_I18N_KEYS.categories.brassicas.title,
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.brassicas,
				iconKey: ItemPresentationIconKey.category_brassicas,
			},
		},
		{
			slug: "legumes",
			title: CATALOG_I18N_KEYS.categories.legumes.title,
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.legumes,
				iconKey: ItemPresentationIconKey.category_legumes,
			},
		},
		{
			slug: "rootCrops",
			title: CATALOG_I18N_KEYS.categories.rootCrops.title,
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.rootCrops,
				iconKey: ItemPresentationIconKey.category_rootCrops,
			},
		},
		{
			slug: "flowers",
			title: CATALOG_I18N_KEYS.categories.flowers.title,
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.flowers,
				iconKey: ItemPresentationIconKey.category_flowers,
			},
		},
		{
			slug: "microgreens",
			title: CATALOG_I18N_KEYS.categories.microgreens.title,
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.microgreens,
				iconKey: ItemPresentationIconKey.category_microgreens,
			},
		},
		{
			slug: "coverCrops",
			title: CATALOG_I18N_KEYS.categories.coverCrops.title,
			presentation: {
				...DEFAULT_CATEGORY_PRESENTATION.coverCrops,
				iconKey: ItemPresentationIconKey.category_coverCrops,
			},
		},
	],
	species: buildDefaultSpecies(),
});

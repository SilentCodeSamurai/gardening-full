export { DEFAULT_CLASS_NAMES, DEFAULT_LABELS } from "./spatial-layout-editor.defaults";

export type {
	SpatialAutoLayoutMode,
	SpatialLayoutCreateOption,
	SpatialLayoutEditorClassNames,
	SpatialLayoutEditorHistoryBuiltinDisabled,
	SpatialLayoutEditorHistoryBuiltinEnabled,
	SpatialLayoutEditorHistoryOptions,
	SpatialLayoutEditorLabels,
	SpatialLayoutEditorProps,
	SpatialGeometry,
	SpatialLayoutNode,
	SpatialLayoutNodeContextActionSlices,
	SpatialLayoutNodeVisualState,
	SpatialLayoutNodeSnapshot,
	SpatialLayoutOperation,
	SpatialLayoutPersistKind,
	SpatialLayoutPlacementCandidate,
	SpatialLayoutRootVisualState,
	SpatialLayoutViewportState,
} from "./spatial-layout-editor.types";
export type { SpatialLayoutHistoryApi } from "./spatial-layout-editor.history";

export { SpatialLayoutEditor } from "./spatial-layout-editor";
export { useSpatialLayoutHistory } from "./use-spatial-layout-editor-history";

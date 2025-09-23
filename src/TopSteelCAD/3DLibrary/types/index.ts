// Barrel export file for 3DLibrary types

// Export everything from profile.types
export {
  MaterialType,
  ProfileType
} from './profile.types';

export type {
  ProfileDimensions,
  ProfileProperties,
  ProfileInertia,
  ProfileElasticModulus,
  ProfilePlasticModulus,
  ProfileRadiusOfGyration,
  SectionProperties,
  ProfileResistance,
  SteelProfile,
  ProfileFilter,
  ProfileCalculation,
  ProfileMap,
  ProfileIndex,
  ProfileSearchResult
} from './profile.types';

// Note: SteelGrade is exported from material-types as an enum

// Export from other type files as needed
export * from './camera.types';
export * from './enums';
// Re-export specific items from material-types to avoid conflicts
export {
  SteelGrade,
  type MaterialProperties
} from './material-types';
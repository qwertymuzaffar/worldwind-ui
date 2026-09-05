// NASA WorldWind ships no TypeScript declarations. This ambient declaration lets
// worldwind-kit import the UMD bundle; the real, documented typing lives in
// ../worldwind-types.ts and is applied by loadWorldWind().
declare module '@nasaworldwind/worldwind' {
  const WorldWind: unknown;
  export default WorldWind;
}

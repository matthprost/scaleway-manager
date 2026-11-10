import { sizes, spacing } from '../tokens';

// Where the floating tab bar sits and how much room screens must leave under it.
export function tabBarLayout(insetBottom: number): {
  bottom: number;
  height: number;
  clearance: number;
} {
  const bottom = Math.max(insetBottom, sizes.tabBarMinBottom);
  const height = sizes.tabBarHeight;

  return { bottom, height, clearance: bottom + height + spacing.md };
}

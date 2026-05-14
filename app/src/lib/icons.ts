import {
  User,
  Users,
  Briefcase,
  Building2,
  Home,
  Heart,
  PiggyBank,
  Wallet,
  CreditCard,
  Landmark,
  Store,
  Factory,
  Rocket,
  Star,
  Crown,
  Banknote,
  HandCoins,
  Coins,
  TrendingUp,
  Anchor,
  LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  user: User,
  users: Users,
  briefcase: Briefcase,
  building: Building2,
  home: Home,
  heart: Heart,
  piggybank: PiggyBank,
  wallet: Wallet,
  creditcard: CreditCard,
  landmark: Landmark,
  store: Store,
  factory: Factory,
  rocket: Rocket,
  star: Star,
  crown: Crown,
  banknote: Banknote,
  handcoins: HandCoins,
  coins: Coins,
  trendingup: TrendingUp,
  anchor: Anchor,
};

export const ICON_KEYS = Object.keys(ICON_MAP);

export function getIcon(name: string | undefined | null): LucideIcon {
  if (!name) return User;
  return ICON_MAP[name] || User;
}

import {
  Activity,
  Bath,
  Bed,
  Bike,
  BookOpen,
  Brain,
  BrushCleaning,
  Calendar,
  Camera,
  Car,
  Coffee,
  CookingPot,
  Dog,
  Droplets,
  Dumbbell,
  Flower2,
  Footprints,
  Fuel,
  Gauge,
  Heart,
  House,
  Laptop,
  Leaf,
  Moon,
  Package,
  Phone,
  Pill,
  Receipt,
  Recycle,
  Refrigerator,
  Shirt,
  ShoppingCart,
  Sparkles,
  SprayCan,
  Sprout,
  Stethoscope,
  Sun,
  Trash2,
  User,
  Wallet,
  WashingMachine,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { IconKey } from "@/domain/icons";

const ICONS: Record<IconKey, LucideIcon> = {
  home: House,
  dumbbell: Dumbbell,
  "shopping-cart": ShoppingCart,
  trash: Trash2,
  heart: Heart,
  wrench: Wrench,
  car: Car,
  leaf: Leaf,
  wallet: Wallet,
  user: User,
  sparkles: Sparkles,
  "spray-can": SprayCan,
  brush: BrushCleaning,
  bed: Bed,
  shirt: Shirt,
  bath: Bath,
  "cooking-pot": CookingPot,
  refrigerator: Refrigerator,
  "washing-machine": WashingMachine,
  coffee: Coffee,
  droplets: Droplets,
  recycle: Recycle,
  package: Package,
  footprints: Footprints,
  bike: Bike,
  activity: Activity,
  book: BookOpen,
  pill: Pill,
  stethoscope: Stethoscope,
  gauge: Gauge,
  fuel: Fuel,
  flower: Flower2,
  sprout: Sprout,
  receipt: Receipt,
  calendar: Calendar,
  phone: Phone,
  laptop: Laptop,
  camera: Camera,
  dog: Dog,
  sun: Sun,
  moon: Moon,
  brain: Brain,
};

export function AppIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name as IconKey] ?? Calendar;
  return <Icon aria-hidden {...props} />;
}

/** Rounded icon tile used in cards and lists. */
export function IconTile({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-foreground ${className}`}
    >
      <AppIcon name={name} className="size-5" />
    </span>
  );
}

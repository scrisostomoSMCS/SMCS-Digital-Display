import {
  BabyIcon,
  BasketIcon,
  BedIcon,
  BrainIcon,
  BriefcaseIcon,
  BusIcon,
  DesktopIcon,
  EnvelopeIcon,
  FirstAidKitIcon,
  ForkKnifeIcon,
  GraduationCapIcon,
  HandCoinsIcon,
  HandHeartIcon,
  HouseIcon,
  IdentificationCardIcon,
  InfoIcon,
  LifebuoyIcon,
  MedalIcon,
  PawPrintIcon,
  PhoneIcon,
  PillIcon,
  ScalesIcon,
  ShowerIcon,
  StethoscopeIcon,
  SyringeIcon,
  TShirtIcon,
  ToothIcon,
  TranslateIcon,
  UsersThreeIcon,
  WashingMachineIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { ResourceIconKey } from "@/lib/resourceCard";

/*
  The Phosphor icon drawn for each resource-card icon key (keys and their
  editor labels live in lib/resourceCard). Imported from the /ssr entry, which
  needs no IconContext provider, so the same components work in the client
  display and in the editor's dropdown preview. Pass weight="bold" on the wall
  display: the regular stroke thins out from across a room.
*/
export const RESOURCE_ICON_COMPONENTS: Record<ResourceIconKey, Icon> = {
  info: InfoIcon,
  phone: PhoneIcon,
  food: ForkKnifeIcon,
  pantry: BasketIcon,
  medical: StethoscopeIcon,
  "first-aid": FirstAidKitIcon,
  dental: ToothIcon,
  pharmacy: PillIcon,
  vaccine: SyringeIcon,
  "mental-health": BrainIcon,
  recovery: LifebuoyIcon,
  shower: ShowerIcon,
  laundry: WashingMachineIcon,
  clothing: TShirtIcon,
  housing: HouseIcon,
  shelter: BedIcon,
  transport: BusIcon,
  jobs: BriefcaseIcon,
  education: GraduationCapIcon,
  legal: ScalesIcon,
  id: IdentificationCardIcon,
  mail: EnvelopeIcon,
  money: HandCoinsIcon,
  computer: DesktopIcon,
  family: UsersThreeIcon,
  baby: BabyIcon,
  veterans: MedalIcon,
  pets: PawPrintIcon,
  language: TranslateIcon,
  outreach: HandHeartIcon,
};

// Falls back to the default icon for a key the parser has not normalized.
export const resourceIcon = (key: ResourceIconKey): Icon =>
  RESOURCE_ICON_COMPONENTS[key] ?? InfoIcon;

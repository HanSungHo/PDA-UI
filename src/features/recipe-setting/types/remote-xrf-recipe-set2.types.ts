export interface DropdownOption {
  label: string;
  value: string;
}

export interface RemoteXrfRecipe2Result {
  PRODEQP: string;
  SAMPLE: string;
  PARA: string;
  RECIPE: string;
  SLOT: string;
}

export interface RemoteXrfRecipe2Props {
  slot?: string;
}

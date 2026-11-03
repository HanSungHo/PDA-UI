import type { DropdownOption } from '../types/remote-xrf-recipe-set2.types';

const ITEM_NAME = '2016 LINE-SPT,2010_계측기';
const EQP_NAME = '4M12-03';
const SAMPLE_NAME =
  'MDS SAMPLE,THK Al 40000,THK Al 5000 350C25,THK Al 5000 350C50,THK Al 5000 400C35,THK Al 8400 350C25,THK Al 8500 350C35,BPSG B-α보정/BPSG P-α보정,BPSG B농도/BPSG P농도,BPSG B농도-Low/BPSG P농도-Low,Al 두께,Al40 두께,CVD-TiN 두께,IMP-Ti 두께,Ti 두께,TiN 두께,W NC,W 두께,WSiX,Al α보정,Al40 α보정,CVD-TiN α보정,IMP-Ti α보정,Ti α보정,TiN α보정,W NC α보정,W α보정,WSiX α보정';
const PARA_NAME = 'CH2,CH3,CH4,NONE,THICKNESS';

const toOptions = (raw: string): DropdownOption[] =>
  raw.split(',').map((item) => ({
    label: item,
    value: item,
  }));

export const remoteXrfRecipe2Service = {
  getItemList: (): DropdownOption[] => toOptions(ITEM_NAME),
  getEqpList: (): DropdownOption[] => toOptions(EQP_NAME),
  getSampleList: (): DropdownOption[] => toOptions(SAMPLE_NAME),
  getParaList: (): DropdownOption[] => toOptions(PARA_NAME),
};

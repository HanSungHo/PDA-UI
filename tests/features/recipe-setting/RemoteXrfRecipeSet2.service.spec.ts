import { describe, expect, it } from 'vitest';

import { remoteXrfRecipe2Service } from '~/features/recipe-setting/services/remote-xrf-recipe-set2.service';

describe('remoteXrfRecipe2Service', () => {
  it('should return item options correctly', () => {
    const items = remoteXrfRecipe2Service.getItemList();
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ label: '2016 LINE-SPT', value: '2016 LINE-SPT' });
    expect(items[1]).toEqual({ label: '2010_계측기', value: '2010_계측기' });
  });

  it('should return equipment options correctly', () => {
    const eqps = remoteXrfRecipe2Service.getEqpList();
    expect(eqps).toHaveLength(1);
    expect(eqps[0]).toEqual({ label: '4M12-03', value: '4M12-03' });
  });

  it('should return sample options correctly', () => {
    const samples = remoteXrfRecipe2Service.getSampleList();
    expect(samples).toHaveLength(28);
    expect(samples[0]).toEqual({ label: 'MDS SAMPLE', value: 'MDS SAMPLE' });
  });

  it('should return parameter options correctly', () => {
    const paras = remoteXrfRecipe2Service.getParaList();
    expect(paras).toHaveLength(5);
    expect(paras.map((p) => p.value)).toEqual(['CH2', 'CH3', 'CH4', 'NONE', 'THICKNESS']);
  });
});

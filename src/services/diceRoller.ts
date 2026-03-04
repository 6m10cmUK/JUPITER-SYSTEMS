import type { DiceResult } from '../types/adrastea.types';

let loaderInstance: any = null;

async function getLoader() {
  if (loaderInstance) return loaderInstance;
  const { DynamicLoader } = await import('bcdice');
  loaderInstance = new DynamicLoader();
  return loaderInstance;
}

export async function rollDice(
  input: string,
  gameSystem: string = 'DiceBot',
): Promise<DiceResult | null> {
  const loader = await getLoader();
  const GameSystem = await loader.dynamicLoad(gameSystem);
  const result = GameSystem.eval(input);

  if (!result) return null;

  return {
    text: result.text,
    success: result.success,
    result: input,
    isSecret: result.secret,
  };
}

export async function getAvailableSystems(): Promise<
  { id: string; name: string }[]
> {
  const loader = await getLoader();
  return loader
    .listAvailableGameSystems()
    .map((info: any) => ({ id: info.id, name: info.name }));
}

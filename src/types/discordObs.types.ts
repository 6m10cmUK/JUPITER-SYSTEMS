export interface AnimationSettings {
  bounce: { enabled: boolean; distance: number };
  border: { enabled: boolean; thickness: number };
  duration: number;
}

export interface GeneralSettings {
  hideNames: boolean;
  hideOtherUsers: boolean;
  transparentBackground: boolean;
  maxImageWidth: number;
  maxImageHeight: number;
  borderRadius: number;
  dimWhenNotSpeaking: boolean;
  hideWhenNotSpeaking: boolean;
  showDefaultImage: boolean;
}

export const USER_CANDIDATES = [
  { name: 'みけ', id: '295100509042245632' },
  { name: '吉岡', id: '382146290206638081' },
  { name: 'ユピ', id: '320897851515207681' },
  { name: 'C太', id: '447750795740315649' },
  { name: 'gale', id: '499987801220317214' },
  { name: 'タケイ', id: '407153865763323915' },
  { name: 'あみ', id: '772707009925087262' },
  { name: 'いもうと', id: '775641372970844160' },
  { name: 'ふみしぐれ', id: '514765307022278663' },
  { name: '姉ちゃん', id: '772666013552476180' },
  { name: '漸化式', id: '706032740637868112' },
  { name: '虚無', id: '468353532005974017' },
];

export const DEFAULT_ANIMATION_SETTINGS: AnimationSettings = {
  bounce: { enabled: true, distance: 15 },
  border: { enabled: false, thickness: 10 },
  duration: 666,
};

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  hideNames: true,
  hideOtherUsers: true,
  transparentBackground: true,
  maxImageWidth: 800,
  maxImageHeight: 600,
  borderRadius: 0,
  dimWhenNotSpeaking: true,
  hideWhenNotSpeaking: false,
  showDefaultImage: false,
};

function make8Ring(prefix) {
  return [
    { deg: 0,   src: `/assets/dogs/${prefix}_0.jpg`,   flip: false },
    { deg: 45,  src: `/assets/dogs/${prefix}_45.jpg`,  flip: false },
    { deg: 90,  src: `/assets/dogs/${prefix}_90.jpg`,  flip: false },
    { deg: 135, src: `/assets/dogs/${prefix}_135.jpg`, flip: false },
    { deg: 180, src: `/assets/dogs/${prefix}_180.jpg`, flip: false },
    { deg: 225, src: `/assets/dogs/${prefix}_135.jpg`, flip: true  },
    { deg: 270, src: `/assets/dogs/${prefix}_90.jpg`,  flip: true  },
    { deg: 315, src: `/assets/dogs/${prefix}_45.jpg`,  flip: true  }
  ];
}

const SHIBA_RING = [
  { deg: 0,   src: '/assets/dogs/shiba_0.jpg',   flip: false },
  { deg: 30,  src: '/assets/dogs/shiba_30.jpg',  flip: false },
  { deg: 60,  src: '/assets/dogs/shiba_60.jpg',  flip: false },
  { deg: 90,  src: '/assets/dogs/shiba_90.jpg',  flip: false },
  { deg: 120, src: '/assets/dogs/shiba_120.jpg', flip: false },
  { deg: 150, src: '/assets/dogs/shiba_150.jpg', flip: false },
  { deg: 180, src: '/assets/dogs/shiba_180.jpg', flip: false },
  { deg: 210, src: '/assets/dogs/shiba_150.jpg', flip: true  },
  { deg: 240, src: '/assets/dogs/shiba_120.jpg', flip: true  },
  { deg: 270, src: '/assets/dogs/shiba_90.jpg',  flip: true  },
  { deg: 300, src: '/assets/dogs/shiba_60.jpg',  flip: true  },
  { deg: 330, src: '/assets/dogs/shiba_30.jpg',  flip: true  }
];

const BUILTIN_KEYS = ['shiba', 'corgi', 'golden', 'samoyed', 'labrador', 'chow', 'husky'];

const BREEDS = {
  shiba: {
    name: '柴犬',
    ring: SHIBA_RING,
    top45Src: '/assets/dogs/shiba_top45.jpg',
    top90Src: '/assets/dogs/shiba_top90.jpg',
    bot45Src: '/assets/dogs/shiba_bot45.jpg',
    bot90Src: '/assets/dogs/shiba_bot90.jpg',
    tailRootU: 0.62, tailEndU: 0.77, tailYNorm: 0.28, barkPitch: 420
  },
  corgi: {
    name: '柯基',
    ring: make8Ring('corgi'),
    top90Src: '/assets/dogs/corgi_top90.jpg',
    bot90Src: '/assets/dogs/corgi_bot90.jpg',
    tailRootU: 0.77, tailEndU: 0.90, tailYNorm: 0.62, barkPitch: 520
  },
  golden: {
    name: '金毛',
    ring: make8Ring('golden'),
    top90Src: '/assets/dogs/golden_top90.jpg',
    bot90Src: '/assets/dogs/golden_bot90.jpg',
    tailRootU: 0.68, tailEndU: 0.94, tailYNorm: 0.45, barkPitch: 310
  },
  samoyed: {
    name: '萨摩耶',
    ring: make8Ring('samoyed'),
    top90Src: '/assets/dogs/samoyed_top90.jpg',
    bot90Src: '/assets/dogs/samoyed_bot90.jpg',
    tailRootU: 0.58, tailEndU: 0.79, tailYNorm: 0.26, barkPitch: 370
  },
  labrador: {
    name: '拉布拉多',
    ring: make8Ring('labrador'),
    top90Src: '/assets/dogs/labrador_top90.jpg',
    bot90Src: '/assets/dogs/labrador_bot90.jpg',
    tailRootU: 0.72, tailEndU: 0.89, tailYNorm: 0.48, barkPitch: 300
  },
  chow: {
    name: '松狮',
    ring: make8Ring('chow'),
    top90Src: '/assets/dogs/chow_top90.jpg',
    bot90Src: '/assets/dogs/chow_bot90.jpg',
    tailRootU: 0.58, tailEndU: 0.78, tailYNorm: 0.25, barkPitch: 260
  },
  husky: {
    name: '哈士奇',
    ring: make8Ring('husky'),
    top90Src: '/assets/dogs/husky_top90.jpg',
    bot90Src: '/assets/dogs/husky_bot90.jpg',
    tailRootU: 0.70, tailEndU: 0.85, tailYNorm: 0.56, barkPitch: 360
  }
};

function registerCustomPet(cp) {
  BREEDS[cp.id] = {
    name: cp.name,
    isCustom: true,
    ring: [
      { deg: 0,   src: cp.src, flip: false },
      { deg: 45,  src: cp.src, flip: false },
      { deg: 90,  src: cp.src, flip: false },
      { deg: 135, src: cp.src, flip: false },
      { deg: 180, src: cp.src, flip: false },
      { deg: 225, src: cp.src, flip: true  },
      { deg: 270, src: cp.src, flip: true  },
      { deg: 315, src: cp.src, flip: true  }
    ],
    top90Src: cp.src,
    bot90Src: cp.src,
    tailRootU: 0.66, tailEndU: 0.86, tailYNorm: 0.42, barkPitch: cp.barkPitch || 400
  };
}

module.exports = { BREEDS, BUILTIN_KEYS, registerCustomPet };

export type MeasureTypeValue = 'reps_weight' | 'reps' | 'time';

export const muscleGroups = [
  { slug: 'chest', nameAz: 'Sinə', nameEn: 'Chest' },
  { slug: 'triceps', nameAz: 'Triceps', nameEn: 'Triceps' },
  { slug: 'forearms', nameAz: 'Bilək', nameEn: 'Forearms' },
  { slug: 'shoulders', nameAz: 'Çiyin', nameEn: 'Shoulders' },
  { slug: 'legs', nameAz: 'Ayaq', nameEn: 'Legs' },
  { slug: 'calves', nameAz: 'Baldır', nameEn: 'Calves' },
  { slug: 'traps', nameAz: 'Traps', nameEn: 'Traps' },
  { slug: 'back', nameAz: 'Bel', nameEn: 'Back' },
  { slug: 'biceps', nameAz: 'Biceps', nameEn: 'Biceps' },
  { slug: 'abs', nameAz: 'Qarın', nameEn: 'Abs' },
].map((m) => ({ ...m, mapId: m.slug }));

export const equipment = [
  { slug: 'bodyweight', nameAz: 'Bədən çəkisi', nameEn: 'Bodyweight' },
  { slug: 'dumbbell', nameAz: 'Dumbbell', nameEn: 'Dumbbell' },
  { slug: 'pullup_bar', nameAz: 'Turnik', nameEn: 'Pull-up bar' },
  { slug: 'parallel_bars', nameAz: 'Paralel qol', nameEn: 'Parallel bars' },
  { slug: 'gym', nameAz: 'Zal avadanlığı', nameEn: 'Gym machine' },
];

export interface SeedExercise {
  slug: string;
  nameEn: string;
  nameAz: string;
  primary: string[];
  secondary: string[];
  equipment: string;
  measureType: MeasureTypeValue;
}

export const exercises: SeedExercise[] = [
  {
    slug: 'push-up',
    nameEn: 'Push-Up',
    nameAz: 'Jim',
    primary: ['chest'],
    secondary: ['triceps', 'shoulders'],
    equipment: 'bodyweight',
    measureType: 'reps',
  },
  {
    slug: 'incline-push-up',
    nameEn: 'Incline Push-Up',
    nameAz: 'Incline jim',
    primary: ['chest'],
    secondary: [],
    equipment: 'bodyweight',
    measureType: 'reps',
  },
  {
    slug: 'decline-push-up',
    nameEn: 'Decline Push-Up',
    nameAz: 'Decline jim',
    primary: ['chest'],
    secondary: [],
    equipment: 'bodyweight',
    measureType: 'reps',
  },
  {
    slug: 'diamond-push-up',
    nameEn: 'Diamond Push-Up',
    nameAz: 'Diamond jim',
    primary: ['chest', 'triceps'],
    secondary: [],
    equipment: 'bodyweight',
    measureType: 'reps',
  },
  {
    slug: 'overhead-dumbbell-triceps-extension',
    nameEn: 'Overhead Dumbbell Triceps Extension',
    nameAz: 'Baş üstü dumbbell triceps uzatma',
    primary: ['triceps'],
    secondary: [],
    equipment: 'dumbbell',
    measureType: 'reps_weight',
  },
  {
    slug: 'wrist-curl',
    nameEn: 'Wrist Curl',
    nameAz: 'Bilək bükmə',
    primary: ['forearms'],
    secondary: [],
    equipment: 'dumbbell',
    measureType: 'reps_weight',
  },
  {
    slug: 'wrist-extension',
    nameEn: 'Wrist Extension',
    nameAz: 'Bilək açma',
    primary: ['forearms'],
    secondary: [],
    equipment: 'dumbbell',
    measureType: 'reps_weight',
  },
  {
    slug: 'hammer-curl',
    nameEn: 'Hammer Curl',
    nameAz: 'Hammer curl',
    primary: ['forearms', 'biceps'],
    secondary: [],
    equipment: 'dumbbell',
    measureType: 'reps_weight',
  },
  {
    slug: 'lateral-raise',
    nameEn: 'Lateral Raise',
    nameAz: 'Yana qaldırma',
    primary: ['shoulders'],
    secondary: [],
    equipment: 'dumbbell',
    measureType: 'reps_weight',
  },
  {
    slug: 'dumbbell-squat',
    nameEn: 'Dumbbell Squat',
    nameAz: 'Dumbbell ilə squat (çömbəlmə)',
    primary: ['legs'],
    secondary: [],
    equipment: 'dumbbell',
    measureType: 'reps_weight',
  },
  {
    slug: 'dumbbell-calf-raise',
    nameEn: 'Dumbbell Calf Raise',
    nameAz: 'Dumbbell ilə baldır qaldırma',
    primary: ['calves'],
    secondary: [],
    equipment: 'dumbbell',
    measureType: 'reps_weight',
  },
  {
    slug: 'dip-shrug',
    nameEn: 'Dip Shrug (Scapular Dip)',
    nameAz: 'Dips shrug',
    primary: ['traps'],
    secondary: [],
    equipment: 'parallel_bars',
    measureType: 'reps',
  },
  {
    slug: 'pull-up',
    nameEn: 'Pull-Up',
    nameAz: 'Turnikdə dartınma',
    primary: ['back'],
    secondary: ['biceps'],
    equipment: 'pullup_bar',
    measureType: 'reps',
  },
  {
    slug: 'biceps-curl',
    nameEn: 'Biceps Curl',
    nameAz: 'Biceps curl',
    primary: ['biceps'],
    secondary: [],
    equipment: 'dumbbell',
    measureType: 'reps_weight',
  },
  {
    slug: 'plank',
    nameEn: 'Plank',
    nameAz: 'Plank',
    primary: ['abs'],
    secondary: [],
    equipment: 'bodyweight',
    measureType: 'time',
  },
  {
    slug: 'bent-knee-sit-up',
    nameEn: 'Bent-Knee Sit-Up',
    nameAz: 'Dizi bükülü sit-up',
    primary: ['abs'],
    secondary: [],
    equipment: 'bodyweight',
    measureType: 'reps',
  },
  {
    slug: 'flutter-kicks',
    nameEn: 'Flutter Kicks',
    nameAz: 'Flutter kicks',
    primary: ['abs'],
    secondary: [],
    equipment: 'bodyweight',
    measureType: 'reps',
  },
];

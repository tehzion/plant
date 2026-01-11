import { SourceReference } from '@/types/chat';

export interface TrustedSourceEntry {
  id: string;
  name: string;
  url: string;
  type: 'CDC' | 'NHS' | 'WHO';
  keywords: string[];
  excerpt: string;
  category: 'vaccine' | 'mental-health' | 'general' | 'covid' | 'child-health' | 'nutrition' | 'chronic-disease';
}

export const TRUSTED_SOURCES_DB: TrustedSourceEntry[] = [
  // ==================== VACCINE SAFETY ====================
  {
    id: 'cdc-vaccine-safety',
    name: 'CDC Vaccine Safety',
    url: 'https://www.cdc.gov/vaccine-safety/index.html',
    type: 'CDC',
    keywords: ['vaccine', 'safety', 'side effect', 'adverse', 'reaction', 'immunization', 'shot'],
    excerpt: 'The CDC monitors vaccine safety through various surveillance systems and conducts studies to ensure vaccines continue to be safe.',
    category: 'vaccine'
  },
  {
    id: 'cdc-vaccine-autism',
    name: 'CDC Vaccines Do Not Cause Autism',
    url: 'https://www.cdc.gov/vaccine-safety/about/autism.html',
    type: 'CDC',
    keywords: ['autism', 'vaccine', 'mmr', 'thimerosal', 'mercury', 'developmental'],
    excerpt: 'Many studies have looked at whether there is a link between vaccines and autism spectrum disorder (ASD). None have found such a link.',
    category: 'vaccine'
  },
  {
    id: 'who-immunization',
    name: 'WHO Immunization Overview',
    url: 'https://www.who.int/health-topics/vaccines-and-immunization#tab=tab_1',
    type: 'WHO',
    keywords: ['immunization', 'global', 'herd immunity', 'vaccine', 'coverage', 'preventable'],
    excerpt: 'Immunization prevents 3.5-5 million deaths every year from diseases like diphtheria, tetanus, pertussis, influenza and measles.',
    category: 'vaccine'
  },
  {
    id: 'nhs-vaccine-side-effects',
    name: 'NHS Vaccine Side Effects',
    url: 'https://www.nhs.uk/vaccinations/side-effects/',
    type: 'NHS',
    keywords: ['side effect', 'reaction', 'fever', 'pain', 'swelling', 'vaccine'],
    excerpt: 'Most side effects of vaccination are mild and short-lived, such as a sore arm or mild fever.',
    category: 'vaccine'
  },
  {
    id: 'cdc-hpv-vaccine',
    name: 'CDC HPV Vaccination',
    url: 'https://www.cdc.gov/hpv/vaccines/index.html',
    type: 'CDC',
    keywords: ['hpv', 'human papillomavirus', 'cervical', 'cancer', 'prevention', 'gardasil'],
    excerpt: 'HPV vaccine prevents infection with human papillomavirus types that are associated with many cancers and genital warts.',
    category: 'vaccine'
  },
  {
    id: 'nhs-mmr-vaccine',
    name: 'NHS MMR Vaccine',
    url: 'https://www.nhs.uk/vaccinations/mmr-vaccine/',
    type: 'NHS',
    keywords: ['mmr', 'measles', 'mumps', 'rubella', 'children', 'safety'],
    excerpt: 'The MMR vaccine is a safe and effective combined vaccine that protects against measles, mumps and rubella.',
    category: 'vaccine'
  },

  // ==================== COVID-19 ====================
  {
    id: 'cdc-covid-vaccine',
    name: 'CDC COVID-19 Vaccines',
    url: 'https://www.cdc.gov/covid/vaccines/index.html',
    type: 'CDC',
    keywords: ['covid', 'coronavirus', 'mrna', 'pfizer', 'moderna', 'booster', 'covid-19'],
    excerpt: 'COVID-19 vaccines are safe, effective, and free. They help protect you from getting seriously ill or dying from COVID-19.',
    category: 'covid'
  },
  {
    id: 'who-covid-vaccine',
    name: 'WHO COVID-19 Vaccines',
    url: 'https://www.who.int/news-room/questions-and-answers/item/coronavirus-disease-(covid-19)-vaccines',
    type: 'WHO',
    keywords: ['covid', 'coronavirus', 'pandemic', 'global', 'variant', 'protection'],
    excerpt: 'Safe and effective vaccines are a game-changing tool in the fight against COVID-19.',
    category: 'covid'
  },
  {
    id: 'nhs-covid-vaccine',
    name: 'NHS COVID-19 Vaccination',
    url: 'https://www.nhs.uk/vaccinations/covid-19-vaccines/',
    type: 'NHS',
    keywords: ['covid', 'coronavirus', 'booster', 'nhs', 'uk', 'vaccination'],
    excerpt: 'Find out about COVID-19 vaccines, including who can get them, how to book and what to expect.',
    category: 'covid'
  },
  {
    id: 'cdc-long-covid',
    name: 'CDC Long COVID Information',
    url: 'https://www.cdc.gov/covid/long-term-effects/index.html',
    type: 'CDC',
    keywords: ['long covid', 'post-acute', 'sequelae', 'fatigue', 'brain fog', 'symptoms'],
    excerpt: 'Long COVID is a range of ongoing health problems that can last weeks, months, or years after COVID-19 infection.',
    category: 'covid'
  },

  // ==================== CHILD HEALTH ====================
  {
    id: 'cdc-childhood-vaccines',
    name: 'CDC Childhood Vaccine Schedule',
    url: 'https://www.cdc.gov/vaccines-children/scheduling/index.html',
    type: 'CDC',
    keywords: ['child', 'children', 'baby', 'infant', 'schedule', 'pediatric', 'kid'],
    excerpt: 'The recommended immunization schedule is designed to protect infants and children early in life.',
    category: 'child-health'
  },
  {
    id: 'nhs-childhood-vaccines',
    name: 'NHS Childhood Vaccines',
    url: 'https://www.nhs.uk/vaccinations/nhs-vaccinations-and-when-to-have-them/',
    type: 'NHS',
    keywords: ['child', 'children', 'baby', 'schedule', 'nhs', 'uk', 'infant'],
    excerpt: 'Find out which vaccinations are routinely offered to everyone in the UK and when they should be given.',
    category: 'child-health'
  },
  {
    id: 'cdc-child-development',
    name: 'CDC Child Development',
    url: 'https://www.cdc.gov/child-development/about/index.html',
    type: 'CDC',
    keywords: ['child', 'development', 'milestone', 'growth', 'cognitive', 'motor'],
    excerpt: 'Child development includes the physical, language, thinking and emotional changes that occur from birth through adolescence.',
    category: 'child-health'
  },
  {
    id: 'nhs-child-health',
    name: 'NHS Child Health',
    url: 'https://www.nhs.uk/conditions/baby/',
    type: 'NHS',
    keywords: ['baby', 'infant', 'newborn', 'feeding', 'sleep', 'development'],
    excerpt: 'Information and advice on looking after your baby, including feeding, sleep, development and common health problems.',
    category: 'child-health'
  },
  {
    id: 'who-child-health',
    name: 'WHO Child Health',
    url: 'https://www.who.int/health-topics/child-health#tab=tab_1',
    type: 'WHO',
    keywords: ['child', 'health', 'global', 'infant', 'mortality', 'growth'],
    excerpt: 'Ensuring the health of children is crucial for their development and for achieving sustainable development goals.',
    category: 'child-health'
  },

  // ==================== MENTAL HEALTH ====================
  {
    id: 'nhs-mental-health',
    name: 'NHS Mental Health',
    url: 'https://www.nhs.uk/mental-health/',
    type: 'NHS',
    keywords: ['mental', 'health', 'anxiety', 'depression', 'stress', 'wellbeing', 'therapy'],
    excerpt: 'Get advice and support for your mental health, including tips for coping with common problems.',
    category: 'mental-health'
  },
  {
    id: 'who-mental-health',
    name: 'WHO Mental Health',
    url: 'https://www.who.int/health-topics/mental-health#tab=tab_1',
    type: 'WHO',
    keywords: ['mental', 'health', 'depression', 'disorder', 'global', 'wellness'],
    excerpt: 'Mental health is a state of mental well-being that enables people to cope with the stresses of life.',
    category: 'mental-health'
  },
  {
    id: 'cdc-mental-health',
    name: 'CDC Mental Health',
    url: 'https://www.cdc.gov/mental-health/index.html',
    type: 'CDC',
    keywords: ['mental', 'health', 'depression', 'anxiety', 'stress', 'coping'],
    excerpt: 'Mental health includes emotional, psychological, and social well-being and affects how we think, feel, and act.',
    category: 'mental-health'
  },
  {
    id: 'nhs-anxiety',
    name: 'NHS Anxiety Information',
    url: 'https://www.nhs.uk/mental-health/conditions/anxiety/',
    type: 'NHS',
    keywords: ['anxiety', 'worry', 'panic', 'fear', 'nervous', 'stress'],
    excerpt: 'Anxiety is a feeling of unease, such as worry or fear, that can be mild or severe.',
    category: 'mental-health'
  },
  {
    id: 'nhs-depression',
    name: 'NHS Depression Information',
    url: 'https://www.nhs.uk/mental-health/conditions/depression-in-adults/',
    type: 'NHS',
    keywords: ['depression', 'sad', 'mood', 'hopeless', 'treatment', 'therapy'],
    excerpt: 'Depression is more than simply feeling unhappy or fed up for a few days. It causes a persistent feeling of sadness.',
    category: 'mental-health'
  },

  // ==================== NUTRITION ====================
  {
    id: 'who-nutrition',
    name: 'WHO Healthy Diet',
    url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
    type: 'WHO',
    keywords: ['nutrition', 'diet', 'healthy', 'eating', 'food', 'fruit', 'vegetable'],
    excerpt: 'A healthy diet helps protect against malnutrition and noncommunicable diseases including diabetes, heart disease, and cancer.',
    category: 'nutrition'
  },
  {
    id: 'cdc-nutrition',
    name: 'CDC Nutrition Guidelines',
    url: 'https://www.cdc.gov/nutrition/php/about/index.html',
    type: 'CDC',
    keywords: ['nutrition', 'diet', 'vitamin', 'mineral', 'supplement', 'deficiency'],
    excerpt: 'Good nutrition is essential for keeping Americans healthy across the lifespan.',
    category: 'nutrition'
  },
  {
    id: 'nhs-healthy-eating',
    name: 'NHS Healthy Eating',
    url: 'https://www.nhs.uk/live-well/eat-well/',
    type: 'NHS',
    keywords: ['diet', 'eating', 'healthy', 'food', 'nutrition', 'balanced'],
    excerpt: 'Eating a healthy, balanced diet is an important part of maintaining good health.',
    category: 'nutrition'
  },
  {
    id: 'cdc-vitamins',
    name: 'CDC Micronutrient Facts',
    url: 'https://www.cdc.gov/nutrition/micronutrient-malnutrition/index.html',
    type: 'CDC',
    keywords: ['vitamin', 'mineral', 'iron', 'folate', 'deficiency', 'supplement'],
    excerpt: 'Micronutrients are vitamins and minerals needed by the body in very small amounts.',
    category: 'nutrition'
  },

  // ==================== CHRONIC DISEASE ====================
  {
    id: 'cdc-diabetes',
    name: 'CDC Diabetes Prevention',
    url: 'https://www.cdc.gov/diabetes/index.html',
    type: 'CDC',
    keywords: ['diabetes', 'blood sugar', 'glucose', 'insulin', 'type 2', 'prediabetes'],
    excerpt: 'More than 37 million Americans have diabetes, and 1 in 5 of them don\'t know they have it.',
    category: 'chronic-disease'
  },
  {
    id: 'who-cardiovascular',
    name: 'WHO Cardiovascular Disease',
    url: 'https://www.who.int/health-topics/cardiovascular-diseases#tab=tab_1',
    type: 'WHO',
    keywords: ['heart', 'cardiovascular', 'blood pressure', 'hypertension', 'stroke', 'cholesterol'],
    excerpt: 'Cardiovascular diseases are the leading cause of death globally, taking an estimated 17.9 million lives each year.',
    category: 'chronic-disease'
  },
  {
    id: 'nhs-high-blood-pressure',
    name: 'NHS High Blood Pressure',
    url: 'https://www.nhs.uk/conditions/high-blood-pressure-hypertension/',
    type: 'NHS',
    keywords: ['hypertension', 'blood pressure', 'heart', 'cardiovascular', 'treatment'],
    excerpt: 'High blood pressure, or hypertension, rarely has noticeable symptoms but can increase your risk of serious problems.',
    category: 'chronic-disease'
  },
  {
    id: 'cdc-heart-disease',
    name: 'CDC Heart Disease',
    url: 'https://www.cdc.gov/heart-disease/index.html',
    type: 'CDC',
    keywords: ['heart', 'disease', 'cardiovascular', 'attack', 'prevention'],
    excerpt: 'Heart disease is the leading cause of death in the United States.',
    category: 'chronic-disease'
  },
  {
    id: 'nhs-diabetes',
    name: 'NHS Diabetes Information',
    url: 'https://www.nhs.uk/conditions/diabetes/',
    type: 'NHS',
    keywords: ['diabetes', 'type 1', 'type 2', 'blood sugar', 'insulin'],
    excerpt: 'Diabetes is a lifelong condition that causes a person\'s blood sugar level to become too high.',
    category: 'chronic-disease'
  },
  {
    id: 'who-cancer',
    name: 'WHO Cancer Overview',
    url: 'https://www.who.int/health-topics/cancer#tab=tab_1',
    type: 'WHO',
    keywords: ['cancer', 'screening', 'prevention', 'treatment', 'oncology'],
    excerpt: 'Cancer is a leading cause of death worldwide, accounting for nearly 10 million deaths in 2020.',
    category: 'chronic-disease'
  },

  // ==================== GENERAL HEALTH ====================
  {
    id: 'who-health-topics',
    name: 'WHO Health Topics',
    url: 'https://www.who.int/health-topics/',
    type: 'WHO',
    keywords: ['health', 'disease', 'prevention', 'treatment', 'global'],
    excerpt: 'Comprehensive information on health topics from the World Health Organization.',
    category: 'general'
  },
  {
    id: 'cdc-health-info',
    name: 'CDC Health Information',
    url: 'https://www.cdc.gov/health-topics.html',
    type: 'CDC',
    keywords: ['health', 'disease', 'prevention', 'cdc', 'america', 'us'],
    excerpt: 'Reliable health information from the Centers for Disease Control and Prevention.',
    category: 'general'
  },
  {
    id: 'nhs-health-az',
    name: 'NHS Health A-Z',
    url: 'https://www.nhs.uk/conditions/',
    type: 'NHS',
    keywords: ['health', 'conditions', 'symptoms', 'treatment', 'nhs'],
    excerpt: 'Find information about symptoms, diagnosis, and treatment for hundreds of health conditions.',
    category: 'general'
  },
  {
    id: 'cdc-sleep',
    name: 'CDC Sleep and Health',
    url: 'https://www.cdc.gov/sleep/index.html',
    type: 'CDC',
    keywords: ['sleep', 'insomnia', 'rest', 'fatigue', 'circadian', 'hours'],
    excerpt: 'Getting enough sleep is important for people of all ages to stay in good health.',
    category: 'general'
  },
  {
    id: 'nhs-sleep',
    name: 'NHS Sleep Tips',
    url: 'https://www.nhs.uk/live-well/sleep-and-tiredness/',
    type: 'NHS',
    keywords: ['sleep', 'insomnia', 'tired', 'rest', 'bedtime'],
    excerpt: 'Tips and advice to help you sleep better, including causes of insomnia and how to treat it.',
    category: 'general'
  },
  {
    id: 'cdc-hand-hygiene',
    name: 'CDC Hand Hygiene',
    url: 'https://www.cdc.gov/clean-hands/about/index.html',
    type: 'CDC',
    keywords: ['hand', 'washing', 'hygiene', 'infection', 'prevention', 'sanitizer'],
    excerpt: 'Handwashing is one of the best ways to protect yourself and your family from getting sick.',
    category: 'general'
  }
];

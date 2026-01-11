import { SourceReference } from '@/types/chat';

export interface KnowledgeEntry {
  keywords: string[];
  response: string;
  sources: SourceReference[];
  followUpQuestions: string[];
}

export const VACCINE_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    keywords: ['autism', 'autistic', 'cause autism', 'link autism', 'asd'],
    response: `I understand this is a common concern, and it's good that you're seeking accurate information.

There is no scientific link between vaccines and autism. Here are the key facts:

• The original 1998 study claiming a link was retracted and the researcher lost his medical license due to ethical violations and data manipulation

• Multiple studies involving millions of children have found no connection between any vaccine and autism

• Autism signs often become noticeable around the same age children receive vaccines, but timing does not equal causation

• The CDC, NHS, WHO, and major medical organizations worldwide confirm vaccines do not cause autism

Would you like me to explain more about how these studies were conducted, or do you have questions about a specific vaccine?`,
    sources: [
      { id: 's1', name: 'CDC - Vaccine Safety', url: 'https://www.cdc.gov/vaccinesafety/concerns/autism.html', type: 'CDC', relevanceScore: 0.98, excerpt: 'CDC has conducted or funded many studies finding no link between vaccines and autism.' },
      { id: 's2', name: 'NHS - MMR Vaccine', url: 'https://www.nhs.uk/conditions/vaccinations/mmr-vaccine/', type: 'NHS', relevanceScore: 0.95, excerpt: 'There is no evidence of a link between the MMR vaccine and autism.' },
      { id: 's3', name: 'WHO - Vaccines Q&A', url: 'https://www.who.int/news-room/q-a-detail/vaccines-and-immunization-what-is-vaccination', type: 'WHO', relevanceScore: 0.92, excerpt: 'Vaccines are safe and side effects are usually minor, such as a sore arm.' },
    ],
    followUpQuestions: [
      'How was the original autism study debunked?',
      'What does cause autism?',
      'Is the MMR vaccine safe?',
    ],
  },
  {
    keywords: ['ingredient', 'ingredients', 'what\'s in', 'contain', 'aluminum', 'formaldehyde', 'preservative'],
    response: `That's a thoughtful question. Knowing what's in vaccines helps you make informed decisions.

Vaccine ingredients are carefully selected and tested for safety. Here's what they contain:

• Active ingredients (antigens): Weakened or inactivated forms of the virus or bacteria that train your immune system

• Adjuvants (like aluminum salts): Help strengthen your immune response. The amount is tiny—you get more aluminum from food daily

• Preservatives: Keep vaccines free from contamination. Most childhood vaccines no longer contain thimerosal

• Stabilizers: Help vaccines remain effective during storage

• Residual substances: Tiny traces from the manufacturing process, well below any level of concern

Every ingredient is present in very small amounts and has been extensively studied for safety. Would you like to know more about any specific ingredient?`,
    sources: [
      { id: 's4', name: 'CDC - Vaccine Ingredients', url: 'https://www.cdc.gov/vaccines/vac-gen/additives.htm', type: 'CDC', relevanceScore: 0.97, excerpt: 'Vaccine ingredients include antigens, adjuvants, preservatives, and stabilizers—all in very small, safe amounts.' },
      { id: 's5', name: 'NHS - Vaccine Ingredients', url: 'https://www.nhs.uk/conditions/vaccinations/vaccine-ingredients/', type: 'NHS', relevanceScore: 0.94, excerpt: 'The main ingredient of any vaccine is a small amount of bacteria, virus or toxin that has been weakened or destroyed.' },
    ],
    followUpQuestions: [
      'Is aluminum in vaccines safe?',
      'Why was thimerosal removed from most vaccines?',
      'What are adjuvants and why are they needed?',
    ],
  },
  {
    keywords: ['covid', 'coronavirus', 'quickly', 'rushed', 'fast', 'operation warp speed', 'mrna'],
    response: `I understand the concern about speed—it's natural to wonder if anything was skipped. Let me explain what actually happened.

COVID-19 vaccines were developed quickly due to several factors, not by skipping safety steps:

• Unprecedented global collaboration and funding allowed parallel work instead of sequential

• mRNA technology had been researched for over a decade before COVID-19

• Large volunteer pools enabled faster clinical trials with tens of thousands of participants

• Manufacturing began during trials (a financial risk, not a safety risk)

• Regulatory agencies reviewed data on a rolling basis instead of waiting for complete applications

The vaccines went through all three phases of clinical trials. Safety monitoring continues through systems like VAERS, V-safe, and international equivalents.

Would you like to know more about mRNA technology or how vaccine safety is monitored?`,
    sources: [
      { id: 's6', name: 'CDC - COVID-19 Vaccines', url: 'https://www.cdc.gov/coronavirus/2019-ncov/vaccines/different-vaccines.html', type: 'CDC', relevanceScore: 0.96, excerpt: 'COVID-19 vaccines were developed quickly without skipping any steps required to meet safety standards.' },
      { id: 's7', name: 'WHO - COVID Vaccine Development', url: 'https://www.who.int/news-room/feature-stories/detail/the-race-for-a-covid-19-vaccine-explained', type: 'WHO', relevanceScore: 0.93, excerpt: 'The speed of vaccine development was due to unprecedented funding, collaboration, and running phases in parallel.' },
    ],
    followUpQuestions: [
      'How does mRNA technology work?',
      'What are the long-term effects of COVID vaccines?',
      'How is vaccine safety monitored after approval?',
    ],
  },
  {
    keywords: ['side effect', 'side effects', 'reaction', 'reactions', 'adverse', 'risk', 'dangerous'],
    response: `It's wise to understand potential side effects. Here's what the evidence shows.

Common side effects are signs your immune system is responding:

• Pain, redness, or swelling at the injection site
• Fatigue, headache, or muscle aches
• Mild fever or chills
• These typically resolve within 1-3 days

Serious side effects are rare but can occur:

• Severe allergic reactions (anaphylaxis) occur in about 1-2 per million doses and are treatable
• Healthcare providers are trained to handle these reactions
• You're asked to wait 15-30 minutes after vaccination for monitoring

The benefits of vaccination significantly outweigh the risks for the vast majority of people. If you have specific health conditions, discussing with your doctor can help determine what's right for you.`,
    sources: [
      { id: 's8', name: 'CDC - Side Effects', url: 'https://www.cdc.gov/vaccines/vac-gen/side-effects.htm', type: 'CDC', relevanceScore: 0.96, excerpt: 'Most side effects are mild: soreness, fatigue, and low-grade fever. Serious reactions are rare.' },
      { id: 's9', name: 'NHS - Side Effects', url: 'https://www.nhs.uk/conditions/vaccinations/side-effects/', type: 'NHS', relevanceScore: 0.94, excerpt: 'Common side effects last a day or two. Serious side effects are very rare.' },
    ],
    followUpQuestions: [
      'What should I do if I have a reaction?',
      'Who should not get vaccinated?',
      'How do I report a vaccine side effect?',
    ],
  },
  {
    keywords: ['herd immunity', 'community immunity', 'protect others', 'unvaccinated'],
    response: `Great question. Herd immunity is an important concept in public health.

Herd immunity (or community immunity) occurs when enough people are immune to a disease that it can't spread easily:

• When a high percentage of a community is immune, the disease has fewer hosts to spread to

• This protects people who can't be vaccinated, such as newborns, those with certain allergies, or people with weakened immune systems

• The threshold varies by disease—measles requires about 95% immunity, while other diseases need less

• Immunity can come from vaccination or prior infection, though vaccination is safer

Without sufficient vaccination rates, outbreaks can occur even in developed countries. We've seen this with measles outbreaks in communities with lower vaccination rates.`,
    sources: [
      { id: 's10', name: 'WHO - Herd Immunity', url: 'https://www.who.int/news-room/q-a-detail/herd-immunity-lockdowns-and-covid-19', type: 'WHO', relevanceScore: 0.95, excerpt: 'Herd immunity is achieved when a sufficient proportion of a population is immune, reducing spread.' },
      { id: 's11', name: 'CDC - Community Immunity', url: 'https://www.cdc.gov/vaccines/hcp/conversations/understanding-vacc-work.html', type: 'CDC', relevanceScore: 0.92, excerpt: 'Community immunity protects those who cannot be vaccinated by surrounding them with immune individuals.' },
    ],
    followUpQuestions: [
      'What percentage is needed for herd immunity?',
      'Why do some diseases spread even with high vaccination rates?',
      'How do vaccines protect people who can\'t be vaccinated?',
    ],
  },
  {
    keywords: ['schedule', 'when', 'how many', 'too many', 'spacing', 'delay', 'child', 'baby', 'infant'],
    response: `I understand wanting to make the best decisions for your child. Let me explain the vaccine schedule.

The childhood vaccine schedule is carefully designed based on decades of research:

• Vaccines are given when children are most vulnerable to diseases and when their immune systems can respond effectively

• Children's immune systems can handle many antigens—they encounter thousands daily from food, air, and environment

• Delaying vaccines leaves children unprotected during their most vulnerable time

• The schedule is reviewed regularly and updated based on new evidence

• Combination vaccines (like MMR) reduce the number of shots while providing the same protection

If you have concerns, talk to your pediatrician. They can discuss your specific situation and address any worries you might have.`,
    sources: [
      { id: 's12', name: 'CDC - Child Schedule', url: 'https://www.cdc.gov/vaccines/schedules/hcp/imz/child-adolescent.html', type: 'CDC', relevanceScore: 0.97, excerpt: 'The immunization schedule is designed to protect children when they are most vulnerable to diseases.' },
      { id: 's13', name: 'NHS - Vaccination Schedule', url: 'https://www.nhs.uk/conditions/vaccinations/nhs-vaccinations-and-when-to-have-them/', type: 'NHS', relevanceScore: 0.95, excerpt: 'The NHS vaccination schedule shows which vaccines your child needs and when they should have them.' },
    ],
    followUpQuestions: [
      'Can vaccines be spread out?',
      'What if my child misses a vaccine?',
      'Why are some vaccines given so early?',
    ],
  },
  {
    keywords: ['mmr', 'measles', 'mumps', 'rubella'],
    response: `The MMR vaccine has been used safely for decades. Here's what the evidence shows.

About the MMR vaccine:

• It protects against three serious diseases: measles, mumps, and rubella

• Given in two doses, usually at 12-15 months and 4-6 years

• Over 500 million doses have been given worldwide since 1971

• Common side effects include mild fever and rash, which resolve quickly

The claim linking MMR to autism has been thoroughly investigated and disproven:

• The original 1998 study was retracted for fraud
• Multiple studies with millions of children found no link
• Countries that temporarily stopped or reduced MMR vaccination saw measles outbreaks

Measles can cause serious complications including brain damage and death. The vaccine is much safer than the disease.`,
    sources: [
      { id: 's14', name: 'CDC - MMR Vaccine', url: 'https://www.cdc.gov/vaccines/hcp/vis/vis-statements/mmr.html', type: 'CDC', relevanceScore: 0.97, excerpt: 'MMR vaccine protects against measles, mumps, and rubella with two doses for lasting immunity.' },
      { id: 's15', name: 'NHS - MMR Vaccine', url: 'https://www.nhs.uk/conditions/vaccinations/mmr-vaccine/', type: 'NHS', relevanceScore: 0.96, excerpt: 'The MMR vaccine is a safe and effective combined vaccine that protects against 3 separate illnesses.' },
    ],
    followUpQuestions: [
      'What are the symptoms of measles?',
      'Can adults get the MMR vaccine?',
      'What if my child has an egg allergy?',
    ],
  },
  {
    keywords: ['thimerosal', 'mercury', 'thiomersal'],
    response: `I understand concerns about mercury. Let me clarify what the science shows.

About thimerosal and mercury:

• Thimerosal is a preservative that contains ethylmercury, not the harmful methylmercury found in some fish

• Ethylmercury is processed and eliminated by the body much faster than methylmercury

• As a precaution, thimerosal was removed from most childhood vaccines in the US by 2001

• Studies before and after removal showed no difference in autism rates, confirming there was no link

• Some multi-dose flu vaccines still contain thimerosal; thimerosal-free versions are available

The amount of mercury in vaccines was always well below safety limits, but removal addressed public concerns while maintaining vaccine safety and effectiveness.`,
    sources: [
      { id: 's16', name: 'CDC - Thimerosal', url: 'https://www.cdc.gov/vaccinesafety/concerns/thimerosal/index.html', type: 'CDC', relevanceScore: 0.98, excerpt: 'Thimerosal contains ethylmercury, which is cleared from the body much faster than methylmercury in fish.' },
      { id: 's17', name: 'WHO - Thiomersal', url: 'https://www.who.int/groups/global-advisory-committee-on-vaccine-safety/topics/thiomersal', type: 'WHO', relevanceScore: 0.94, excerpt: 'Over 10 years of research shows no evidence of harm from thimerosal in vaccines.' },
    ],
    followUpQuestions: [
      'What\'s the difference between ethylmercury and methylmercury?',
      'Which vaccines contain thimerosal?',
      'Why was thimerosal used in vaccines?',
    ],
  },
  {
    keywords: ['natural immunity', 'natural', 'already had', 'recovered', 'infection'],
    response: `That's a fair question. Both natural infection and vaccination create immunity, but there are important differences.

Comparing natural immunity and vaccine immunity:

• Natural infection can provide immunity, but comes with the risk of serious illness, complications, and death

• Vaccines provide immunity without the risks of the actual disease

• For some diseases like measles, natural immunity and vaccine immunity are similarly long-lasting

• For others like tetanus, vaccine boosters are needed regardless of prior infection

• Natural immunity varies significantly between individuals—some may not develop strong protection

• Vaccines are designed to create consistent, reliable immune responses

The CDC recommends vaccination even for those who've had COVID-19, as it provides more predictable protection. However, previous infection may factor into timing of vaccination.`,
    sources: [
      { id: 's18', name: 'CDC - Immunity Types', url: 'https://www.cdc.gov/vaccines/vac-gen/immunity-types.htm', type: 'CDC', relevanceScore: 0.95, excerpt: 'Vaccines provide active immunity without the risks associated with natural infection.' },
      { id: 's19', name: 'WHO - Natural Immunity', url: 'https://www.who.int/news-room/feature-stories/detail/vaccine-efficacy-effectiveness-and-protection', type: 'WHO', relevanceScore: 0.92, excerpt: 'Vaccine-induced immunity is safer and more predictable than immunity from natural infection.' },
    ],
    followUpQuestions: [
      'How long does natural immunity last?',
      'Should I get vaccinated if I already had the disease?',
      'Can I check my immunity with a blood test?',
    ],
  },
  {
    keywords: ['flu', 'influenza', 'flu shot', 'annual', 'yearly'],
    response: `Good question about the flu vaccine. Here's why it's recommended annually.

About the flu vaccine:

• The flu virus mutates frequently, so each year's vaccine is updated to match circulating strains

• Immunity from the flu shot wanes over time, typically lasting one flu season

• It reduces the risk of flu illness by 40-60% when well-matched to circulating strains

• Even when it doesn't prevent flu, it often reduces severity and complications

• It's especially important for high-risk groups: elderly, pregnant women, young children, and those with chronic conditions

• It takes about two weeks after vaccination for protection to develop

The flu can be serious—it causes hundreds of thousands of hospitalizations and tens of thousands of deaths in the US each year.`,
    sources: [
      { id: 's20', name: 'CDC - Flu Vaccine', url: 'https://www.cdc.gov/flu/prevent/keyfacts.htm', type: 'CDC', relevanceScore: 0.96, excerpt: 'Flu vaccination reduces the risk of flu illness by 40-60% during seasons when circulating flu viruses are well-matched.' },
      { id: 's21', name: 'NHS - Flu Vaccine', url: 'https://www.nhs.uk/conditions/vaccinations/flu-influenza-vaccine/', type: 'NHS', relevanceScore: 0.94, excerpt: 'The flu vaccine is the best protection against an unpredictable virus that can cause severe illness.' },
    ],
    followUpQuestions: [
      'Why do I need a flu shot every year?',
      'Can the flu shot give me the flu?',
      'When is the best time to get vaccinated?',
    ],
  },
  {
    keywords: ['hpv', 'human papillomavirus', 'cervical', 'cancer', 'gardasil'],
    response: `The HPV vaccine is a significant advancement in cancer prevention. Here's what you should know.

About the HPV vaccine:

• It prevents infection with human papillomavirus types that cause most cervical cancers and other cancers

• Recommended for preteens (ages 11-12) but can be given as early as age 9

• Most effective when given before any exposure to HPV, which is why it's given before sexual activity typically begins

• Also protects against genital warts and cancers of the throat, anus, and genitals in both males and females

• Two doses are recommended if started before age 15; three doses if started later

HPV is very common—nearly all sexually active people get it at some point. The vaccine prevents the types most likely to cause cancer and has been shown to significantly reduce HPV infections and precancerous lesions.`,
    sources: [
      { id: 's22', name: 'CDC - HPV Vaccine', url: 'https://www.cdc.gov/hpv/parents/vaccine-for-hpv.html', type: 'CDC', relevanceScore: 0.97, excerpt: 'HPV vaccination can prevent more than 90% of HPV-attributable cancers when given at recommended ages.' },
      { id: 's23', name: 'NHS - HPV Vaccine', url: 'https://www.nhs.uk/conditions/vaccinations/hpv-human-papillomavirus-vaccine/', type: 'NHS', relevanceScore: 0.95, excerpt: 'The HPV vaccine helps protect against cancers caused by HPV, including cervical cancer.' },
    ],
    followUpQuestions: [
      'Why is HPV vaccine given so young?',
      'Should boys get the HPV vaccine?',
      'Is it too late to get the HPV vaccine as an adult?',
    ],
  },
  {
    keywords: ['test', 'testing', 'trial', 'approval', 'fda', 'clinical', 'study', 'studies'],
    response: `Understanding the testing process is important. Vaccines go through rigorous evaluation.

The vaccine approval process includes:

• Exploratory and preclinical stage: Laboratory and animal testing (2-4 years)

• Phase 1 trials: Small groups (20-100 people) test safety and dosing

• Phase 2 trials: Hundreds of participants test safety, immunogenicity, and dosing

• Phase 3 trials: Thousands to tens of thousands of participants test effectiveness and monitor for rare side effects

• Regulatory review: FDA, EMA, or equivalent agencies review all data

• Post-approval monitoring: Ongoing surveillance through VAERS, V-safe, and other systems

This process typically takes 10-15 years. COVID-19 vaccines completed all phases but some steps ran in parallel rather than sequentially, with no safety shortcuts.`,
    sources: [
      { id: 's24', name: 'CDC - Vaccine Testing', url: 'https://www.cdc.gov/vaccines/basics/test-approve.html', type: 'CDC', relevanceScore: 0.96, excerpt: 'Vaccines undergo years of testing in laboratory, animal, and human clinical trials before approval.' },
      { id: 's25', name: 'WHO - Vaccine Development', url: 'https://www.who.int/news-room/feature-stories/detail/how-are-vaccines-developed', type: 'WHO', relevanceScore: 0.94, excerpt: 'Vaccine development follows a rigorous multi-phase process to ensure both safety and efficacy.' },
    ],
    followUpQuestions: [
      'What happens in each phase of clinical trials?',
      'How is vaccine safety monitored after approval?',
      'What is emergency use authorization?',
    ],
  },
  {
    keywords: ['allergy', 'allergic', 'anaphylaxis', 'egg', 'reaction'],
    response: `Allergies and vaccines is an important topic. Here's what you need to know.

About allergic reactions to vaccines:

• Severe allergic reactions (anaphylaxis) are rare—about 1-2 per million doses

• Healthcare providers are trained to recognize and treat these reactions immediately

• You're asked to wait 15-30 minutes after vaccination for monitoring

• Most people with common allergies (food, pets, environmental) can safely receive vaccines

For specific allergies:

• Egg allergy: Most flu vaccines have minimal egg protein. People with egg allergies can safely receive flu vaccine with appropriate precautions

• Gelatin or latex allergies: Some vaccines contain these; alternatives may be available

• Previous vaccine reaction: Tell your provider—they can help determine if it's safe to proceed

If you've had a severe allergic reaction to a vaccine component, your provider can help identify safe alternatives.`,
    sources: [
      { id: 's26', name: 'CDC - Allergic Reactions', url: 'https://www.cdc.gov/vaccinesafety/concerns/allergic-reaction.html', type: 'CDC', relevanceScore: 0.97, excerpt: 'Severe allergic reactions following vaccination are rare, occurring at a rate of about 1 per million doses.' },
      { id: 's27', name: 'NHS - Who Can\'t Have Vaccines', url: 'https://www.nhs.uk/conditions/vaccinations/who-should-not-have-vaccinations/', type: 'NHS', relevanceScore: 0.93, excerpt: 'Most people with allergies can have vaccines safely. Tell your healthcare provider about any allergies.' },
    ],
    followUpQuestions: [
      'What are the signs of an allergic reaction?',
      'Can I get vaccinated if I have food allergies?',
      'What should I tell my doctor before getting vaccinated?',
    ],
  },
  {
    keywords: ['pregnant', 'pregnancy', 'breastfeeding', 'baby', 'fetus'],
    response: `Vaccines during pregnancy protect both you and your baby. Here's the current guidance.

Vaccines recommended during pregnancy:

• Flu vaccine: Safe in any trimester. Protects you and provides antibodies to your baby

• Tdap (whooping cough): Recommended in the third trimester (27-36 weeks) of each pregnancy. Provides protection to your newborn until they can be vaccinated

• COVID-19 vaccines: Recommended for pregnant and breastfeeding people. Studies show they're safe and effective

Vaccines to avoid during pregnancy:

• Live vaccines like MMR and varicella (chickenpox) should wait until after pregnancy
• If you need these vaccines, get them before becoming pregnant or after delivery

Breastfeeding is not a contraindication for most vaccines. The antibodies you develop can even provide some protection to your baby through breast milk.`,
    sources: [
      { id: 's28', name: 'CDC - Pregnancy Vaccines', url: 'https://www.cdc.gov/vaccines/pregnancy/pregnant-women/index.html', type: 'CDC', relevanceScore: 0.97, excerpt: 'Flu and Tdap vaccines during pregnancy help protect both you and your baby from serious diseases.' },
      { id: 's29', name: 'NHS - Pregnancy Vaccinations', url: 'https://www.nhs.uk/pregnancy/keeping-well/vaccinations/', type: 'NHS', relevanceScore: 0.95, excerpt: 'Vaccination during pregnancy passes protective antibodies to your unborn baby.' },
    ],
    followUpQuestions: [
      'Why is the whooping cough vaccine important during pregnancy?',
      'Can I get the flu shot while pregnant?',
      'Which vaccines should I avoid during pregnancy?',
    ],
  },
  {
    keywords: ['work', 'how do vaccines work', 'immune', 'immunity', 'protect', 'body'],
    response: `Understanding how vaccines work can help you appreciate their safety and effectiveness.

How vaccines train your immune system:

• Vaccines contain antigens—harmless pieces or weakened forms of a pathogen (virus or bacteria)

• Your immune system recognizes these antigens as foreign and mounts a response

• This creates "memory cells" that remember the pathogen

• If you encounter the real pathogen later, your immune system responds quickly and strongly

• This prevents illness or reduces its severity

Types of vaccines:

• Live attenuated: Weakened form of the pathogen (MMR, chickenpox)
• Inactivated: Killed pathogen (flu shot, polio)
• Subunit/conjugate: Pieces of the pathogen (Hepatitis B, HPV)
• mRNA: Instructions for your cells to make a harmless piece of the pathogen (some COVID-19 vaccines)

All these approaches teach your immune system without causing the disease.`,
    sources: [
      { id: 's30', name: 'CDC - How Vaccines Work', url: 'https://www.cdc.gov/vaccines/hcp/conversations/understanding-vacc-work.html', type: 'CDC', relevanceScore: 0.98, excerpt: 'Vaccines train your immune system to create antibodies, just as it would if exposed to the disease.' },
      { id: 's31', name: 'WHO - How Vaccines Work', url: 'https://www.who.int/news-room/feature-stories/detail/how-do-vaccines-work', type: 'WHO', relevanceScore: 0.96, excerpt: 'Vaccines contain weakened or inactive parts of an antigen that trigger an immune response.' },
    ],
    followUpQuestions: [
      'What are the different types of vaccines?',
      'How long does vaccine immunity last?',
      'Why do some vaccines need boosters?',
    ],
  },
];

// Fallback response for unmatched queries
export const FALLBACK_RESPONSE: KnowledgeEntry = {
  keywords: [],
  response: `Thank you for your question. I want to make sure I give you accurate, verified information.

While I may not have a specific answer prepared for that exact question, I can help you find reliable information from trusted health organizations.

Here are some things I can help you with:
• How vaccines work and their ingredients
• Vaccine safety and side effects
• The vaccine schedule for children and adults
• Specific vaccines like MMR, COVID-19, flu, and HPV
• Pregnancy and vaccination
• Natural immunity vs vaccine immunity

Would you like to explore any of these topics, or can you rephrase your question?`,
  sources: [
    { id: 'sf1', name: 'CDC - Vaccines', url: 'https://www.cdc.gov/vaccines/', type: 'CDC', relevanceScore: 0.85, excerpt: 'Your trusted source for vaccine information—safety, schedules, and recommendations for all ages.' },
    { id: 'sf2', name: 'WHO - Immunization', url: 'https://www.who.int/health-topics/vaccines-and-immunization', type: 'WHO', relevanceScore: 0.82, excerpt: 'Immunization prevents 3.5-5 million deaths every year from diseases like diphtheria, tetanus, and measles.' },
  ],
  followUpQuestions: [
    'Are vaccines safe?',
    'How do vaccines work?',
    'What vaccines do children need?',
  ],
};

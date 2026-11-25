# AI AGROPRENEUR
**TTIA 2026 — Category 5: AI & Automation Excellence**

> Revised draft, 31 October 2026. Items in `[[FILL: …]]` need a real value or a decision before submission. Delete this note and every `[[FILL]]` marker before submitting.

## PROJECT OVERVIEW

AI Agropreneur is a Malaysian-developed agricultural intelligence platform designed to make agricultural assistance more accessible, practical and affordable for farmers.

Malaysian farmers face challenges including unpredictable weather, plant diseases, pest infestations, rising fertiliser costs and limited access to timely agricultural advice. When crops develop unusual symptoms, farmers may not have immediate access to professional assistance. Delays in understanding potential problems can lead to uncertainty, unsuitable treatment decisions and unnecessary expenditure.

AI Agropreneur addresses these challenges through an integrated digital agricultural ecosystem. The platform combines AI-powered plant health assessments, AI-assisted farm recordkeeping, agricultural product recommendations, an online shop, myGAP-related tools, weather information and digital farm management.

Unlike applications focused primarily on plant disease identification, AI Agropreneur is designed to encourage the everyday adoption of agricultural technology. Farmers can use the platform to understand potential crop health problems, discover relevant agricultural products, maintain farming records and access agricultural information.

Through our partnership with Koperasi Agropreneur Nasional Berhad (KANB), agricultural product partners and experienced agricultural professionals, we are building a foundation for connecting farmers with practical agricultural knowledge and affordable solutions.

Our long-term vision includes university collaboration, locally trained agricultural AI models and Internet of Things (IoT) technologies to support more precise and predictive agricultural intelligence.

Our mission is to provide Malaysian farmers with timely agricultural assistance, practical guidance and greater access to affordable agricultural solutions.

**Status convention used throughout this submission.** AI Agropreneur is live, and the features described below are in use unless marked **†**. Items marked **†** were completed in our October 2026 release. They have passed automated testing and are pending production deployment. Future objectives are labelled as such.

---

## QUESTION 1
### What type of AI or automation technology has been implemented?

AI Agropreneur integrates multimodal artificial intelligence, computer vision, natural-language processing, automated product recommendations, structured expert review and agricultural data management into a unified Progressive Web App.

The platform has six implemented technological capabilities and one development objective.

**1. Multimodal AI Plant Health Assessment**

The platform uses OpenAI's multimodal AI services to analyse photographs of plants and identify visible symptoms associated with possible plant diseases, nutrient deficiencies, pest damage and environmental stress. Farmers receive a preliminary AI-generated assessment, an explanation and recommended next steps, summarised in a "What to do today" card with up to three actions. †

The assessment uses a structured response format that identifies one primary condition and up to three alternative conditions. † Each alternative can include supporting evidence, weakening evidence and distinguishing features, so that farmers understand why different conditions may produce similar symptoms.

**2. AI-Assisted Plant Identification**

PlantNet is integrated to identify likely plant species and provide context for the assessment. Where PlantNet cannot provide a usable result, the multimodal AI service is used as a fallback. The platform states whether plant identification is confirmed, likely, uncertain or unknown.

**3. Structured Confidence and Uncertainty Handling †**

AI Agropreneur uses descriptive confidence levels to help farmers interpret AI-generated assessments responsibly: High, Medium, Low and Not Enough Evidence.

When evidence is insufficient, the system requests additional photographs or information and poses short field questions the farmer can answer. Low-confidence cases are flagged for expert review, and chemical treatment recommendations are withheld when confidence is insufficient. These safeguards reduce the risk of farmers treating uncertain AI outputs as confirmed diagnoses.

**4. Automated Agricultural Product Recommendations**

AI Agropreneur integrates with its own agricultural online store, which has full e-commerce capability and can be used within the web app or separately, and draws on the store's product catalogue. The recommendation engine combines curated agricultural rules, product categories, tags and descriptions to identify potentially relevant products.

Additional eligibility checks cover: †

- Intended product purpose.
- Crop compatibility.
- Known restrictions.
- Availability of relevant label information.

Products requiring further verification are shown separately from the main disease-control recommendations. The system does not generate its own chemical dosage instructions and directs users to follow registered product labels.

**5. AI-Assisted Farm Records and Farm Risk Summary**

AI is also applied beyond disease assessment:

- **Natural-language farm logging.** Farmers describe an activity in their own words, for example "baja NPK 15-15 5kg Plot A", and AI converts it into a structured farm record (activity type, plot, product, quantity and harvest details), recognising common Malay farming terms. Farmers can now speak or type the activity directly into the myGAP form. †
- **AI farm risk summary.** The platform combines a farmer's plots, recent farm records, alerts and a three-day local weather forecast (Open-Meteo) to produce an AI-generated summary of possible farm risks. This is an early capability that we will validate against real farm outcomes.

**6. Feedback, Expert Review and Consent-Based Data Collection**

The platform records AI assessment information, farmer feedback and follow-up re-checks to support evaluation and improvement.

- **Expert review.** Experienced agricultural professionals review AI-generated disease assessments and product recommendations. [[FILL: describe how reviews are done today, e.g. "through shared case records and messaging", and how many cases have been reviewed since what date.]] A structured in-app expert-review workflow records expert findings separately from the original AI assessment, † and farmers see an "Expert reviewed" note on their result when a review exists. †
- **Optional consent.** Farmers choose whether their scan photos may be kept for AI improvement. The option is unticked by default, and declining does not prevent use of the AI assessment. Each assessment record stores the farmer's answer, and kept photos can be removed on request. †

Together these form a continuous-improvement process:

**Plant Image → AI Assessment → Farmer Feedback → Expert Review → Validated Agricultural Data → Improved AI Assessment**

The collected information may help identify recurring errors, improve assessment logic and support future agricultural AI development. The system does not automatically retrain the underlying AI model.

**7. Development objective — Locally Trained Agricultural AI**

The platform currently uses established external AI APIs. Our long-term objective is to explore AI models tailored to Malaysian crops, growing conditions and agricultural challenges. Consented, curated and expert-validated agricultural data may eventually support model training or fine-tuning, and university collaboration could strengthen dataset validation and AI evaluation.

**Supporting technology: Digital Farming, Offline Records and PWA**

AI Agropreneur includes myGAP-related tools, farm records, a trilingual interface and Progressive Web App technology. New farm and myGAP entries can be saved on the device when connectivity fails and synchronised when it returns, with duplicate prevention, retry handling and conflict detection. † AI disease assessment itself requires an internet connection.

---

## QUESTION 2
### Briefly describe the AI or automation solution implemented.

AI Agropreneur was developed to make agricultural assistance more accessible while encouraging farmers to adopt digital technology in their everyday farming activities.

Rather than functioning only as a plant disease identification application, the platform combines AI-powered crop health assessment, AI-assisted recordkeeping, product recommendations, an integrated online shop, myGAP-related tools and digital farm management. Our objective is to give farmers practical reasons to use the platform regularly, not only when their crops develop problems.

**1. AI-Powered Plant Health Assessment**

Farmers capture or upload photographs of affected plants using their smartphones, with on-screen guidance that confirms when a photo is clear enough. The platform uses plant identification and multimodal AI to assess visible symptoms and identify possible diseases, nutrient deficiencies and environmental stress.

The result presents the actions to take today, a primary condition, possible alternative conditions, a descriptive confidence level and any further evidence that would help confirm the assessment. † Farmers can schedule a follow-up re-check and compare the plant's progress over time.

**2. Agricultural Product Recommendations and Online Shop**

AI Agropreneur connects plant health assessments with an agricultural online store with full e-commerce capability. Farmers can use the store within the web app, straight from their assessment results, or visit it separately as a standalone online shop. The store also lets our product partners manage incoming orders efficiently.

Farmers can explore potentially relevant products, including fertilisers and crop management solutions, with ingredient and caution information grouped under "Label details". †

The recommendation workflow checks product purpose, crop compatibility, restrictions and label information. Products requiring further verification are presented separately rather than treated as suitable disease-control products. † The online shop also gives farmers a reason to return to the platform for their regular agricultural needs.

**3. KANB Partnership and Collective Purchasing Power**

A key component of our ecosystem is the partnership with Koperasi Agropreneur Nasional Berhad (KANB). By connecting farmers, agricultural suppliers and product partners, AI Agropreneur aims to consolidate purchasing demand and create stronger collective bargaining power.

As farmer participation and demand grow, we intend to work with KANB to negotiate more competitive prices, bulk purchasing arrangements and favourable supply terms.

The KANB partnership has been secured. Collective purchasing arrangements and resulting cost savings are future outcomes, to be established and measured.

**4. myGAP Integration and Digital Farm Management**

AI Agropreneur includes tools aligned with Malaysian Good Agricultural Practices (myGAP): checklists, activity records, farm logbooks, guides, a pre-harvest interval calculator and reporting functions.

Logbook entries capture structured information, including activity date, farm plot, crop, product used, quantity and operator. † Farmers can speak or type an activity to fill the form, repeat their last entry, and receive a harvest-date reminder from the pre-harvest interval calculator. † A per-plot timeline brings together scans, follow-ups, logs and notes. †

New farm and myGAP entries can be saved on the device during connectivity interruptions and synchronised when connectivity returns. †

These tools support agricultural documentation and myGAP preparation. They do not constitute official myGAP certification.

**5. Weather Information and Farm Risk Summary**

The home and dashboard screens show local weather from Open-Meteo. The AI farm risk summary combines a three-day forecast with the farmer's plots and records to highlight possible risks. Future IoT integration may provide more precise on-farm measurements.

**6. Agricultural Expertise and University Collaboration**

Experienced agricultural professionals review AI-generated disease assessments and product recommendations. The structured in-app review workflow allows authorised reviewers to record confirmations, corrections, uncertainty and product suitability decisions, kept separate from the original AI result. †

AI Agropreneur also aims to collaborate with universities and academic institutions on agricultural research, AI evaluation, local dataset development and farmer education. University collaboration is a development objective; no formal partnership has yet been confirmed. [[FILL: update if a partnership is confirmed before submission.]]

**7. Accessibility and Everyday Adoption**

AI Agropreneur is a Progressive Web App, accessible through compatible web browsers without installing a conventional native app. The interface supports Bahasa Melayu, English and Chinese, and new users choose their language when they first open the app. Daily "Due today" reminders bring farmers back for scheduled re-checks and farm tasks.

**Our Integrated Approach**

**Identify → Understand → Recommend → Shop → Record → Improve**

Our goal is not simply to help farmers identify diseases. We want farmers to use AI Agropreneur throughout their farming activities, from understanding crop problems and discovering affordable products to keeping myGAP-related records and gradually adopting smarter agricultural practices.

---

## QUESTION 3
### What problem does the solution address, and how was it applied?

**Agricultural Challenges in Malaysia**

Agriculture plays an important role in Malaysia's economy, food production and rural livelihoods.

According to the Department of Statistics Malaysia's [[FILL: exact publication title, e.g. "Agriculture Census 2024"]], covering the 2023 reference year, Malaysia recorded approximately 1.03 million agricultural holdings, of which approximately 98% were individual holdings. The census also recorded [[FILL: figure, e.g. "X% of holders aged 60 and above"]], highlighting the importance of agricultural technology that is accessible to users with different levels of digital experience. [[FILL: confirm both figures against the DOSM publication before submission.]]

**What Farmers Told Us: Field Interviews in Alor Setar, Kedah**

To understand the problem first-hand, our team interviewed farmers growing a range of crops in and around Alor Setar, Kedah. [[FILL: number of farmers interviewed, dates, crops grown (e.g. paddy, vegetables, fruit), age range, and how they were selected.]]

Across different crops, three consistent themes emerged:

1. **Farmers rely on personal experience when symptoms appear.** When crops show unusual symptoms, farmers mostly judge the cause from their own experience or from other farmers. Timely professional advice is rarely available at the moment a decision is needed.
2. **Product choice is limited to nearby shops.** Farmers look for treatments and fertilisers at the agricultural shops near them. Their choice of products, and their access to information about whether a product suits the problem, depends on what those shops stock and recommend.
3. **High input costs and dependence on government incentives make farming unstable.** Input costs are high, and many farmers depend heavily on government subsidies and incentives. When that support is delayed or changes, their costs and planning are disrupted.

[[FILL: add one or two short, anonymised quotes from the interviews, with the farmer's consent.]]

**Independent Evidence Supporting These Findings**

Published sources point to the same pressures across crops, in Kedah and nationally:

- **Delays in subsidised inputs cause instability.** Kedah's paddy sector shows how exposed farmers are when support is delayed. In 2026, delays in supplying subsidised paddy compound fertiliser (Baja Padi 3) affected about 38,000 farmers and 78,117 hectares in the MADA area. As of 18 August, only 22% of the 616,015 bags required had been supplied, and the Malaysian Anti-Corruption Commission opened an investigation ([Malay Mail, 7 Sep 2026](https://www.malaymail.com/news/malaysia/2026/09/07/macc-investigates-fertiliser-delays-affecting-38000-kedah-farmers/234229)). Fertiliser must be applied at specific growth stages, so a delayed delivery can reduce yields, and farmers bear the losses ([The Star, 6 Aug 2026](https://www.thestar.com.my/news/nation/2026/08/06/padi-farmers-under-pressure-due-to-fertiliser-supply-delays-mada-chairman-vacancy-says-report)).
- **Input prices are rising.** In June 2026 the Ministry of Agriculture and Food Security reported fertiliser price increases of up to 29%, including urea up 28.8% and muriate of potash up 21.7% compared with January–March 2026. Pesticide prices rose by 0.5% to 44% ([CodeBlue, 26 Jun 2026](https://codeblue.galencentre.org/2026/06/kpkm-pre-conflict-stock-keeps-fertiliser-price-hikes-below-global-levels/)). This continues an earlier spike: in February 2022 the Department of Statistics recorded a 17.6% year-on-year rise in its fertiliser price index, with urea up 28.7% ([DOSM, 2022](https://v1.dosm.gov.my/v1/uploads/files/6_Newsletter/Newsletter%202022/DOSM_BPHPP_4_2022_Series%2036_compressed.pdf)). The pressure is not limited to paddy: durian growers, for example, reported fertiliser prices rising from about RM120–130 to RM190–200 per 50 kg bag ([Asia News Network](https://asianews.network/?p=26052)).
- **Farmers depend on public support.** Budget 2022 allocated RM1.53 billion to paddy subsidies and incentives for about 300,000 farmers ([Bernama](https://www.bernama.com/en/general/news.php?id=2025246)). Studies of the MADA area describe paddy farmers as largely within the B40 income group and facing high production costs without subsidies ([Status of the Paddy and Rice Industry in Malaysia](https://www.researchgate.net/publication/351223058_The_Status_of_the_Paddy_and_Rice_Industry_in_Malaysia)).
- **An ageing farming community.** In Kedah's MADA rice area alone, about 54,000 farmers work more than 100,000 hectares under MADA, most of them ageing ([NST, Feb 2025](https://www.nst.com.my/amp/news/nation/2025/02/1181358/kedahs-rice-bowl-reborn-rm54bil-boost-rice-production)).
- **Limited access to expert advice.** A 2025 regional review identifies a shortage of agricultural extension workers, and weak incentives to serve remote areas, as a bottleneck in Malaysia ([RASSEA, 2025](https://rassea.org/2025/06/21/transforming-agricultural-extension-services-in-southeast-asia-building-an-inclusive-and-digital-future-for-farming/)). A 2026 study of Malaysian paddy farmers found heavy reliance on chemical pest control, with pesticide dealers among farmers' usual sources of advice ([ASM Science Journal, 2026](https://doi.org/10.32802/asmscj.2026.1957)).

[[FILL: check each figure against its source before submission; replace news sources with official MADA, DOA or KPKM documents where available; add evidence for the other crops your interviewees grow.]]

**Alignment with National Priorities**

AI Agropreneur supports national goals for a more productive, resilient and digital agrofood sector:

- **National Agrofood Policy 2021–2030 (Dasar Agromakanan Negara 2.0):** modernising agriculture through technology adoption, improving productivity and strengthening food security.
- **Department of Agriculture's myGAP programme:** our recordkeeping tools help farmers keep the structured records that myGAP preparation needs.
- **Malaysia Digital Economy Blueprint (MyDIGITAL):** extending digital adoption to rural communities and smallholders.
- **Inclusive development:** a trilingual interface, voice-based record entry and offline saving lower the barrier for older and less digitally experienced farmers.
- **Cooperative movement:** working through KANB strengthens cooperative-led support for agropreneurs.

[[FILL: confirm policy names and wording against the current official documents; add any policy the judges' guidelines reference.]]

AI Agropreneur addresses five major challenges.

**Challenge 1 — Limited Access to Timely Agricultural Assistance**

The farmers we interviewed rely mainly on experience when symptoms appear, because professional advice is rarely available at the moment a decision is needed. AI Agropreneur provides a preliminary AI-assisted assessment from a photograph, giving farmers an accessible starting point and clear next steps, and flags uncertain cases for review by agricultural experts.

**Challenge 2 — Difficulty Identifying Similar Plant Diseases**

Different diseases, nutrient deficiencies and environmental conditions can produce similar symptoms, and incorrect assumptions may lead to unsuitable treatment. The assessment presents possible alternative conditions, evidence comparisons and descriptive confidence levels, and asks for more information when evidence is insufficient. † These features help farmers recognise uncertainty before taking action.

**Challenge 3 — Limited Product Access, High Input Costs and Unstable Support**

Farmers told us their product choices are limited to what nearby shops stock, input costs are high, and their reliance on government incentives makes farming unstable when support is delayed or changes.

AI Agropreneur responds in three ways:

- **Wider access:** an online store, available inside the web app or separately, gives farmers access to products beyond their nearest shop, with label information to compare.
- **Better-matched purchases:** recommendations linked to the assessment, with eligibility checks, help farmers avoid buying products that do not suit the problem. †
- **Collective buying power:** through KANB, the project aims to pool farmer demand and negotiate better supplier prices and supply terms as the network grows, giving farmers a more stable source of inputs alongside government support.

AI Agropreneur does not replace government support. It aims to reduce farmers' exposure to delays and price changes by widening and strengthening their access to inputs.

**Challenge 4 — Unpredictable Weather and Environmental Conditions**

Weather influences crop health and farm planning. AI Agropreneur shows local weather information and uses the forecast in its AI farm risk summary. Future IoT integration may add on-farm environmental measurements.

**Challenge 5 — Barriers to Agricultural Digitalisation**

Farmers have different levels of technical experience and access to digital resources. AI Agropreneur responds with a trilingual interface, simplified screens, a Progressive Web App, and AI that turns spoken or typed farm activities into structured records. Offline saving reduces the risk of losing new farm and myGAP entries when connectivity is interrupted. †

**Our Approach**

AI Agropreneur makes digital agriculture useful through everyday farming needs. By combining AI assistance, agricultural expertise, product discovery and farm management tools, the platform provides a practical entry point for Malaysian farmers to adopt digital technologies, regardless of their level of technical experience.

---

## QUESTION 4
### What measurable outcomes or improvements have been achieved?

Over the past 12 months, AI Agropreneur has reached the following usage, collaboration and development milestones.

**1. Platform Usage**

[[FILL: from the live system, for a stated period, excluding demo, test and deleted records. Report only figures you can reproduce.]]

| Measure (period: [[FILL: e.g. 1 Nov 2025 – 31 Oct 2026]]) | Value |
|---|---|
| Registered farmer accounts | [[FILL]] |
| Plant health assessments completed | [[FILL]] |
| Farms / plots recorded | [[FILL]] |
| Farm and myGAP log entries | [[FILL]] |
| Product views / enquiries from recommendations | [[FILL]] |
| Cases reviewed by agricultural experts | [[FILL]] |

**2. Strategic Partnership with KANB**

AI Agropreneur secured a partnership with Koperasi Agropreneur Nasional Berhad (KANB) [[FILL: date and form, e.g. "MoU signed March 2026"]]. This provides a foundation for agricultural community engagement, supplier collaboration and future collective purchasing.

**3. Active Agricultural Expert Collaboration**

[[FILL: number]] experienced agricultural professionals have joined the initiative and review AI-generated disease assessments and product recommendations. Their involvement supports technical development and agricultural validation.

**4. Agricultural Product Partnerships**

AI Agropreneur has established [[FILL: number]] agricultural product partnerships, supplying [[FILL: number]] products in the integrated shop.

**5. October 2026 Release — Responsible AI and Data Governance †**

The October 2026 release added:

- **Structured assessment:** one primary condition, up to three alternatives with supporting and distinguishing evidence, four confidence levels, requests for more information and expert-review flags.
- **Product safeguards:** checks for purpose, crop compatibility, restrictions and label information; products needing verification shown separately; model-generated dosage instructions withheld in favour of registered product labels.
- **Expert review records:** authorised reviewers record confirmations, corrections, uncertainty and product suitability decisions, preserved separately from the original AI assessment and shown to the farmer as an "Expert reviewed" note.
- **Stronger record protection:** every farm record and assessment is bound to its verified owner, and feedback is attributed through a verified capability.
- **Consent-based data collection:** an optional, unticked consent for keeping scan photos, recorded with each assessment, with photo removal on request.
- **Offline records:** new farm and myGAP entries saved on-device and synchronised later, with duplicate prevention, retry handling and conflict detection.
- **Response-time measurement:** the analysis time of every assessment is now recorded.

This release passed 346 automated tests covering assessment structure, low-confidence handling, AI provider failures, product eligibility, record ownership, feedback attribution, offline synchronisation, expert-review authorisation and consent. Tests used simulated AI providers and database. Production deployment is scheduled for [[FILL: date]].

**6. Multilingual PWA and Digital Farming Tools**

AI Agropreneur supports Bahasa Melayu, English and Chinese across all farmer-facing screens, and includes myGAP-related guides, checklists, logbooks, a pre-harvest interval calculator, reporting and farm management tools.

**Next Evaluation Phase**

Following deployment, we will measure and report:

- AI assessment response time (median and 95th percentile).
- Agreement between AI assessments and expert-reviewed results, including whether the correct condition appears among the alternatives.
- The proportion of cases where chemical products were shown but experts judged the case uncertain or incorrect (target: zero).
- Product recommendation suitability as judged by experts.
- Consent opt-in rate, feedback rate and expert review volume.
- Offline synchronisation success in a low-connectivity field trial.
- Farmer usability and adoption.
- Input cost savings achieved through supplier negotiations.

> **Current Limitations — stated once, clearly**
>
> - **Assessments are preliminary.** The AI suggests likely conditions from visible symptoms. It is not a confirmed diagnosis, and its accuracy has not yet been independently measured. The validation pilot (Phase 2 of our roadmap) will report this.
> - **Third-party AI models.** Plant identification and image analysis use PlantNet and OpenAI. Our contribution is the agricultural workflow, safeguards, expert review and data around them, not a proprietary model.
> - **Product checks are not registration checks.** Eligibility checks use product listing and label information and do not replace official pesticide registration or professional advice.
> - **myGAP tools support preparation, not certification.** They are not an official myGAP certification or government system.
> - **Some features need connectivity.** AI assessment requires internet access; offline saving covers new farm and myGAP entries.
> - **Outcomes not yet claimed.** We do not yet claim measured improvements in crop yield, farmer income, diagnostic accuracy or input costs. Collective purchasing savings will be reported once arrangements are in place.
> - **Release status.** Features marked † have passed automated testing and are pending production deployment.

---

## QUESTION 5
### Why is the implementation effective or innovative?

AI Agropreneur's innovation lies in integrating artificial intelligence, agricultural expertise, product discovery, cooperative purchasing and digital farm management into one Malaysian-focused platform.

**1. Beyond AI Disease Detection**

Many agricultural AI solutions focus on identifying plant diseases. AI Agropreneur applies AI across the farmer's journey: assessing crop health, turning spoken or typed activities into structured farm records, and summarising farm risks from records and weather. It then connects those insights with an integrated shop and myGAP tools.

**2. Responsible AI by Design**

In agriculture, a confident but wrong answer can cost a farmer a crop or lead to unnecessary chemical use. AI Agropreneur therefore defines what the AI is **not allowed** to do, and enforces these rules in the platform's code rather than relying on the AI model to follow instructions. †

| The AI is not allowed to… | What the platform does instead |
|---|---|
| Present an uncertain result as a confirmed diagnosis | Shows one of four confidence levels; a "High" claim from the model is lowered when the supporting evidence is weak |
| Recommend chemical treatments when confidence is low | Withholds chemical products and treatment advice, and flags the case for expert review |
| Write its own pesticide dosage or spray intervals | Removes model-generated dosages and directs the farmer to the registered product label |
| Recommend a product for the wrong purpose, such as a herbicide for a plant disease | Checks product purpose, crop compatibility, restrictions and label information; unverified products are shown separately |
| Pad the answer with unrelated alternative conditions | Shows at most three alternatives, each with its own evidence, and never ranks an alternative above the primary condition |
| Return a made-up answer when the AI service fails | Tells the farmer the assessment is unavailable instead of showing an incomplete result |
| Keep a farmer's photos without consent | Keeps photos only when the farmer ticks an unticked consent box, and removes them on request |
| Overwrite the AI's original answer when an expert corrects it | Stores expert findings as a separate, attributed record |

*Illustrative example:* a farmer uploads a slightly blurred photo of yellowing chilli leaves. Instead of naming a disease and suggesting a fungicide, the platform reports "Not enough evidence". It explains that the yellowing could come from a nutrient deficiency or an early infection, asks for a close-up of the underside of the leaf, poses two quick field questions and offers no chemical products. [[FILL: replace with a real, consented case and screenshot if available.]]

All eight rules are covered by automated tests.

**3. Encouraging Everyday Digital Adoption**

AI Agropreneur remains useful when crops are healthy. Farmers can buy agricultural products, log activities by voice or text, use myGAP-related tools, follow re-check reminders and check the weather. Offline recordkeeping supports documentation when connectivity is interrupted. † These features encourage regular engagement and gradual adoption of digital farming practices.

**4. Collective Purchasing Through KANB**

The KANB partnership creates an opportunity to combine farmers' purchasing demand and strengthen negotiations with suppliers. As participation grows, collective purchasing may help farmers obtain inputs at more competitive prices, connecting agricultural technology with a direct economic benefit.

**5. Human Expertise Combined with AI**

Experienced agricultural professionals review AI-generated assessments and product recommendations. The structured review workflow records corrections and product suitability decisions while preserving the original AI assessment, and shows farmers when an expert has reviewed their case. † AI supports agricultural judgement rather than replacing it.

**6. Continuous Improvement and Local Agricultural Intelligence**

Assessment records, farmer feedback, consent records and expert reviews provide a foundation for identifying recurring errors and improving recommendations. Over time, consented and validated agricultural data may support locally trained AI models, with potential university collaboration strengthening research and evaluation.

**Competitive Positioning**

International platforms such as Plantix, Agrio and PlantVillage Nuru demonstrate established uses of AI in crop health assessment. Malaysia also has agricultural technology initiatives such as LadaGo and Rakan Tani. Our differentiation lies not in a single AI model but in combining:

**AI Assessment + AI Farm Records + Agricultural Expertise + Product Suitability Checks + Online Shop + Cooperative Purchasing + myGAP Tools + Continuous Improvement**

Our innovation is not simply identifying what may be wrong with a crop. It is connecting farmers with practical guidance, relevant products and tools that support their everyday agricultural activities.

---

## QUESTION 6
### How is the solution sustainable, scalable or expandable?

AI Agropreneur is designed to evolve from an AI-assisted plant health platform into a broader agricultural intelligence ecosystem, through scalable technology, partnerships, continuous improvement and predictive capabilities.

**1. Scalable AI Infrastructure**

The platform uses established AI APIs rather than a proprietary foundation model. This lets the team improve assessment workflows and adopt better AI capabilities as technology evolves. Expansion may include additional crops, improved disease comparisons and more structured agricultural guidance.

**2. Continuous Agricultural Data Collection**

AI Agropreneur collects assessment results, farmer feedback and follow-up re-checks, with explicit, optional consent for keeping scan photos. † Consented and governed data, especially expert-reviewed cases, will help identify assessment weaknesses and improve recommendations.

**3. Future Locally Trained Agricultural AI Models**

We aim to explore AI models informed by Malaysian crops, environmental conditions and farming practices, by fine-tuning suitable models or developing specialised models from curated, validated datasets. University collaboration may support research, data validation and model evaluation.

**4. Future IoT Integration**

We plan to explore IoT technologies for more precise agricultural information, including:

- Soil moisture sensors.
- Temperature and humidity monitoring.
- Local weather stations.
- Soil temperature measurements.
- Validated soil nutrient measurements.

**5. Predictive Agricultural Intelligence**

The AI farm risk summary is a first step: it already combines farm records, alerts and a three-day weather forecast. By adding historical scan results and future IoT data, and by validating outputs against real outcomes, AI Agropreneur aims to support proactive decisions such as:

- **Disease risk alerts:** identifying conditions associated with increased disease risk.
- **Irrigation planning:** using soil moisture and forecasts to support watering decisions.
- **Nutrient management:** combining crop information, records and validated soil measurements.
- **Weather-related warnings:** flagging conditions that may affect farming activities.
- **Agricultural insights:** finding useful patterns in historical observations and records.
**6. Expanding the Agricultural Product Ecosystem**

The KANB partnership and existing product partners provide a foundation for expanding farmer participation and supplier collaboration. As demand grows, we aim to establish collective purchasing arrangements and negotiate more competitive prices. Because partners manage their orders directly through the store, adding suppliers and products does not depend on the platform team processing each order. The store also supports a sustainable commercial model, provided product recommendations remain transparent and responsible.

**7. University and Research Collaboration**

We intend to explore collaboration with universities on agricultural research, plant disease validation, AI evaluation, local dataset development and farmer education.

**8. Value for Every Stakeholder**

The platform is sustainable because each participant gains something that keeps them involved:

| Stakeholder | What they gain | What they contribute |
|---|---|---|
| Farmers | Timely guidance, suitable products, simpler farm and myGAP records, and a path to lower input prices | Usage, feedback and (with consent) photos that improve the AI |
| Product partners and suppliers | A sales channel to farmers with a demonstrated need, and efficient order management | Products, label information and competitive pricing |
| KANB | A digital platform to serve and grow its agropreneur community, and pooled demand for negotiations | Farmer reach, cooperative credibility and bargaining power |
| Agricultural experts | Structured, attributed review records and a scalable way to reach more farmers | Validation, corrections and product suitability judgements |
| Research partners (future) | Consented, expert-validated Malaysian agricultural data | Evaluation methods, research and local AI development |

**9. Phased Roadmap**

[[FILL: confirm dates and targets with the team; these are proposed.]]

| Phase | Timing | Milestones | Success measure |
|---|---|---|---|
| 1. Deploy and measure | Q4 2026 – Q1 2027 | Deploy the October 2026 release; activate in-app expert review; begin recording response times and consent rates | Release live; first monthly metrics report |
| 2. Validate | Q1 – Q2 2027 | Expert-review pilot of at least 200 real cases across the main crops; offline field trial in a low-connectivity area; farmer usability sessions in ms/en/zh | Published top-1/top-3 agreement and safety-gate results |
| 3. Grow the ecosystem | Q2 – Q4 2027 | Expand farmer onboarding through KANB; add product partners; first collective purchasing arrangement | Active farmers, partner count, measured price difference |
| 4. Predict and localise | 2028 onwards | IoT trial with a partner farm; validated disease-risk alerts; explore locally fine-tuned models with a research partner | Alert accuracy against field outcomes |

Following local validation, AI Agropreneur may expand into other Southeast Asian markets, subject to localisation, agricultural expertise and regulatory assessment.

**Our Long-Term Vision**

**AI Image Analysis + Farmer Feedback + Agricultural Expert Knowledge + University Research + IoT Data + Weather Information**

This integrated approach could support more personalised, timely and predictive agricultural assistance, moving from identifying existing crop problems toward helping farmers recognise risks earlier.

---

## CONCLUSION
### From AI Diagnosis to Everyday Agricultural Intelligence

AI Agropreneur was developed with a practical mission: to make agricultural assistance more accessible to Malaysian farmers.

Farmers need more than AI-generated disease assessments. They need understandable guidance, relevant products, affordable purchasing options and practical tools for daily operations. By integrating AI plant health assessment, AI-assisted farm records, product recommendations, an online shop, myGAP-related tools and digital farm management, AI Agropreneur encourages the everyday adoption of agricultural technology.

Our partnership with KANB, our product partnerships and active collaboration with experienced agricultural professionals connect technology with practical agricultural needs.

Our October 2026 release strengthens the platform with structured disease comparisons, product eligibility checks, expert-review records, stronger record protection, consent-based data collection and offline recordkeeping. It has passed automated testing and is pending deployment, with real-world measurement as the next step.

Looking ahead, we will expand farmer engagement, strengthen our continuous-improvement framework, explore university collaboration, develop locally relevant AI capabilities and integrate IoT for more precise monitoring.

Our vision is to move from helping farmers identify crop problems today toward helping them anticipate agricultural risks tomorrow.

AI Agropreneur is not simply about bringing artificial intelligence into agriculture. It is about making agricultural intelligence accessible, actionable and affordable for the people who need it most.

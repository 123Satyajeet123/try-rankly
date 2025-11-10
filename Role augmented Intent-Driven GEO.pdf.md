# Role-Augmented Intent-Driven Generative Search Engine Optimization

**Xiaolu Chen, Haojie Wu, Jie Bao, Zhen Chen, Yong Liao*, Hu Huang**

University of Science and Technology of China

## Abstract

Generative Search Engines (GSEs), powered by Large Lan-guage Models (LLMs) and Retrieval-Augmented Generation (RAG),are reshaping information retrieval. While commer-cial systems (e.g.,BingChat,Perplexity.ai) demonstrate im-pressive semantic synthesis capabilities, their black-box na-ture fundamentally undermines established Search Engine Optimization (SEO) practices. Content creators face a criti-cal challenge: their optimization strategies, effective in tra-ditional search engines, are misaligned with generative re-trieval contexts, resulting in diminished visibility. To bridge this gap, we propose a Role-Augmented Intent-Driven Gen-erative Search Engine Optimization (G-SEO) method,pro-viding a structured optimization pathway tailored for GSE scenarios. Our method models search intent through reflec-tive refinement across diverse informational roles, enabling targeted content enhancement. To better evaluate the method under realistic settings, we address the benchmarking limita-tions of prior work by: (1) extending the GEO dataset with di-versified query variations reflecting real-world search scenar-ios and (2) introducing G-Eval 2.0, a 6-level LLM-augmented evaluation rubric for fine-grained human-aligned assessment. Experimental results demonstrate that search intent serves as an effective signal for guiding content optimization, yield-ing significant improvements over single-aspect baseline ap-proaches in both subjective impressions and objective content visibility within GSE responses.

## Introduction

Generative Search Engines (GSEs), such as ChatGPT and Perplexity.ai, are rapidly transforming how users access and interact with information. By integrating Large Lan-guage Models (LLMs) with Retrieval-Augmented Genera-tion (RAG) techniques, GSEs inherit the precise retrieval capabilities of traditional search engines while introducing advanced semantic understanding and natural language gen-eration. This allows them to selectively synthesize multi-source information and deliver context-aware, comprehen-sive responses to user queries.

*Corresponding author

Copyright © 2026, Association for the Advancement of Artificial Intelligence (www.aaai.org).All rights reserved.

'Our code and dataset will be released upon the acceptance of the paper.

However, this emerging paradigm introduces unprece-dented challenges for content creators, such as bloggers, journalists, and web developers, whose work is increasingly surfaced through GSEs. Operating as black boxes, GSEs of-fer little transparency into how content is selected, aggre-gated,and suurfaced. Consequently, creators struggle to un-derstand how their content is interpreted, ranked, and either included or excluded from generated outputs. This opacity significantly hinders their ability to improve content visibil-ity,often resulting in high-quality content being misrepre-sented, ignored, or even underutilized.

While some existing studies have attempted to enhance visibility through content rewriting or search engine opti-mization (SEO) techniques, these methods generally over-look the unique semantic generation logic of GGSEs. Tra-ditional SEO strategies focus on surface-level signals such as keyword matching (Kanara, Kumari, and Prathap 2024) and hyperlink structures (Lewandowski 2023),lacking the semantic granularity required to infuence LLM-driven gen-eration. Similarly, some rewriting models that rely on su-pervised fine-tuning tend to target task-specific improve-ments and struggle to generalize across diverse user queries. (Sarkar et al. 2025; Shu et al. 2024) Notably, both ap-proaches fail to directly optimize for content visibility within GSE contexts. Prompt injection methods (Kumar and Lakkaraju 2024; Pfrommer et al. 2024) have emerged to steer GSEs toward specific content, but they typically fall short of improving the structural or semantic quality of the source content and often lack robustness. GEO (Aggarwal et al. 2024) offers a promising direction by introducing rewriting strategies to enhance content presentation, yet it remains limited in handling diverse search intents and lacks a systematic optimization framework. To address these limi-tations, we propose Role-Augmented Intent-Driven Genera-tive Search Engine Optimization (RAID G-SEO), an intent-aware optimization framework tailored for the GSE black-box setting. Our method explicitly models user latent search intents and introduces a four-stage structured pipeline com-prising content summarization, intent inference and refine-ment, step planning, and content rewriting. To align content more closely with user needs, we incorporate a multi-role deep reflection mechanism that enables content creators to infer and refine likely search intents from their own autho-rial perspective, providing semantically coherent and action-

<!-- arXiv:2508.11158v1 [cs.IR] 15 Aug 2025 -->

<!-- 8 create maintain search Content 1 Content 1 {Here is the user's query} create maintain {Fragment1 of the query resp Search System onse from Content 1.}[1]{Fra Content 2 Content 2 gment2 of the query response from Content 1.}[1]{Fre create maintain 3 of the query responsd Note [1]- Content 2.}[2]......{Fragment m of the query response from Content 3 Content 3 Content 1 and Content 3.}[1,3] create optimize integrate {Fragment1 of the query resp onse from Content 4.}[4]{Fra User Content 4 New Content 4 LLM gment2 of the query response from Content 4 and Cont [1,4]{Fragment3 of tk Note [4] create maintain y response from Content 2.12] ......{Fragmentm of the query Content N Content N response from Content 3.}[3] Creators Generative Search Engine -->
![](https://web-api.textin.com/ocr_image/external/8f54f26f0f6e718f.jpg)

Figure 1: Overview of Generative Search Engine (GSE) workflow. Upon receiving a user query, the system retrieves a set of relevant documents and feeds them into the large language model (LLM) to generate a synthesized response with source-level citations. Optimized content may increase its likelihood of being cited in the final response. Notably, in the black-box setting assumed in this work, the query is not visible to content creators.

able guidance for optimization. Furthermore,we extend the existing GEO benchmark with a diverse set of user queries to better simulate real-world GSE interactions. We also in-troduce G-Eval 2.0, a multi-dimensional evaluation proto-col enabling fairer and more granular assessments of content visibility in GSE outputs.

Our contributions are summarized as follows:

·We formalize the GSE black-box setting with unknown user queries and introduce RAID G-SEO, the first struc-tured intent-aware optimization framework, whichsig-nificantly boosts content visibility across diverse queries.

·We design a deep reflection mechanism grounded in the 4W principle and multiple role perspectives, enabling creator-centric semantic intent refinement.

·We extend the GEO benchmark and propose G-Eval 2.0, enabling more granular and consistent subjective evalua-tions across diverse retrieval scenarios.

## Related Work

## Traditional SEO Techniques

Search Engine Optimization (SEO) has long served as a cor-nerstone for improving content visibility in traditional web search (Shahzad et al. 2020; Almukhtar, Mahmoodd,and Kareem 2021). It typically relies on both on-page and off-page factors, including web link structures (Lewandowski 2023), page rendering strategies (Kowalczyk and Szan-dala 2024), and keyword placement (Kanara, Kumari, and Prathap 2024), to improve rankings on Search Engine Re-sults Pages (SERPs). Recent advances in LLMs have en-abled their use in generating SEO-optimized content, includ-ing product descriptions and metadata to enhance visibility (Chodak and Błażyczek 2024; Samarah et al. 2024). How-ever,these approaches are highly dependent on observable signals (e.g.,keyword relevance or link authority),which become less effective in GSE contexts, where the content se-lection process is driven by semantic alignment and system-level preferences.

## Content Optimmization

Beyond traditional SEO, content rewriting has become a prominent direction in optimization, particularly in the era of LLMs. Several studies have leveraged instruction-tuned LLMs to generate fluent and semantically faithful rewrites, guided by diverse editing instructions (Shu et al. 2024; Li et al. 2024). Other work (Chong et al. 2023;Li et al. 2025; Sarkar et al. 2025) incorporates implicit knowledge into prompts to steer generation toward personalization or task-specific objectives. However, these methods prioritize linguistic quality and personalization, they do not directly tackle visibility in GSEs. GEO (Aggarwal et al. 2024) is the first systematic effort targeting this problem, introduc-ing GEO-bench, the first benchmark tailored for GSE sce-narios, along with rule-based strategies that target seman-tic prominence. Despite its initial success, GEO is con-strained by static rewrite patterns which lack adaptability to diverse query intents. Meanwhile, a line of work(Kumar and Lakkaraju 2024; Pfrommer et al. 2024; Greshake et al. 2023; Shi et al. 2024; Bardas et al. 2025) explores prompt injection strategies to manipulate GSE responses, but these methods might compromise semantic coherence, raising concerns re-garding safety and content integrity.

In contrast to static rewriting or prompt injection, we pro-pose a multi-stage optimization framework based on ex-plicit search intent modeling and role-augmented reflective prompting. Instead of injecting adversarial or misleading prompts, we decompose search intent into actionable sub-goals and align them with role-specific informational expec-tations. This enables targeted content enhancement that pre-serves semantic integrity while adaptively enhancing visibil-ity under opaque and non-deterministic GSE behaviors.

## Methodology

### Blackbox GSE Assumption

In real-world deployments, GSEs such as Google's Search Generative Experience (SGE) and Perplexity.ai typically adopt LLM-based RAG architectures while remaining largely opaque to external observers. To contextualize our work, we describe a typical GSE workflow, as illustrated in Figure 1. Upon receiving a user query $b$ , the system retrieves a set of relevant content sources $C=$ Retrieval(q) $=$ $\left\{c_{1},c_{2},\cdots ,c_{N}\right\}$ from a corpus authored by diverse cre-ators, including bloggers, journalists, encyclopedists,and government entities. The retrieved documents are then passed to an LLM to generate a natural language response $r=\text {grt}(C,q)$ composed of a sequence of sentences $\left\{l_{s}\right\}_{s=1}^{m}.$ .Each sentence $l_{s}$ is linked to one or more evidence citations referencing sources $C_{t}\subseteq C,1\leq\left|C_{t}\right|\leq N.$ 

Our goal is to improve the visibility of a target content item $c_{i}\in C$ within the final response $r$  through content-level optimization. We adopt the visibility evaluation settings and metrics proposed in GEO-bench and further extend them to broader scenarios. Crucially, we consider a black-box setting where the query $b$  is hidden from content creators, posing a fundamental challenge for G-SEO. To address this, we pro-pose the RAID-GEO method, an intent-driven framework that infers the likely user intent from the creator's perspec-tive and guides content rewriting accordingly, thus increas-ing the likelihood that the content will be selected or cited in GSE-generated outputs.

### Intent-Driven Four-Phase Optimization

Given the early-stage nature of G-SEO and the absence of a well-established paradigm, we draw critical inspiration from traditional SEO strategies to address this gap. Although conventional approaches, such as those based on keyword tuning or webpage structure modifications (Kowalczyk and Szandala 2024; Samarah et al. 2024; Nagpal and Petersen 2021), are not directly applicable to the semantics-driven generation process inherent to GSE, their underlying princi-ple remains valuable: anticipate search intent and tailor con-tent expression accordingly. Building on this insight, we in-troduce search intent as a semantic intermediary that bridges latent user needs and optimized content. In our framework,

<!-- Summarization Original WHO will search? Content Initial Intent WHAT do they need? LLM Refined Intent WHY the mismatches? Optimized HOW to generalize? Content Optimization Steps Reflective refinement -->
![](https://web-api.textin.com/ocr_image/external/8d20720a52b65af1.jpg)

Figure 2: Overview of the Role-Augmented Intent-Driven G-SEO method. The method leverages search intent to guide the optimization process and further integrates reflection-based modeling from multiple roles to enhance generaliz-ability to diverse user needs in complex GSE scenarios.

search intent is defined as the underlying informational mo-tivation or objective implicitly embedded within a user's query. It serves as the semantic anchor guiding the trajectory and strategy of content optimization. Recent advances in prompt engineering have enabled LLMs to make significant progress in intent understanding (Sun et al. 2024; Kim et al. 2024; Mao et al. 2023; Wang et al. 2021). To operational-ize these advances in the context of G-SEO, we propose a novel framework: Role-Augmented Intent-Driven Genera-tive Search Engine Optimization (RAID G-SEO) which im-plements a four-stage optimization pipeline driven by in-ferred search intent. The core stages are outlined below:

·Step 1: Content Summarization. We employ an LLM to conduct a semantically-focused summarization of the tar-get content, using a constrained summarization prompt to suppress stylistic redundancy and semantic noise. This step enables the model to distill the content's core in-formational focus as intended by the creator. As demon-strated in our ablation study, this summarization substan-tially improves the effectiveness of the downstream in-tent inference process.

·Step 2: Intent Inference and Refinement. We adopt a two-stage modeling approach to infer search intent. First, the LLM generates an initial intent representation based on the original content and its summary. However, this ini-tial form often reflects the creator's subjective projec-tion of user interest, which may not generalize across user populations. To address this, we introduce a 4W multi-role deep reflection module, which enhances the initial intent via structured introspection from multiple user-role perspectives. Drawing inspiration from socio-logical decision frameworks, this module performs role-augmented, structured reasoning over four axes (Who, What,Why,How), guiding the model to reanalyze and


| Method | Objective Impression(PAWC) | Objective Impression(PAWC) | Objective Impression(PAWC) | Subjective Impression | Subjective Impression | Subjective Impression | Subjective Impression | Subjective Impression | Subjective Impression | Subjective Impression | Subjective Impression |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Method | Word Count  | Posi. Count |  Over. | Rele. |  Infl. | Uniq. |  Dive. |  Clic. |  Sub.Posi. |  Sub.Volu. |  Aver. |
| Tran. SEO | 1.50 | 1.74 | 2.28 | -0.47 | -0.60 | -1.11 | 0.59 | 0.73 | 0.30 | 1.22 | 0.11 |
| Uniq. Word | -0.53 | 1.26 | 1.40 | -1.30 | -2.49 | -1.61 | 0.32 | -1.65 | -1.94 | -1.48 | -1.35 |
| Simp.Expr. | 0.30 | 1.35 | 1.94 | -0.55 | -1.32 | -1.39 | 0.38 | 1.00 | -1.98 | 1.18 | -0.43 |
| Auth.Expr. | -0.54 | 0.52 | 0.75 | -0.05 | -1.02 | 5.38 | 0.36 | 1.36 | 1.48 | 0.64 | 0.88 |
| Flue.Expr. | 1.09 | 1.27 | 2.53 | -0.22 | -1.09 | 2.88 | -0.15 | 0.78 | 0.14 | -0.18 | 0.15 |
| Term.Addi. | 5.96 | 7.12 | 8.07 | 2.11 | 2.33 | 10.25 | 1.96 | 5.22 | 2.74 | 3.62 | 3.63 |
| Repu. Addi. | 0.13 | 1.09 | 1.85 | -0.61 | -0.80 | 0.31 | 0.69 | -0.28 | -0.10 | 1.44 | 0.05 |
| Quot. Addi. | 3.76 | 5.40 | 5.33 | 1.87 | 0.91 | 4.38 | 1.63 | 1.22 | 0.84 | 3.65 | 1.97 |
| Stat. Addi. | 4.35 | 6.37 | 7.03 | 1.81 | 1.58 | 9.63 | 1.61 | 4.93 | 1.97 | 3.58 | 3.27 |
| RAID G-SEO | 7.81 | 8.14 | 8.49 | 2.24 | 2.29 | 15.93 | 2.01 | 4.77 | 6.16 | 5.09 | 4.72 |


Table 1: Objective and subjective performances of G-SEO methods on the expanded GEO-bench. Results for the proposed RAID G-SEO are shown in bold, and the best-performing baseline for each metric is underlined. As both Objective impression Improvement and Subjective Impression Improvement consist of multiple sub-metrics, we report the overall score of the former and the average score of the latter as the main comparative indicators, following the original GEO-bench evaluation protocol to ensure fair and consistent comparison across methods.

refine the search intent toward broader user alignment. Details of this module are provided in the next section.

·Step 3: Step Planning. To minimize semantic drift dur-ing content rewriting, we prompt the model with the re-fined intent and instruct it to generate a sequence of ex-plicit and interpretable optimization steps. This prompt-based planning decomposes the semantic intent into ac-tionable revision strategies, enabling controllability and ensuring that subsequent edits preserve the intended se-mantic core.

·Step 4: Content Rewriting. Following the planned steps, the model conducts intent-aligned rewriting to improve both semantic alignment and retrieval effectiveness.By enforcing consistency with the inferred intent and adher-ing to the step plan, the rewritten content achieves higher relevance and compatibility with potential user queries, especially under black-box GSE settings where query visibility is unavailable.

Our RAID G-SEO framework is specifically designed to address the query-invisible nature of black-box GSE sys-tems. By modeling latent user intent as a mediating signal and optimizing content from the creator's perspective, our method provides a principled and structured optimization path. This approach effectively mitigates semantic misalign-ment between content expression and user retrieval motiva-tions, thereby improving the adaptability and visibility of content across diverse GSE scenarios.

### 4W Multi-Role Deep Reflection

To address the heterogeneity of user groups in diverse re-trieval scenarios, it is essential to enhance the generaliz-ability of search intent representation, enabling it to cover a broader spectrum of potential information needs. In the black-box setting of G-SEO, where creators lack direct ac-cess to user queries, we introduce a LLM-driven reflec-tion mechanism to expand the semantic boundaries of the initially inferred intent. Reflection strategies have demon-strated efficacy in improving LLM performance across a va-riety of tasks (Shinn et al. 2023; Ji et al. 2023), especially in multi-perspective reflection paradigms (Zhang et al. 2024; Yan et al. 2024). These studies highlight LLMs' capacity to simulate diverse cognitive roles and to construct alternative reasoning trajectories. However, most existing approaches rely on intuition-driven human-like reflection, lackingfor-mal cognitive structure and scientific grounding.As such, they fall short in achieving the dual objective of semantic consistency and expressive breadth, both of which are es-sential for robust intent generalization in complex tasks.

To overcome these limitations, we draw inspiration from sociological theories of problem framing and decision-making (Ward 2017; Škériené and Jucevičiené 2020). Specifically, we tailor this perspective to the G-SEO context by incorporating WH-analysis principles,which guide the model in decomposing and refining search intent from four critical dimensions: Who, What, Why, and How. In particu-lar, the Who offers a multi-perspective lens, while interme-diate outputs of the What and Why serve as constraints and guidance signals in the semantic reconstruction process of the How. This promotes intent representations that are both aligned and diversified. This forms the foundation of our multi-role reflective framework, enabling LLMs to reinter-pret the initial intent through augmented user-role reasoning. The 4W framework operates as follows:

·Who is likely to retrieve this content? To balance gener-alization and precision, we prompt the LLM to infer a set of representative user roles most likely to search for the content (e.g.,technical professionals, general readers, or decision-makers), based on the initial intent.

·What are their retrieval needs? For each inferred user role, the model conditions intent generation on their do-main background and knowledge profile, producing can-didate motivations and search goals. By embedding role-specific constraints, uncontrolled semantic drift is limited to ensure higher factual alignment between generated in-tent and plausible needs.

·Why does the initial intent misalign with their needs? The model is tasked with identifying semantic gaps be-tween the original intent and each role-specific need, fol-lowed by an explanation of the misalignment causes. This step enables targeted and directed generalization, rather than generic expansion.

·How should the initial intent be generalized? Leveraging the structured reflection outputs from the prior steps, we instruct the model via prompt-based reasoning to seman-tically reconstruct the initial intent. The refined version preserves the core informational focus while expanding its scope and adaptability across user contexts.

Importantly, the entire reflection process is fully automated via prompt-based reasoning, requiring no human annotation or intervention, which ensures scalability across GSE set-tings. Through the 4W multi-role deep reflection module,we derive intent representations that maintain semantic coher-ence while effectively generalizing to diverse retrieval sce-narios. The enhanced intent serves as a robust foundation for downstream G-SEO optimization, allowing the final content to achieve higher alignment with latent user queries.

All prompts employed in the Methodology Section are structurally designed and documented in Appendix A.

## Experiments

## Experimental Setup

To ensure reproducibility and fairness, full generation con-figurations (e.g., sampling strategy, temperature, top-p) are included in Appendix D.

**GSE** **Simulation** Following GEO (Aggarwal et al. 2024), we simulate the GSE task as a single-turn response gener-ation scenario, where each query has access to five content sources. We use the open-source GLM-4-9B-0414 model, which exhibits a low hallucination rate according to the Hal-lucination Leaderboard (Hughes, Bae, and Li 2023). To en-sure consistency and minimize statistical bias, we adopt the same prompting and sampling configurations used for an-swer generation as in prior work.

**Dataset** To better model diverse retrieval scenarios, we ex-tend GEO-bench (Aggarwal et al. 2024), a benchmark com-prising real-world queries from production systems (e.g., Bing,Google, Perplexity), complex reasoning tasks,and LLM-generated questions. To enhance query diversity,we use GPT-4 to generate four semantically related variants for each original query, forming evaluation samples with five related queries and their corresponding five content sources. We randomly select 100 such samples for evaluation (seed= 42).

<!-- 320 300 280 260 240 220 200 Tran.SEO Uniq.Word Simp.Expr. Auth.Expr. Flue.Expr. Term.Addi. Repu.Addi. Quot.Addi. Stat. Addi. RAID G-SEO -->
![](https://web-api.textin.com/ocr_image/external/250d40c3e558100c.jpg)

Figure 3: Adaptability of G-SEO methods across diverse GSE retrieval scenarios. We evaluate each method's adapt-ability by counting the number of optimized content in-stances that yield observable improvements in subjective visibility across multiple retrieval tasks. This reflects the generalization capacity and real-world utility of each ap-proach.

**Baselines** We adopt al1 nine optimization methods from GEO (Aggarwal et al. 2024) as comparison baselines, grouped into three categories:

·Lexical strategies: Traditional SEO and distinctive word optimization, which enhance visibility through keyword insertion and rare lexical choices.

·Expression enhancements: Authority-, fluency-, and simplification-based methods that improve content cred-ibility,clarity,and readability.

·Content enrichment: Terminology-, reputation-, quotation-, and statistics-based methods that incorporate factual or semi-factual elements (e.g., domain-specific terms,reputable sources, quotations, and quantitative evidence) while remaining contextually plausible.

All baselines and our proposed intent-driven method are im-plemented using GLM-4-9B and evaluated under identical conditions.

**Evaluation** **Metrics** We evaluate G-SEO methods us-ing both objective and subjective metrics defined in GEO-bench (Aggarwal et al. 2024), focusing on impression-based improvements before and after optimization. For objec-tive evaluation, we adopt Position-Adjusted Word Count (PAWC), which assigns greater weight to cited content ap-pearing earlier and more frequently. Subjective evaluation follows the Subjective Impression metric, encompassing seven subjective dimensions: relevance,fluency,diversity, uniqueness,click likelihood, subjective positional promi-nence,and subjective content volume. GEO originally em-ployed G-Eval (Liu et al. 2023) to simulate human judg-ment, but its prompts lacked consistent granularity and clear criteria. To improve scoring reliability, we adopt a prompt-generate-prompt strategy: each dimension is rated on a 0


| Method | Subjective<br>Impression(Aver.) |
| --- | --- |
| Simple G-SEO(w/o Step) | 1.54 |
| Simple G-SEO (/w Step) | 3.76 |
| ID G-SEO (w/o summ.) | -3.18 |
| ID G-SEO(w/summ.) | 2.96 |
| RAID G-SEO | 4.72 |


Table 2: Ablation settings and results of RAID G-SEO. To evaluate the structural role of search intent modeling in the RAID G-SEO framework, we design two ablation vari-ants: (1) Simple G-SEO, which removes the intent reasoning phase and performs optimization directly based on the orig-inal content; (2) ID G-SEO, which retains the initial intent modeling phase but removes the 4W multi-role deep reflec-tion module, relying only on initial intent. RAID G-SEO and both ablated variants are evaluated under identical settings and task conditions.

(absent) to 5 (optimal) scale, with prompts generated by GPT-4o and responses evaluated using GLM-4-9B. We pro-vide the prompt-generation prompt andd a unified template in Appendix C. To quantify relative improvement, we normal-ize visibility scores. For each citation $C_{i}$ ,the improvement from the original response $r$  to the optimized response $r^{\prime }$  is computed as:

$$_{C_{i}}=\frac {impr_{C_{i}}\left(r^{\prime }\right)-impr_{C_{i}}(r)}{impr_{C_{i}}(r)+1}\times 100$$

Additional evaluation details are available in Appendix D.

## Results and Analysis

**Main** **Result** We conducted a comprehensive evaluation of RAID G-SEO against nine representative optimization baselines from GEO (Aggarwal et al. 2024), as summa-rized in Table 1. RAID G-SEO achieved the highest per-formance across both primary evaluation dimensions, with an improvement of +0.42 in Objective Impression (Overall) and +1.09 in Subjective Impression (Average), significantly surpassing the second-best method (terminology-based). Al-though RAID G-SEO showed slightly lower scores on some subjective sub-dimensions (e.g.,influence and click-follow likelihood), it consistently led in aggregate subjective met-rics, demonstrating its strong ability to enhance overall per-ceived quality. These results highlight a notable shift in op-timization strategies between traditional SEO and G-SEO tasks from the perspective of user perception: rather than optimizing local indicators (e.g., keyword density or cita-tion authority), GSE frameworks tend to prioritize global impression quality as perceived by LLM. Notably, the tradi-tional SEO baseline performed poorly under this evaluation with only +2.28 in objective and +0.11 in subjective gains, ranking sixth on average, highlighting limited adaptabil-ity in GSE contexts. Furthermore, terminology-based and statistics-based methods achieved second and third respec-tively,significantly outperforming authority-and reputation-based strategies. This trend indicates a latent preference of

<!-- 31% 38% 3% 22% 6% -->
![](https://web-api.textin.com/ocr_image/external/afc9f5e0dfc927d9.jpg)

Knowledge Producers and Researcher

Health and Care Stakeholders

Economic Activity participants

Cultural and Creative Professionals

Civic Everyday Actors

Figure 4: Distribution of RAID G-SEO across multi-role perspectives. We perform semantic clustering on the user role descriptions generated by the 4W multi-role deep re-flection module to characterize the types of cognitive per-spectives involved during intent generalization. The results illustrate the relative frequency of each role category, reflect-ing the model's response pattern to perspective distribution during optimization.

LLMs for content with strong perceived expertise over exter-nally validated authority.We hypothesize that this behavior may arise from distributional priors in pretraining corpora, offering insights for future research on model alignment and retrieval-centric knowledge calibration.

**Adaptability** **Analysis** To evaluate the adaptability of dif-ferent methods in diverse GSE scenarios, we adopt Subjec-tive Impression Improvement (Average) as the core eval-uation metric. A total of 500 retrieval tasks are sampled to assess each method's effectiveness in integrating multi-source information and generating coherent answers, as illustrated in Figure 4. The results show that RAID G-SEO achieves an effective optimization rate of 62.8%, out-performing the second-best terminology-based optimization method (55.8%) by 7.0 percentage points, demonstrating stronger generalization ability and robustness in diverse re-trieval settings. Notably, none of the evaluated methods ex-ceed the 70% effectiveness threshold, underscoring the chal-lenges of achieving stable content optimization in the GSE environment. This suggests that robust adaptation in such scenarios remains an open and valuable research direction.

**Ablation** **Study** We conduct an ablation study by pro-gressively incorporating different prompt-based reasoning modules into the RAID G-SEO framework. Subjective Im-pression Improvement (Average) is adopted as the primary evaluation metric to assess the contribution of each com-ponent to the content optimization task. As shown in Ta-ble 2, the overall optimization performance of RAID G-SEO consistently improves with the addition of reason-

<!-- Target Distribution 3%、 2% 15% Content Quality Credibility and Authority User-Centric Presentation SEO Strategies 80% -->
![](https://web-api.textin.com/ocr_image/external/1c082e6824a3c93a.jpg)

(a)

<!-- Action Distribution 7% 24% Content restructure 16% Content Enrichment and Expansion Stylistic and Linguistic Refinement Linking and Metadata 19% Addition Interactive 34% Participation Calling -->
![](https://web-api.textin.com/ocr_image/external/66ea7df6b4f169f4.jpg)

(b)

Figure 5: Distribution of optimization step preferences in RAID G-SEO. Each generated optimization step is structurally parsed to identify its corresponding optimization objective and operational strategy type, followed by semantic clustering. Subfigure (a) shows the distribution across intent-aligned target dimensions (e.g., enhancing content completeness, improving factual credibility, increasing clarity), indicating where the intent prioritizes refinement. Subfigure (b) presents the distribution over strategy categories (e.g., content restructuring, elaboration, redundancy reduction), capturing the model's typical operational behavior under intent-driven guidance.

ing stages, demonstrating the effectiveness of our proposed intent-driven four-phase optimization framework and the ac-companying 4W multi-role deep reflection module.Notably, ID G-SEO (without summarization) is the only variant that yields a negative score. We hypothesize that inferring the initial intent directly from raw, unsummarized content intro-duces noise and redundancy, thereby degrading the perfor-mance of the downstream optimization module.In contrast, Simple G-SEO (with step planning), despite lacking explicit user intent modeling, outperforms both ID G-SEO variants. This suggests that the optimization step planning module may implicitly capture latent user needs and align more ef-fectively with user search intents. These findings provide meaningful guidance for enhancing the precision and robust-ness of intent modeling in future work.

**Preference** **Analysis** Role Perspective Preference Distri-bution. In the 4W multi-role deep reflection module of RAID G-SEO, we generate diverse user role perspectives based on the content creator's preliminary assumptions about user search intents, leveraging prompt-based LLM. A total of 8,030 role instances spanning 219 distinct role types were collected and subjected to semantic clustering, with the dis-tribution visualized in Figure 4. The analysis reveals that RAID G-SEO predominantly favors two cognitive perspec-tives: Knowledge Producers and Researchers (e.g., Educa-tor,Policy Maker) and Civic Everyday Actors (e.g., Home Cook,DIY Hobbyist), which together account for over two-thirds of the role instances. In contrast,Health and Care Stakeholders and Cultural and Creative Professionals rep-resent only 6% and 3% of the total, respectively, often cor-responding to more specialized or context-dependent view-points, while Economic Activity Participants fall in the mid-range. This distribution suggests a tendency of the model to prioritize generalizable, publicly oriented perspectives dur-ing intent generalization. These findings provide empiri-cal support for the role modeling mechanism in facilitat-ing broader intent coverage. Optimization Steps Preference Distribution. To analyze how search intent informs down-stream optimization behaviors, we perform structured se-mantic parsing of all optimization steps generated during the Step Planning phase of RAID G-SEO. Each step is anno-tated with its corresponding optimization objective and op-eration type, followed by semantic clustering, as illustrated in Figure 5. The results indicate that over 80% of the op-timization steps explicitly target content quality enhance-ment,covering objectives such as improving completeness and clarity. In terms of operational strategies,Content En-richment and Expansion accounts for more than 30% of all actions, suggesting that the model,when guided by intent, tends to prioritize enriching informational content as a pri-mary optimization strategy. Overall, RAID G-SEO exhibits a multi-dimensional hybrid planning approach that better ac-commodates the complexity of GSE tasks, where the empiri-cal improvements observed further validate the effectiveness of intent-guided optimization.

## Conclusion

This work addresses the task of generative search engine optimization under diverse retrieval scenarios, and intro-duces an intent-generalization-enhanced optimization ap-proach. We design an intent-driven four-phase optimization framework, and incorporate a 4W multi-role deep reflec-tion mechanism to improve the generalizability of the in-ferred intent, enabling creators to perform adaptive and tar-geted content optimization even in the absence of explicit user queries. To support more comprehensive and objective evaluation,we extend GEO-bench to cover a broader range of retrieval scenarios, and develop G-eval 2.0, a fine-grained subjective evaluation framework for assessing content visi-bility. Experimental results demonstrate that intent modeling plays a pivotal role in G-SEO, with generalized intent rep-resentations contributing significantly to optimization effec-tiveness.Nevertheless, balancing the precision and general-izability ofintent representations remains a key open chal-lenge.

**Limitations** While our results demonstrate that incorpo-rating search intent provides more focused guidance for op-timization in G-SEO tasks, we observe that overly specific intents may lead to content rewrites that overfit to particular queries, thereby reducing generalizability. This observation underscores a central challenge in targeted G-SEO: balanc-ing the precision of intent modeling with the adaptability of optimization strategies. Our approach relies primarily on prompt engineering for preliminary intent extraction, which remains limited in granularity control and contextual consis-tency. Future work may explore integrating domain-specific knowledge or developing dedicated intent modeling mod-ules to improve the effectiveness of G-SEO methods. Fur-thermore, our proposed method, like most existing G-SEO approaches, focuses solely on plain text without account-ing for visual or multimodal elements such as images, dia-grams, or tables that may influence content visibility in real-world GSEs. Extending G-SEO to Visual-Language Models (VLMs) for unified multimodal optimization poses an im-portant avenue for future research.

**Ethical** **Statement** We strictly adhere to the ethical stan-dards and best practices of the AI research community. We employ LLMs in full compliance with their licensing terms. Our study focuses on improving content visibility within GSEs. All experiments are conducted in simulated environ-ments without interfering with, misleading, or manipulating the behavior of any real-world systems. To support evalua-tion, we extend the GEO benchmark by generating synthetic text data using the LLM and applying targeted optimiza-tions. All generated or modified content is intended solely for research and experimentation. The resulting data does not reflect factual information and should not be interpreted as expressing any subjective opinions or value judgments of the authors or the underlying models.

## References

Aggarwal, P.; Murahari, V.; Rajpuurohit, T.; Kalyan, A.; Narasimhan, K.; and Deshpande, A. 2024. Geo: Genera-tive engine optimization. In Proceedings of the 30th ACM SIGKDD Conference on Knowledge Discovery and Data Mining, KDD '24,5-16. New York, NY, USA: Association for Computing Machinery. ISBN 9798400704901.

Almukhtar, F.; Mahmoodd, N.; and Kareem, S. 2021. Search engine optimization: a review. Applied computer science, 17(1):70-80.

Bardas, N.; Mordo, T.; Kurland, O.; Tennenholtz, M.; and Zur, G.2025. White Hat Search Engine Optimization using Large Language Models. arXiv:2502.07315.

Chodak,G.; and Błażyczek,K. 2024. Large language mod-els for search engine optimization in e-commerce. In Garg, D.; Rodrigues, J. J. P.C.; Gupta, S.K.; Cheng, X.;Sarao, P.;and Patel, G. S., eds., International Advanced Comput-ing Conference, 2023, 333-344. Springer, Cham: Springer Nature Switzerland. ISBN 978-3-031-56700-1.

Chong, R.; Kong, C.; Wu, L.; Liu, Z.; Jin, Z.; Yang, L.;Fan, Y.;Fan, H.; and Yang, E. 2023. Leveraging prefix transfer for multi-intent text revision. In Rogers, A.; Boyd-Graber, J.; and Okazaki, N., eds., Proceedings of the 61st Annual Meeting of the Association for Computational Linguistics (Volume 2: Short Papers), 1219-1228. Toronto, Canada: As-sociation for Computational Linguistics.

Greshake, K.; Abdelnabi, S.; Mishra, S.; Endres, C.;Holz, T.; and Fritz, M. 2023. Not what you've signed up for: Com-promising real-world llm-integrated applications with indi-rect prompt injection. In Proceedings of the 16th ACM work-shop on artificial intelligence and security, AISec'23,79-90.New York, NY, USA: Association for Computing Ma-chinery. ISBN 9798400702600.

Hughes,S.; Bae,M.; and Li, M. 2023. Vectara Hallucina-tion Leaderboard. https://github.com/vectara/hallucination-leaderboard. Accessed: 2025-07-16.

Ji,Z.; Yu, T.; Xu,Y.;Lee, N.;Ishii,E.;and Fung, P.2023. Towards Mitigating LLM Hallucination via Self Reflection. In Bouamor, H.; Pino, J.; and Bali, K.,eds.,Findings of the Association for Computational Linguistics: EMNLP 2023, 1827-1843.Singapore: Association for Computational Lin-guistics.

Kanara, A. P.; Kumari, P.; and Prathap, B. R. 2024.Python Driven Keyword Analysis for SEO Optimization. In 202410th International Conference on Advanced Computing and Communication Systems (ICACCS), volume 1,1170-1176. IEEE.

Kim, J.; Kim, D.-K.; Logeswaran, L.; Sohn, S.; and Lee, H. 2024. Auto-Intent: Automated Intent Discovery and Self-Exploration for Large Language Model Web Agents. In Al-Onaizan, Y.; Bansal, M.; and Chen, Y.-N.,eds., Findings of the Association for Computational Linguistics: EMNLP 2024,16531-16541. Miami, Florida, USA: Association for Computational Linguistics.

Kowalczyk, K.; and Szandala, T. 2024. Enhancing SEO in single-page web applications in contrast with multi-page ap-plications. IEEE Access, 12:11597-11614.

Kumar, A.; and Lakkaraju, H. 2024. Manipulating Large Language Models to Increase Product Visibility. arXiv:2404.07981.

Lewandowski, D. 2023. Understanding search engines. Springer.

Li, C.; Zhang, M.; Mei, Q.; Kong, W.; and Bendersky, M. 2024.Learning to rewrite prompts for personalized text gen-eration. In Proceedings of the ACM Web Conference 2024, WWW '24,3367-3378.New York, NY, USA: Association for Computing Machinery. ISBN 9798400701719.

Li,Y.; Luo, M.;Gong, Y.; Lin, C.; Jiao, J.;Liu,Y.;and Huang, K. 2025. DeepThink: Aligning Language Models with Domain-Specific User Intents. arXiv:2502.05497.

Liu, Y.; Iter, D.; Xu, Y.; Wang, S.; Xu, R.; and Zhu, C. 2023. G-Eval: NLG Evaluation using Gpt-4 with Better Human Alignment. In Bouamor, H.; Pino, J.; and Bali, K., eds., Pro-ceedings of the 2023 Conference on Empirical Methods in Natural Language Processing, 2511-2522. Singapore: As-sociation for Computational Linguistics.

Mao, K.; Dou, Z.; Mo, F.; Hou,J.;Chen, H.; and Qian, H. 2023. Large Language Models Know Your Contex-tual Search Intent: A Prompting Framework for Conversa-tional Search. In Bouamor, H.; Pino, J.; and Bali, K.,eds., Findings of the Association for Computational Linguistics: EMNLP 2023, 1211-1225. Singapore: Association for Com-putational Linguistics.

Nagpal, M.; and Petersen, J. A. 2021. Keyword Selection Strategies in Search Engine Optimization: How Relevant is Relevance? Journal of Retailing, 97(4): 746-763. SI: Met-rics and Analytics.

Pfrommer, S.; Bai, Y.; Gautam, T.; and Sojoudi, S. 2024. Ranking Manipulation for Conversational Search Engines. In Al-Onaizan, Y.; Bansal, M.; and Chen, Y.-N.,eds.,Pro-ceedings of the 2024 Conference on Empirical Methods in Natural Language Processing, 9523-9552. Miami,Florida, USA: Association for Computational Linguistics.

Samarah, T.; Alrawashdeh, T.; Mughaid,A.; and AlZu'Bi, S.2024. Utilizing LLMs for Enhancing Search Engine Op-timization Strategies in Digital Marketing. In 2024 2nd In-ternational Conference on Foundation and Large Language Models(FLLM),284-288.IEEE.

Sarkar, R.; Sarrafzadeh, B.; Chandrasekaran, N.; Ran-gan, N.; Resnik, P.; Yang, L.; and Jauhar, S. K. 2025. Conversational User-AI Intervention: A Study on Prompt Rewriting for Improved LLM Response Generation. arXiv:2503.16789.

Shahzad, A.; Jacob, D. W.; Nawi, N. M.; Mahdin, H.;and Saputri, M. E. 2020. The new trend for search engine op-timization, tools and techniques. Indonesian Journal of Electrical Engineering and Computer Science, 18(3): 1568-1583.

Shi, J.; Yuan, Z.; Liu, Y.; Huang, Y.; Zhou,P.; Sun,L.;and Gong, N. Z. 2024. Optimization-based prompt injection at-tack to llm-as-a-judge. In Proceedings of the 2024 on ACM SIGSAC Conference on Computer and Communications Se-curity, CCS '24, 660-674. New York, NY, USA: Associa-tion for Computing Machinery. ISBN 9798400706363.

Shinn, N.; Cassano, F.; Gopinath, A.; Narasimhan, K.; and Yao,S.2023. Reflexion: language agents with verbal re-inforcement learning. In Oh, A.; Naumann,T.;Globerson, A.; Saenko, K.; Hardt, M.; and Levine, S.,eds.,Advances in Neural Information Processing Systems 36, NIPS 2023, volume 36, 8634-8652.Curran Associates,Inc.

Shu, L.; Luo,L.; Hoskere, J.; Zhu, Y.; Liu, Y.;Tong,S.; Chen, J.; and Meng, L. 2024. RewriteLM: An Instruction-Tuned Large Language Model for Text Rewriting. In Pro-ceedings of the AAAI Conference on Artificial Intelligence, 2024,volume 38,18970-18980.AAAI Press.

Sun, Z.; Liu, H.; Qu,X.;Feng,K.; Wang, Y.;and Ong, Y. S. 2024. Large Language Models for Intent-Driven Ses-sion Recommendations. In Proceedings of the 47th In-ternational ACM SIGIR Conference on Research and De-velopment in Information Retrieval, SIGIR '24, 324-334. New York,NY, USA: Association for Computing Machin-ery. ISBN 9798400704314.

Wang,X.;Huang,T.;Wang, D.; Yuan, Y.; Liu, Z.;He,X.; and Chua, T.-S. 2021. Learning Intents behind Interactions with Knowledge Graph for Recommendation. In Proceed-ings of the Web Conference 2021, WWW '21,878-887. New York, NY,USA: Association for Computing Machin-ery. ISBN 9781450383127.

Ward,V.2017. Why, whose, what and how? A framework for knowledge mobilisers. Evidence and Policy, 13(3):477-497.

Yan,H.; Zhu, Q.; Wang, X.; Gui, L.; and He, Y. 2024. Mirror: Multiple-perspective Self-Reflection Method for Knowledge-rich Reasoning. In Ku, L.-W.; Martins, A.;and Srikumar,V.,eds.,Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers), 7086-7103.Bangkok, Thailand: Association for Computational Linguistics.

Zhang,W.; Shen, Y.; Wu,L.; Peng, Q.;Wang,J.;Zhuang,Y.; and Lu, W. 2024. Self-Contrast: Better Reflection Through Inconsistent Solving Perspectives. In Ku, L.-W.; Martins, A.; and Srikumar, V., eds., Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers), 3602-3622. Bangkok, Thailand: Association for Computational Linguistics.

Škèriené, S.; and Jucevičiené, P. 2020. Problem solving through values: A challenge for thinking and capability de-velopment. Thinking Skills and Creativity, 37:100694.


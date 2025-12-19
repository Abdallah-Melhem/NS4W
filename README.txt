Explainable Machine Learning System with Medical Chatbot for Genetic Disease Prediction and Diagnostic Recommendation

---

## *Problem Description*

Genetic diseases result from complex interactions between hereditary, biological, and prenatal factors. Accurate and early identification requires analyzing multiple clinical indicators with different levels of importance. This project presents an *integrated machine learning system combined with an intelligent medical chatbot* to assist in genetic disease screening, disease classification, and diagnostic guidance.

The system uses *ranked and weighted clinical and genetic features* to make predictions and provides *interactive explanations and recommendations* through a chatbot interface, improving accessibility and user understanding.

---

## *Objective*

The goal is to develop a *multi-output supervised machine learning model* with an embedded *medical chatbot* that:

1. Predicts whether an individual has a genetic disease.
2. Identifies the *type of genetic disease* if present.
3. Recommends the *best medical examination* for diagnosis or confirmation.
4. Allows users to interact with the system through a chatbot that explains results and answers medical-related questions.

---

## *Ranked Input Features (By Importance)*

The model relies on features ranked using feature-importance techniques (e.g., SHAP values). Each feature is assigned a *weight* reflecting its contribution to the predictions.

| Rank | Feature                          | Description                        | Weight    |
| ---: | -------------------------------- | ---------------------------------- | --------- |
|    1 | Blood Cell Count (per µL)        | Total blood cell concentration     | *10.10* |
|    2 | White Blood Cell Count (×10³/µL) | Immune response indicator          | *9.25*  |
|    3 | Mother’s Age                     | Maternal age at conception         | *8.80*  |
|    4 | Father’s Age                     | Paternal age at conception         | *8.10*  |
|    5 | Patient Age                      | Current age of the patient         | *7.60*  |
|    6 | Genes in Mother’s Side           | Maternal genetic inheritance       | *5.17*  |
|    7 | Inherited From Father            | Paternal genetic inheritance       | *4.80*  |
|    8 | Number of Previous Abortions     | Maternal reproductive history      | *4.24*  |
|    9 | Harmful Substance Abuse          | Exposure to harmful substances     | *3.96*  |
|   10 | Birth Asphyxia                   | Oxygen deprivation at birth        | *3.92*  |
|   11 | Paternal Gene Presence           | Identified paternal gene mutations | *3.54*  |

---

## *Outputs*
 *Mitochondrial Genetic Inheritance Disorders
 -Leigh syndrome

 -Mitochondrial myopathy

 -Leber's hereditary optic neuropathy (LHON)

*Single-Gene Inheritance Diseases
 -Cystic fibrosis

 -Tay-Sachs disease

 -Hemochromatosis

* Multifactorial Genetic Inheritance Disorders
 -Diabetes

 -Alzheimer’s disease

 -Cancer

---

## *Chatbot Component*

The system includes an *AI-powered medical chatbot* that serves as an interactive interface between the user and the model. The chatbot:

* Collects patient information in a user-friendly manner
* Explains prediction results in simple, understandable language
* Highlights which features most influenced the decision (based on feature weights)
* Suggests next medical steps and recommended examinations
* Answers general questions related to genetic diseases (non-diagnostic advice)

This chatbot improves *usability, transparency, and trust*, especially for non-expert users.

---

## *Machine Learning Approach*

* *Learning Type:* Multi-output supervised learning
* *Model Characteristics:* Explainable and feature-weighted
* *Integration:* Machine learning predictions + chatbot interaction

---

## *Evaluation Metrics*

* Disease Detection: Accuracy, Precision, Recall, F1-score, ROC-AUC
* Disease Type Classification: Macro F1-score
* Examination Recommendation: Top-1 / Top-3 accuracy
* Chatbot Quality: User satisfaction and response clarity

---

## *Impact*

This integrated system supports early genetic disease screening, improves patient understanding through conversational explanations, and assists healthcare professionals in selecting appropriate diagnostic examinations.